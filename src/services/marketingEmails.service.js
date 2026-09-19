const xlsx = require('xlsx');
const { query, getClient } = require('../config/database');

const MARKETING_EMAILS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS marketing_emails (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT '',
    email VARCHAR(255) NOT NULL,
    contact VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    country VARCHAR(100) DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sending', 'Sent', 'Failed')),
    sent_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    campaign_name VARCHAR(255) NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_emails_email_unique ON marketing_emails (LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_marketing_emails_status ON marketing_emails (status);
CREATE INDEX IF NOT EXISTS idx_marketing_emails_country ON marketing_emails (country);
CREATE INDEX IF NOT EXISTS idx_marketing_emails_created_at ON marketing_emails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_emails_sent_at ON marketing_emails (sent_at DESC);
`;

/**
 * Ensures table and indexes exist in PostgreSQL
 */
const ensureMarketingEmailsSchema = async () => {
  try {
    await query(MARKETING_EMAILS_SCHEMA_SQL);
    console.log('✅ Marketing emails schema verified/created');
  } catch (err) {
    console.error('❌ Error ensuring marketing_emails schema:', err.message);
  }
};

/**
 * Normalizes header keys
 */
const normalizeHeader = (rawHeader) => {
  if (!rawHeader) return '';
  const clean = String(rawHeader).toLowerCase().replace(/[^a-z0-9]/g, '');

  if (['name', 'fullname', 'customername', 'clientname', 'contactperson', 'username', 'naam', 'firstnamelastname'].includes(clean)) {
    return 'name';
  }
  if (['email', 'emailaddress', 'emailid', 'mail', 'email1', 'contactemail'].includes(clean)) {
    return 'email';
  }
  if (['contact', 'phone', 'phonenumber', 'mobile', 'mobilenumber', 'mobileno', 'contactno', 'telephone', 'cell', 'cellphone', 'whatsapp', 'phone1', 'mobile1'].includes(clean)) {
    return 'contact';
  }
  if (['address', 'fulladdress', 'streetaddress', 'location', 'city', 'deliveryaddress', 'residentialaddress', 'addressline'].includes(clean)) {
    return 'address';
  }
  if (['country', 'nation', 'countryname', 'nationality', 'desh'].includes(clean)) {
    return 'country';
  }

  return clean;
};

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

/**
 * Parses buffer and generates validation preview
 */
const previewExcelBuffer = async (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded file does not contain any worksheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '', blankrows: false });

  if (!rawRows || rawRows.length === 0) {
    return {
      totalRows: 0,
      validRecords: 0,
      invalidEmailRecords: 0,
      duplicateRecords: 0,
      preview: [],
      headers: [],
      hasEmailColumn: false,
    };
  }

  // Detect email header
  const rawHeaders = Object.keys(rawRows[0] || {});
  const normalizedHeaderMap = {};
  let hasEmailColumn = false;

  for (const h of rawHeaders) {
    const norm = normalizeHeader(h);
    normalizedHeaderMap[h] = norm;
    if (norm === 'email') hasEmailColumn = true;
  }

  if (!hasEmailColumn) {
    return {
      totalRows: rawRows.length,
      validRecords: 0,
      invalidEmailRecords: rawRows.length,
      duplicateRecords: 0,
      preview: [],
      headers: rawHeaders,
      hasEmailColumn: false,
      error: 'Missing required "Email" column in Excel file.',
    };
  }

  const seenEmails = new Set();
  const validList = [];
  let invalidEmailCount = 0;
  let duplicateCount = 0;

  for (const row of rawRows) {
    let name = '';
    let email = '';
    let contact = '';
    let address = '';
    let country = '';

    for (const [key, value] of Object.entries(row)) {
      const field = normalizedHeaderMap[key];
      const valStr = String(value || '').trim();
      if (field === 'name') name = valStr;
      else if (field === 'email') email = valStr.toLowerCase();
      else if (field === 'contact') contact = valStr;
      else if (field === 'address') address = valStr;
      else if (field === 'country') country = valStr;
    }

    if (!email || !isValidEmail(email)) {
      invalidEmailCount++;
      continue;
    }

    if (seenEmails.has(email)) {
      duplicateCount++;
      continue;
    }

    seenEmails.add(email);
    validList.push({ name, email, contact, address, country });
  }

  return {
    totalRows: rawRows.length,
    validRecords: validList.length,
    invalidEmailRecords: invalidEmailCount,
    duplicateRecords: duplicateCount,
    preview: validList.slice(0, 10),
    headers: rawHeaders,
    hasEmailColumn: true,
  };
};

/**
 * Batch imports parsed records into marketing_emails table
 */
const importMarketingEmailRecords = async (records = []) => {
  if (!Array.isArray(records) || records.length === 0) {
    return { importedCount: 0, duplicateCount: 0, failedCount: 0, total: 0 };
  }

  const client = await getClient();
  let importedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  try {
    await client.query('BEGIN');

    // Batch insertion in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const values = [];
      const placeholders = [];
      let pIdx = 1;

      for (const item of chunk) {
        const email = String(item.email || '').trim().toLowerCase();
        if (!email || !isValidEmail(email)) {
          failedCount++;
          continue;
        }

        const name = String(item.name || '').trim();
        const contact = String(item.contact || '').trim();
        const address = String(item.address || '').trim();
        const country = String(item.country || '').trim();

        placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'Pending', NOW(), NOW())`);
        values.push(name, email, contact, address, country);
      }

      if (placeholders.length > 0) {
        const insertSql = `
          INSERT INTO marketing_emails (name, email, contact, address, country, status, created_at, updated_at)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (LOWER(TRIM(email))) DO NOTHING
          RETURNING id;
        `;

        const res = await client.query(insertSql, values);
        const insertedNow = res.rowCount || 0;
        importedCount += insertedNow;
        duplicateCount += (placeholders.length - insertedNow);
      }
    }

    await client.query('COMMIT');
    return {
      importedCount,
      duplicateCount,
      failedCount,
      total: records.length,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Fetches paginated marketing emails with filters
 */
const getMarketingEmails = async ({ page = 1, limit = 20, search = '', status = '', country = '', sortBy = 'created_at', sortOrder = 'DESC' }) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(name) LIKE $${paramIdx} OR
      LOWER(email) LIKE $${paramIdx} OR
      LOWER(contact) LIKE $${paramIdx} OR
      LOWER(address) LIKE $${paramIdx} OR
      LOWER(country) LIKE $${paramIdx}
    )`);
    params.push(s);
    paramIdx++;
  }

  if (status && status !== 'all') {
    conditions.push(`status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }

  if (country && country !== 'all') {
    conditions.push(`LOWER(country) = $${paramIdx}`);
    params.push(country.trim().toLowerCase());
    paramIdx++;
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const validSortCols = ['id', 'name', 'email', 'contact', 'country', 'status', 'sent_at', 'created_at'];
  const sortCol = validSortCols.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*)::bigint AS total FROM marketing_emails ${whereSql}`;
  const dataSql = `
    SELECT id, name, email, contact, address, country, status, sent_at, last_error, campaign_name, created_at, updated_at
    FROM marketing_emails
    ${whereSql}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countSql, params),
    query(dataSql, [...params, l, offset]),
  ]);

  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const totalPages = Math.ceil(total / l) || 1;

  return {
    emails: dataRes.rows,
    total,
    page: p,
    limit: l,
    totalPages,
  };
};

/**
 * Fetches dashboard KPI stats for marketing emails
 */
const getMarketingEmailStats = async () => {
  const sql = `
    SELECT
      COUNT(*)::int AS total_emails,
      COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE status = 'Sent')::int AS sent_count,
      COUNT(*) FILTER (WHERE status = 'Failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE status = 'Sending')::int AS sending_count,
      COUNT(DISTINCT NULLIF(TRIM(country), ''))::int AS total_countries,
      MAX(sent_at) AS last_sent_date,
      MAX(created_at) AS last_import_date
    FROM marketing_emails;
  `;

  const countrySql = `
    SELECT country, COUNT(*)::int AS count
    FROM marketing_emails
    WHERE country IS NOT NULL AND TRIM(country) != ''
    GROUP BY country
    ORDER BY count DESC
    LIMIT 20;
  `;

  const [statsRes, countryRes] = await Promise.all([
    query(sql),
    query(countrySql),
  ]);

  const row = statsRes.rows[0] || {};
  return {
    totalEmails: row.total_emails || 0,
    pendingCount: row.pending_count || 0,
    sentCount: row.sent_count || 0,
    failedCount: row.failed_count || 0,
    sendingCount: row.sending_count || 0,
    totalCountries: row.total_countries || 0,
    lastSentDate: row.last_sent_date,
    lastImportDate: row.last_import_date,
    countryBreakdown: countryRes.rows,
  };
};

/**
 * Interpolates variables in template
 */
const interpolateEmailTemplate = (template, recipient = {}) => {
  return String(template || '')
    .replace(/\{\{\s*name\s*\}\}/gi, recipient.name || 'Valued Customer')
    .replace(/\{\{\s*email\s*\}\}/gi, recipient.email || '')
    .replace(/\{\{\s*contact\s*\}\}/gi, recipient.contact || '')
    .replace(/\{\{\s*country\s*\}\}/gi, recipient.country || '')
    .replace(/\{\{\s*address\s*\}\}/gi, recipient.address || '');
};

/**
 * Sends a single marketing email via Brevo API
 */
const sendSingleEmail = async ({ to, toName, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured in backend environment');
  }

  const senderName = process.env.EMAIL_SENDER_NAME || 'Yogkart Healthcare';
  const senderEmail = process.env.EMAIL_SENDER || 'yogkarthealthcare@gmail.com';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to, name: toName || undefined }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Brevo Email API returned HTTP ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.messageId || null };
};

/**
 * Bulk email sending with strict duplicate prevention and concurrency safety
 */
const sendBulkMarketingEmails = async ({
  target = 'selected', // 'selected' | 'pending' | 'failed' | 'all_eligible'
  ids = [],
  subject,
  htmlContent,
  campaignName = '',
}) => {
  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required');
  }
  if (!htmlContent || !htmlContent.trim()) {
    throw new Error('Email message body is required');
  }

  let fetchSql = '';
  let params = [];

  if (target === 'selected' && Array.isArray(ids) && ids.length > 0) {
    fetchSql = `
      SELECT id, name, email, contact, address, country, status
      FROM marketing_emails
      WHERE id = ANY($1::bigint[])
    `;
    params = [ids];
  } else if (target === 'pending') {
    fetchSql = `
      SELECT id, name, email, contact, address, country, status
      FROM marketing_emails
      WHERE status = 'Pending'
      ORDER BY id ASC
    `;
  } else if (target === 'failed') {
    fetchSql = `
      SELECT id, name, email, contact, address, country, status
      FROM marketing_emails
      WHERE status = 'Failed'
      ORDER BY id ASC
    `;
  } else {
    // all_eligible (Pending + Failed)
    fetchSql = `
      SELECT id, name, email, contact, address, country, status
      FROM marketing_emails
      WHERE status IN ('Pending', 'Failed')
      ORDER BY id ASC
    `;
  }

  const candidatesRes = await query(fetchSql, params);
  const candidates = candidatesRes.rows;

  if (candidates.length === 0) {
    return {
      totalSelected: 0,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      message: 'No eligible recipients found to send email to.',
    };
  }

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const recipient of candidates) {
    // ── STRICT DUPLICATE PREVENTION ───────────────────────
    if (recipient.status === 'Sent') {
      skippedCount++;
      continue;
    }

    // Atomic update to 'Sending' to avoid concurrent sends
    const lockRes = await query(
      `UPDATE marketing_emails
       SET status = 'Sending', updated_at = NOW()
       WHERE id = $1 AND status != 'Sent'
       RETURNING id, name, email, contact, address, country`,
      [recipient.id]
    );

    if (lockRes.rowCount === 0) {
      // Record was already marked Sent by another worker/thread
      skippedCount++;
      continue;
    }

    const lockedRecipient = lockRes.rows[0];
    const personalizedHtml = interpolateEmailTemplate(htmlContent, lockedRecipient);
    const personalizedSubject = interpolateEmailTemplate(subject, lockedRecipient);

    try {
      await sendSingleEmail({
        to: lockedRecipient.email,
        toName: lockedRecipient.name,
        subject: personalizedSubject,
        htmlContent: personalizedHtml,
      });

      // Mark as Sent with timestamp
      await query(
        `UPDATE marketing_emails
         SET status = 'Sent',
             sent_at = NOW(),
             campaign_name = COALESCE(NULLIF($2, ''), campaign_name),
             last_error = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [lockedRecipient.id, campaignName]
      );

      sentCount++;
    } catch (sendErr) {
      failedCount++;
      const errMsg = sendErr.message || 'Unknown sending failure';
      await query(
        `UPDATE marketing_emails
         SET status = 'Failed',
             last_error = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [lockedRecipient.id, errMsg]
      );
    }
  }

  return {
    totalSelected: candidates.length,
    sentCount,
    skippedCount,
    failedCount,
    pendingCount: Math.max(0, candidates.length - sentCount - skippedCount - failedCount),
  };
};

/**
 * Updates a single marketing email record
 */
const updateMarketingEmail = async (id, { name, email, contact, address, country, status }) => {
  const fields = [];
  const params = [id];
  let pIdx = 2;

  if (name !== undefined) {
    fields.push(`name = $${pIdx++}`);
    params.push(String(name).trim());
  }
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Invalid email address');
    }
    fields.push(`email = $${pIdx++}`);
    params.push(cleanEmail);
  }
  if (contact !== undefined) {
    fields.push(`contact = $${pIdx++}`);
    params.push(String(contact).trim());
  }
  if (address !== undefined) {
    fields.push(`address = $${pIdx++}`);
    params.push(String(address).trim());
  }
  if (country !== undefined) {
    fields.push(`country = $${pIdx++}`);
    params.push(String(country).trim());
  }
  if (status !== undefined && ['Pending', 'Sending', 'Sent', 'Failed'].includes(status)) {
    fields.push(`status = $${pIdx++}`);
    params.push(status);
  }

  fields.push('updated_at = NOW()');

  const sql = `
    UPDATE marketing_emails
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const res = await query(sql, params);
  if (res.rowCount === 0) {
    throw new Error('Marketing email record not found');
  }
  return res.rows[0];
};

/**
 * Deletes a single marketing email record
 */
const deleteMarketingEmail = async (id) => {
  const res = await query('DELETE FROM marketing_emails WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

/**
 * Bulk deletes marketing emails by IDs
 */
const bulkDeleteMarketingEmails = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const res = await query('DELETE FROM marketing_emails WHERE id = ANY($1::bigint[])', [ids]);
  return res.rowCount || 0;
};

/**
 * Resets status of failed or selected emails back to 'Pending' for retry
 */
const resetMarketingEmailStatus = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    // Reset all failed to pending
    const res = await query(`
      UPDATE marketing_emails
      SET status = 'Pending', last_error = NULL, updated_at = NOW()
      WHERE status = 'Failed'
      RETURNING id
    `);
    return res.rowCount || 0;
  }

  const res = await query(`
    UPDATE marketing_emails
    SET status = 'Pending', last_error = NULL, updated_at = NOW()
    WHERE id = ANY($1::bigint[])
    RETURNING id
  `, [ids]);
  return res.rowCount || 0;
};

/**
 * Fetches all matching records for Excel export
 */
const getExportRecords = async ({ status = '', country = '', search = '', ids = [] }) => {
  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (Array.isArray(ids) && ids.length > 0) {
    conditions.push(`id = ANY($${pIdx++}::bigint[])`);
    params.push(ids);
  }

  if (status && status !== 'all') {
    conditions.push(`status = $${pIdx++}`);
    params.push(status);
  }

  if (country && country !== 'all') {
    conditions.push(`LOWER(country) = $${pIdx++}`);
    params.push(country.trim().toLowerCase());
  }

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(name) LIKE $${pIdx} OR
      LOWER(email) LIKE $${pIdx} OR
      LOWER(contact) LIKE $${pIdx} OR
      LOWER(address) LIKE $${pIdx} OR
      LOWER(country) LIKE $${pIdx}
    )`);
    params.push(s);
    pIdx++;
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT name, email, contact, address, country, status, sent_at, created_at
    FROM marketing_emails
    ${whereSql}
    ORDER BY id ASC
  `;

  const res = await query(sql, params);
  return res.rows;
};

module.exports = {
  ensureMarketingEmailsSchema,
  previewExcelBuffer,
  importMarketingEmailRecords,
  getMarketingEmails,
  getMarketingEmailStats,
  sendBulkMarketingEmails,
  updateMarketingEmail,
  deleteMarketingEmail,
  bulkDeleteMarketingEmails,
  resetMarketingEmailStatus,
  getExportRecords,
};
