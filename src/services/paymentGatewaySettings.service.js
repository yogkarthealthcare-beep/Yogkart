const fs = require('fs');
const path = require('path');
const { query, getClient } = require('../config/database');
const {
  encryptCredential,
  decryptCredential,
  maskCredentialValue,
} = require('../utils/encryption');

const GATEWAYS = Object.freeze({
  razorpay: { displayName: 'Razorpay', currency: 'INR' },
  cashfree: { displayName: 'Cashfree', currency: 'INR' },
  payu: { displayName: 'PayU', currency: 'INR' },
  paypal: { displayName: 'PayPal', currency: 'USD' },
});

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_name VARCHAR(30) NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  client_id_encrypted TEXT,
  secret_key_encrypted TEXT,
  callback_url TEXT,
  return_url TEXT,
  webhook_url TEXT,
  additional_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_gateway_settings
  DROP CONSTRAINT IF EXISTS payment_gateway_name_supported;

ALTER TABLE payment_gateway_settings
  ADD CONSTRAINT payment_gateway_name_supported
    CHECK (gateway_name IN ('razorpay', 'cashfree', 'payu', 'paypal'));

CREATE INDEX IF NOT EXISTS idx_payment_gateway_enabled
  ON payment_gateway_settings (gateway_name) WHERE is_enabled = TRUE;

CREATE TABLE IF NOT EXISTS payment_gateway_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_name VARCHAR(30) NOT NULL,
  action VARCHAR(30) NOT NULL,
  changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_audit_gateway_created
  ON payment_gateway_audit_logs (gateway_name, created_at DESC);

DROP TRIGGER IF EXISTS trg_payment_gateway_settings_updated ON payment_gateway_settings;
CREATE TRIGGER trg_payment_gateway_settings_updated
  BEFORE UPDATE ON payment_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

const safeDecrypt = (value) => (value ? decryptCredential(value) : '');
const normalizeGateway = (name) => String(name || '').trim().toLowerCase();

const assertGateway = (name) => {
  const gateway = normalizeGateway(name);
  if (!GATEWAYS[gateway]) {
    const error = new Error(`Unsupported payment gateway: ${name}`);
    error.status = 400;
    throw error;
  }
  return gateway;
};

const isUsableValue = (value) => {
  const text = String(value || '').trim();
  return Boolean(text && !/^your[_ -]/i.test(text) && !/placeholder/i.test(text));
};

const readFrontendConfigValue = (key) => {
  const candidates = [
    path.resolve(process.cwd(), '../yogkart_frontend/src/environments/environment.prod.ts'),
    path.resolve(process.cwd(), '../yogkart_frontend/src/environments/environment.ts'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const contents = fs.readFileSync(file, 'utf8');
    const match = contents.match(new RegExp(`${key}\\s*:\\s*['"]([^'"]*)['"]`));
    if (match && isUsableValue(match[1])) return match[1];
  }
  return '';
};

const envSeed = (gateway) => {
  const frontendUrl = String(process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const values = {
    razorpay: {
      clientId: process.env.RAZORPAY_KEY_ID || readFrontendConfigValue('razorpayKeyId'),
      secretKey: process.env.RAZORPAY_KEY_SECRET,
      callbackUrl: process.env.RAZORPAY_CALLBACK_URL || '',
      returnUrl: '',
      webhookUrl: process.env.RAZORPAY_WEBHOOK_URL || '',
    },
    cashfree: {
      clientId: process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID,
      secretKey: process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY,
      callbackUrl: process.env.CASHFREE_CALLBACK_URL || '',
      returnUrl: process.env.CASHFREE_RETURN_URL || (frontendUrl ? `${frontendUrl}/checkout` : ''),
      webhookUrl: process.env.CASHFREE_WEBHOOK_URL || '',
    },
    payu: {
      clientId: process.env.PAYU_KEY || process.env.PAYU_MERCHANT_KEY || process.env.PAYU_CLIENT_ID,
      secretKey: process.env.PAYU_SALT || process.env.PAYU_SECRET_KEY,
      callbackUrl: process.env.PAYU_CALLBACK_URL || '',
      returnUrl: process.env.PAYU_RETURN_URL || (frontendUrl ? `${frontendUrl}/checkout` : ''),
      webhookUrl: process.env.PAYU_WEBHOOK_URL || '',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || readFrontendConfigValue('paypalClientId'),
      secretKey: process.env.PAYPAL_CLIENT_SECRET,
      callbackUrl: process.env.PAYPAL_CALLBACK_URL || '',
      returnUrl: process.env.PAYPAL_RETURN_URL || (frontendUrl ? `${frontendUrl}/checkout` : ''),
      webhookUrl: process.env.PAYPAL_WEBHOOK_URL || '',
    },
  }[gateway];

  return {
    ...values,
    environment: String(process.env[`${gateway.toUpperCase()}_ENVIRONMENT`] || 'sandbox').toLowerCase() === 'production'
      ? 'production'
      : 'sandbox',
    isEnabled: Boolean(isUsableValue(values.clientId) && isUsableValue(values.secretKey)),
  };
};

const ensurePaymentGatewaySchema = async () => {
  await query(SCHEMA_SQL);
  for (const gateway of Object.keys(GATEWAYS)) {
    const seed = envSeed(gateway);
    const inserted = await query(
      `INSERT INTO payment_gateway_settings (
        gateway_name, is_enabled, environment, client_id_encrypted,
        secret_key_encrypted, callback_url, return_url, webhook_url,
        additional_config
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (gateway_name) DO NOTHING
      RETURNING id`,
      [
        gateway,
        seed.isEnabled,
        seed.environment,
        isUsableValue(seed.clientId) ? encryptCredential(seed.clientId) : null,
        isUsableValue(seed.secretKey) ? encryptCredential(seed.secretKey) : null,
        seed.callbackUrl || null,
        seed.returnUrl || null,
        seed.webhookUrl || null,
        JSON.stringify({ migratedFromEnvironment: true }),
      ]
    );
    if (inserted.rowCount) {
      await query(
        `INSERT INTO payment_gateway_audit_logs
          (gateway_name, action, changed_fields)
         VALUES ($1, 'migrated', $2)`,
        [
          gateway,
          JSON.stringify([
            'isEnabled',
            'environment',
            'clientId',
            'secretKey',
            'callbackUrl',
            'returnUrl',
            'webhookUrl',
          ]),
        ]
      );
    }
  }
};

const mapRuntime = (row) => ({
  id: row.id,
  gatewayName: row.gateway_name,
  displayName: GATEWAYS[row.gateway_name]?.displayName || row.gateway_name,
  currency: GATEWAYS[row.gateway_name]?.currency,
  isEnabled: row.is_enabled,
  environment: row.environment,
  clientId: safeDecrypt(row.client_id_encrypted),
  secretKey: safeDecrypt(row.secret_key_encrypted),
  callbackUrl: row.callback_url || '',
  returnUrl: row.return_url || '',
  webhookUrl: row.webhook_url || '',
  additionalConfig: row.additional_config || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getGatewaySettings = async (name, { requireEnabled = false } = {}) => {
  const gateway = assertGateway(name);
  const result = await query(
    `SELECT * FROM payment_gateway_settings WHERE gateway_name = $1`,
    [gateway]
  );
  if (!result.rows.length) {
    const error = new Error(`${GATEWAYS[gateway].displayName} is not configured`);
    error.status = 503;
    throw error;
  }
  const settings = mapRuntime(result.rows[0]);
  if (requireEnabled && !settings.isEnabled) {
    const error = new Error(`${settings.displayName} is currently disabled`);
    error.status = 503;
    throw error;
  }
  if (requireEnabled && (!settings.clientId || !settings.secretKey)) {
    const error = new Error(`${settings.displayName} credentials are incomplete`);
    error.status = 503;
    throw error;
  }
  return settings;
};

const getAdminGatewaySettings = async () => {
  const result = await query(
    `SELECT * FROM payment_gateway_settings
     ORDER BY CASE gateway_name
       WHEN 'razorpay' THEN 1 WHEN 'cashfree' THEN 2 WHEN 'payu' THEN 3 WHEN 'paypal' THEN 4 ELSE 5 END`
  );
  return result.rows.map((row) => {
    const runtime = mapRuntime(row);
    const secret = runtime.secretKey;
    delete runtime.secretKey;
    return {
      ...runtime,
      secretConfigured: Boolean(secret),
      secretMasked: secret ? maskCredentialValue(secret) : '',
    };
  });
};

const getPublicGatewaySettings = async () => {
  const result = await query(
    `SELECT gateway_name, environment, client_id_encrypted
     FROM payment_gateway_settings
     WHERE is_enabled = TRUE`
  );
  return result.rows.map((row) => ({
    gatewayName: row.gateway_name,
    displayName: GATEWAYS[row.gateway_name]?.displayName,
    currency: GATEWAYS[row.gateway_name]?.currency,
    environment: row.environment,
    clientId: ['razorpay', 'paypal'].includes(row.gateway_name)
      ? safeDecrypt(row.client_id_encrypted)
      : undefined,
  }));
};

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const updateGatewaySettings = async (name, payload, audit = {}) => {
  const gateway = assertGateway(name);
  const environment = String(payload.environment || '').toLowerCase();
  if (!['sandbox', 'production'].includes(environment)) {
    const error = new Error('Environment must be sandbox or production');
    error.status = 400;
    throw error;
  }
  for (const field of ['callbackUrl', 'returnUrl', 'webhookUrl']) {
    if (!isValidUrl(payload[field])) {
      const error = new Error(`${field} must be a valid HTTP or HTTPS URL`);
      error.status = 400;
      throw error;
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query(
      `SELECT * FROM payment_gateway_settings WHERE gateway_name = $1 FOR UPDATE`,
      [gateway]
    );
    if (!existingResult.rows.length) {
      const error = new Error('Gateway configuration not found');
      error.status = 404;
      throw error;
    }
    const existing = mapRuntime(existingResult.rows[0]);
    const fields = {
      isEnabled: Boolean(payload.isEnabled),
      environment,
      clientId: String(payload.clientId ?? existing.clientId).trim(),
      secretKey: String(payload.secretKey || existing.secretKey).trim(),
      callbackUrl: String(payload.callbackUrl || '').trim(),
      returnUrl: String(payload.returnUrl || '').trim(),
      webhookUrl: String(payload.webhookUrl || '').trim(),
      additionalConfig: payload.additionalConfig && typeof payload.additionalConfig === 'object'
        ? payload.additionalConfig
        : {},
    };
    if (fields.isEnabled && (!fields.clientId || !fields.secretKey)) {
      const error = new Error('Client/Key ID and secret key are required before enabling a gateway');
      error.status = 400;
      throw error;
    }

    const changedFields = Object.keys(fields).filter((field) => {
      if (field === 'secretKey') return Boolean(payload.secretKey) && payload.secretKey !== existing.secretKey;
      if (field === 'additionalConfig') {
        return JSON.stringify(fields[field]) !== JSON.stringify(existing[field] || {});
      }
      return fields[field] !== existing[field];
    });

    const updatedResult = await client.query(
      `UPDATE payment_gateway_settings SET
        is_enabled = $1, environment = $2, client_id_encrypted = $3,
        secret_key_encrypted = $4, callback_url = $5, return_url = $6,
        webhook_url = $7, additional_config = $8, updated_by = $9
       WHERE gateway_name = $10
       RETURNING *`,
      [
        fields.isEnabled,
        fields.environment,
        fields.clientId ? encryptCredential(fields.clientId) : null,
        fields.secretKey ? encryptCredential(fields.secretKey) : null,
        fields.callbackUrl || null,
        fields.returnUrl || null,
        fields.webhookUrl || null,
        JSON.stringify(fields.additionalConfig),
        audit.adminId || null,
        gateway,
      ]
    );
    await client.query(
      `INSERT INTO payment_gateway_audit_logs
        (gateway_name, action, changed_fields, admin_id, ip_address, user_agent)
       VALUES ($1, 'updated', $2, $3, $4, $5)`,
      [
        gateway,
        JSON.stringify(changedFields),
        audit.adminId || null,
        audit.ipAddress || null,
        audit.userAgent || null,
      ]
    );
    await client.query('COMMIT');

    const runtime = mapRuntime(updatedResult.rows[0]);
    const secret = runtime.secretKey;
    delete runtime.secretKey;
    return {
      ...runtime,
      secretConfigured: Boolean(secret),
      secretMasked: secret ? maskCredentialValue(secret) : '',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  GATEWAYS,
  ensurePaymentGatewaySchema,
  getGatewaySettings,
  getAdminGatewaySettings,
  getPublicGatewaySettings,
  updateGatewaySettings,
};
