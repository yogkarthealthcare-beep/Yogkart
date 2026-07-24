const { query } = require('../config/database');

const ensureBulkCommunicationSchema = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS bulk_campaigns (
      id SERIAL PRIMARY KEY,
      campaign_name VARCHAR(160) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'email')),
      subject TEXT,
      message_content TEXT NOT NULL,
      total_imported INTEGER NOT NULL DEFAULT 0,
      valid_count INTEGER NOT NULL DEFAULT 0,
      invalid_count INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      pending_count INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      provider VARCHAR(60),
      idempotency_key VARCHAR(120),
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bulk_campaign_recipients (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
      name VARCHAR(160),
      destination VARCHAR(255) NOT NULL,
      variable_1 TEXT,
      variable_2 TEXT,
      remarks TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reason TEXT,
      provider_message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_type_created ON bulk_campaigns(type, created_at DESC)');
  await query('CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_idempotency ON bulk_campaigns(idempotency_key)');
  await query('CREATE INDEX IF NOT EXISTS idx_bulk_recipients_campaign ON bulk_campaign_recipients(campaign_id)');
};

const interpolate = (template, recipient = {}) => String(template || '')
  .replace(/\{\{\s*name\s*\}\}/gi, recipient.name || '')
  .replace(/\{\{\s*var1\s*\}\}/gi, recipient.variable_1 || '')
  .replace(/\{\{\s*var2\s*\}\}/gi, recipient.variable_2 || '')
  .replace(/\{\{\s*mobile\s*\}\}/gi, recipient.destination || '')
  .replace(/\{\{\s*email\s*\}\}/gi, recipient.destination || '');

const sendWhatsApp = async ({ to, message, recipient }) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'not_configured';
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !token) {
    throw new Error(`WhatsApp provider not configured (${provider})`);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      provider,
      to,
      message,
      name: recipient.name,
      variable_1: recipient.variable_1,
      variable_2: recipient.variable_2,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `WhatsApp API error: ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.messageId || data.id || null, provider };
};

const sendBulkEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const provider = process.env.EMAIL_PROVIDER || 'brevo';

  if (!apiKey) {
    throw new Error('Email provider not configured: BREVO_API_KEY missing');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_SENDER_NAME || 'Yogkart Healthcare',
        email: process.env.EMAIL_SENDER || 'yogkarthealthcare@gmail.com',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Email API error: ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.messageId || null, provider };
};

module.exports = {
  ensureBulkCommunicationSchema,
  interpolate,
  sendWhatsApp,
  sendBulkEmail,
};
