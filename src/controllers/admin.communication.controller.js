const crypto = require('crypto');
const { query, getClient } = require('../config/database');
const { success, error, notFound } = require('../utils/response');
const {
  interpolate,
  sendWhatsApp,
  sendBulkEmail,
} = require('../services/bulkCommunication.service');

const normalizeType = (value) => String(value || '').toLowerCase();
const normalizeDestination = (type, value) => {
  const raw = String(value || '').trim();
  if (type === 'whatsapp') return raw.replace(/[^\d+]/g, '');
  return raw.toLowerCase();
};

const isValidDestination = (type, value) => {
  if (type === 'whatsapp') return /^\+?[1-9]\d{9,14}$/.test(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const makeEmailHtml = (body) => {
  const escaped = String(body || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">${escaped}</body></html>`;
};

const getCampaigns = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.campaign_name, c.type, c.subject, c.total_imported,
              c.valid_count, c.invalid_count, c.sent_count, c.failed_count,
              c.pending_count, c.duplicate_count, c.status, c.provider,
              c.created_at, c.completed_at, a.name AS created_by_name
       FROM bulk_campaigns c
       LEFT JOIN admins a ON a.id::text = c.created_by
       ORDER BY c.created_at DESC
       LIMIT 50`
    );

    return success(res, { campaigns: result.rows });
  } catch (err) {
    console.error('getCampaigns error:', err);
    return error(res, 'Failed to fetch communication campaigns');
  }
};

const getCampaignReport = async (req, res) => {
  try {
    const campaign = await query(
      `SELECT c.*, a.name AS created_by_name
       FROM bulk_campaigns c
       LEFT JOIN admins a ON a.id::text = c.created_by
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!campaign.rows.length) return notFound(res, 'Campaign not found');

    const recipients = await query(
      `SELECT id, name, destination, variable_1, variable_2, remarks,
              status, reason, provider_message_id, created_at, sent_at
       FROM bulk_campaign_recipients
       WHERE campaign_id = $1
       ORDER BY id ASC`,
      [req.params.id]
    );

    return success(res, { campaign: campaign.rows[0], recipients: recipients.rows });
  } catch (err) {
    console.error('getCampaignReport error:', err);
    return error(res, 'Failed to fetch campaign report');
  }
};

const sendCampaign = async (req, res) => {
  const client = await getClient();
  try {
    const type = normalizeType(req.body.type);
    const campaignName = String(req.body.campaign_name || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message_content || '').trim();
    const recipientsInput = Array.isArray(req.body.recipients) ? req.body.recipients : [];

    if (!['whatsapp', 'email'].includes(type)) return error(res, 'type must be whatsapp or email', 400);
    if (!campaignName) return error(res, 'Campaign name is required', 400);
    if (!message) return error(res, 'Message content is required', 400);
    if (type === 'email' && !subject) return error(res, 'Email subject is required', 400);
    if (!req.body.confirm) return error(res, 'Confirmation is required before sending', 400);
    if (!recipientsInput.length) return error(res, 'At least one recipient is required', 400);

    const seen = new Set();
    const validRecipients = [];
    const invalidRecipients = [];
    let duplicateCount = 0;

    for (const item of recipientsInput) {
      const destination = normalizeDestination(type, item.destination || item.mobile || item.email);
      const recipient = {
        name: String(item.name || '').trim(),
        destination,
        variable_1: String(item.variable_1 || item.var1 || '').trim(),
        variable_2: String(item.variable_2 || item.var2 || '').trim(),
        remarks: String(item.remarks || '').trim(),
      };

      if (!isValidDestination(type, destination)) {
        invalidRecipients.push({ ...recipient, status: 'invalid', reason: `Invalid ${type === 'email' ? 'email' : 'mobile number'}` });
        continue;
      }
      if (seen.has(destination)) {
        duplicateCount++;
        invalidRecipients.push({ ...recipient, status: 'invalid', reason: 'Duplicate recipient' });
        continue;
      }
      seen.add(destination);
      validRecipients.push(recipient);
    }

    if (!validRecipients.length) return error(res, 'No valid recipients to send', 400, invalidRecipients);

    const idempotencyKey = req.body.idempotency_key || crypto
      .createHash('sha256')
      .update(JSON.stringify({
        type,
        campaignName,
        subject,
        message,
        recipients: validRecipients.map(r => r.destination).sort(),
      }))
      .digest('hex');

    const duplicate = await query(
      `SELECT id, created_at FROM bulk_campaigns
       WHERE idempotency_key = $1
         AND created_at > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [idempotencyKey]
    );
    if (duplicate.rows.length) {
      return error(res, `Duplicate campaign blocked. Existing campaign ID: ${duplicate.rows[0].id}`, 409);
    }

    await client.query('BEGIN');
    const campaignResult = await client.query(
      `INSERT INTO bulk_campaigns (
        campaign_name, type, subject, message_content, total_imported,
        valid_count, invalid_count, duplicate_count, pending_count,
        status, provider, idempotency_key, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'sending',$10,$11,$12)
      RETURNING *`,
      [
        campaignName,
        type,
        subject || null,
        message,
        recipientsInput.length,
        validRecipients.length,
        invalidRecipients.length,
        duplicateCount,
        validRecipients.length,
        type === 'email' ? (process.env.EMAIL_PROVIDER || 'brevo') : (process.env.WHATSAPP_PROVIDER || 'not_configured'),
        idempotencyKey,
        req.admin.id,
      ]
    );

    const campaign = campaignResult.rows[0];
    const insertedRecipients = [];
    for (const recipient of validRecipients) {
      const inserted = await client.query(
        `INSERT INTO bulk_campaign_recipients
         (campaign_id, name, destination, variable_1, variable_2, remarks, status)
         VALUES ($1,$2,$3,$4,$5,$6,'pending')
         RETURNING *`,
        [campaign.id, recipient.name, recipient.destination, recipient.variable_1, recipient.variable_2, recipient.remarks]
      );
      insertedRecipients.push(inserted.rows[0]);
    }

    for (const recipient of invalidRecipients) {
      await client.query(
        `INSERT INTO bulk_campaign_recipients
         (campaign_id, name, destination, variable_1, variable_2, remarks, status, reason)
         VALUES ($1,$2,$3,$4,$5,$6,'invalid',$7)`,
        [campaign.id, recipient.name, recipient.destination || '-', recipient.variable_1, recipient.variable_2, recipient.remarks, recipient.reason]
      );
    }
    await client.query('COMMIT');

    let sentCount = 0;
    let failedCount = 0;
    for (const recipient of insertedRecipients) {
      try {
        const body = interpolate(message, recipient);
        const result = type === 'whatsapp'
          ? await sendWhatsApp({ to: recipient.destination, message: body, recipient })
          : await sendBulkEmail({ to: recipient.destination, subject: interpolate(subject, recipient), html: makeEmailHtml(body) });

        sentCount++;
        await query(
          `UPDATE bulk_campaign_recipients
           SET status = 'sent', provider_message_id = $1, sent_at = NOW()
           WHERE id = $2`,
          [result.messageId, recipient.id]
        );
      } catch (sendErr) {
        failedCount++;
        await query(
          `UPDATE bulk_campaign_recipients
           SET status = 'failed', reason = $1
           WHERE id = $2`,
          [sendErr.message, recipient.id]
        );
      }
    }

    const finalStatus = failedCount === 0 ? 'completed' : sentCount > 0 ? 'partial' : 'failed';
    const updatedCampaign = await query(
      `UPDATE bulk_campaigns
       SET sent_count = $1, failed_count = $2, pending_count = 0,
           status = $3, completed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [sentCount, failedCount, finalStatus, campaign.id]
    );

    const report = await query(
      `SELECT id, name, destination, status, reason, provider_message_id, sent_at
       FROM bulk_campaign_recipients
       WHERE campaign_id = $1
       ORDER BY id ASC`,
      [campaign.id]
    );

    return success(res, {
      campaign: updatedCampaign.rows[0],
      recipients: report.rows,
    }, 'Bulk campaign processed');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('sendCampaign error:', err);
    return error(res, 'Failed to send bulk campaign');
  } finally {
    client.release();
  }
};

module.exports = { getCampaigns, getCampaignReport, sendCampaign };
