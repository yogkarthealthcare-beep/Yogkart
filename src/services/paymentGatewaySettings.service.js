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
  sandbox_client_id_encrypted TEXT,
  sandbox_secret_key_encrypted TEXT,
  production_client_id_encrypted TEXT,
  production_secret_key_encrypted TEXT,
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
  ADD COLUMN IF NOT EXISTS sandbox_client_id_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS sandbox_secret_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS production_client_id_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS production_secret_key_encrypted TEXT;

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
  await query(`
    ALTER TABLE payment_gateway_settings
      ADD COLUMN IF NOT EXISTS sandbox_client_id_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS sandbox_secret_key_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS production_client_id_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS production_secret_key_encrypted TEXT;

    UPDATE payment_gateway_settings
    SET
      production_client_id_encrypted = COALESCE(production_client_id_encrypted, CASE WHEN environment = 'production' THEN client_id_encrypted END),
      production_secret_key_encrypted = COALESCE(production_secret_key_encrypted, CASE WHEN environment = 'production' THEN secret_key_encrypted END),
      sandbox_client_id_encrypted = COALESCE(sandbox_client_id_encrypted, CASE WHEN environment = 'sandbox' THEN client_id_encrypted END),
      sandbox_secret_key_encrypted = COALESCE(sandbox_secret_key_encrypted, CASE WHEN environment = 'sandbox' THEN secret_key_encrypted END);
  `);

  for (const gateway of Object.keys(GATEWAYS)) {
    const seed = envSeed(gateway);
    const encClient = isUsableValue(seed.clientId) ? encryptCredential(seed.clientId) : null;
    const encSecret = isUsableValue(seed.secretKey) ? encryptCredential(seed.secretKey) : null;
    const isProd = seed.environment === 'production';

    const inserted = await query(
      `INSERT INTO payment_gateway_settings (
        gateway_name, is_enabled, environment, client_id_encrypted,
        secret_key_encrypted, sandbox_client_id_encrypted, sandbox_secret_key_encrypted,
        production_client_id_encrypted, production_secret_key_encrypted,
        callback_url, return_url, webhook_url, additional_config
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (gateway_name) DO NOTHING
      RETURNING id`,
      [
        gateway,
        seed.isEnabled,
        seed.environment,
        encClient,
        encSecret,
        !isProd ? encClient : null,
        !isProd ? encSecret : null,
        isProd ? encClient : null,
        isProd ? encSecret : null,
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
            'sandboxClientId',
            'productionClientId',
            'callbackUrl',
            'returnUrl',
            'webhookUrl',
          ]),
        ]
      );
    }
  }
};

const mapRuntime = (row) => {
  const sandboxClientId = safeDecrypt(row.sandbox_client_id_encrypted) || (row.environment === 'sandbox' ? safeDecrypt(row.client_id_encrypted) : '');
  const sandboxSecretKey = safeDecrypt(row.sandbox_secret_key_encrypted) || (row.environment === 'sandbox' ? safeDecrypt(row.secret_key_encrypted) : '');
  const productionClientId = safeDecrypt(row.production_client_id_encrypted) || (row.environment === 'production' ? safeDecrypt(row.client_id_encrypted) : '');
  const productionSecretKey = safeDecrypt(row.production_secret_key_encrypted) || (row.environment === 'production' ? safeDecrypt(row.secret_key_encrypted) : '');

  const activeClientId = row.environment === 'production'
    ? (productionClientId || safeDecrypt(row.client_id_encrypted))
    : (sandboxClientId || safeDecrypt(row.client_id_encrypted));

  const activeSecretKey = row.environment === 'production'
    ? (productionSecretKey || safeDecrypt(row.secret_key_encrypted))
    : (sandboxSecretKey || safeDecrypt(row.secret_key_encrypted));

  return {
    id: row.id,
    gatewayName: row.gateway_name,
    displayName: GATEWAYS[row.gateway_name]?.displayName || row.gateway_name,
    currency: GATEWAYS[row.gateway_name]?.currency,
    isEnabled: row.is_enabled,
    environment: row.environment,
    clientId: activeClientId,
    secretKey: activeSecretKey,
    sandboxClientId,
    sandboxSecretKey,
    productionClientId,
    productionSecretKey,
    callbackUrl: row.callback_url || '',
    returnUrl: row.return_url || '',
    webhookUrl: row.webhook_url || '',
    additionalConfig: row.additional_config || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

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
    const modeLabel = settings.environment === 'production' ? 'Production' : 'Testing (Sandbox)';
    const error = new Error(`${settings.displayName} credentials are incomplete for ${modeLabel} mode`);
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
    const sandboxSecret = runtime.sandboxSecretKey;
    const productionSecret = runtime.productionSecretKey;

    delete runtime.secretKey;
    delete runtime.sandboxSecretKey;
    delete runtime.productionSecretKey;

    return {
      ...runtime,
      secretConfigured: Boolean(secret),
      secretMasked: secret ? maskCredentialValue(secret) : '',
      sandboxSecretConfigured: Boolean(sandboxSecret),
      sandboxSecretMasked: sandboxSecret ? maskCredentialValue(sandboxSecret) : '',
      productionSecretConfigured: Boolean(productionSecret),
      productionSecretMasked: productionSecret ? maskCredentialValue(productionSecret) : '',
    };
  });
};

const getPublicGatewaySettings = async () => {
  const result = await query(
    `SELECT gateway_name, environment, client_id_encrypted, sandbox_client_id_encrypted, production_client_id_encrypted
     FROM payment_gateway_settings
     WHERE is_enabled = TRUE`
  );
  return result.rows.map((row) => {
    let clientId;
    if (['razorpay', 'paypal'].includes(row.gateway_name)) {
      clientId = row.environment === 'production'
        ? (safeDecrypt(row.production_client_id_encrypted) || safeDecrypt(row.client_id_encrypted))
        : (safeDecrypt(row.sandbox_client_id_encrypted) || safeDecrypt(row.client_id_encrypted));
    }
    return {
      gatewayName: row.gateway_name,
      displayName: GATEWAYS[row.gateway_name]?.displayName,
      currency: GATEWAYS[row.gateway_name]?.currency,
      environment: row.environment,
      clientId,
    };
  });
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

    // Sandbox credentials:
    let sandboxClientId = payload.sandboxClientId !== undefined
      ? String(payload.sandboxClientId).trim()
      : (environment === 'sandbox' && payload.clientId !== undefined ? String(payload.clientId).trim() : existing.sandboxClientId);

    let sandboxSecretKey = payload.sandboxSecretKey
      ? String(payload.sandboxSecretKey).trim()
      : (environment === 'sandbox' && payload.secretKey ? String(payload.secretKey).trim() : existing.sandboxSecretKey);

    // Production credentials:
    let productionClientId = payload.productionClientId !== undefined
      ? String(payload.productionClientId).trim()
      : (environment === 'production' && payload.clientId !== undefined ? String(payload.clientId).trim() : existing.productionClientId);

    let productionSecretKey = payload.productionSecretKey
      ? String(payload.productionSecretKey).trim()
      : (environment === 'production' && payload.secretKey ? String(payload.secretKey).trim() : existing.productionSecretKey);

    const isEnabled = Boolean(payload.isEnabled);

    // Active credentials for current environment
    const activeClientId = environment === 'production' ? productionClientId : sandboxClientId;
    const activeSecretKey = environment === 'production' ? productionSecretKey : sandboxSecretKey;

    if (isEnabled && (!activeClientId || !activeSecretKey)) {
      const modeLabel = environment === 'production' ? 'Production (Live)' : 'Testing (Sandbox)';
      const error = new Error(`Both Client/Key ID and Secret Key are required for ${modeLabel} mode before enabling this gateway.`);
      error.status = 400;
      throw error;
    }

    const callbackUrl = String(payload.callbackUrl ?? existing.callbackUrl).trim();
    const returnUrl = String(payload.returnUrl ?? existing.returnUrl).trim();
    const webhookUrl = String(payload.webhookUrl ?? existing.webhookUrl).trim();
    const additionalConfig = payload.additionalConfig && typeof payload.additionalConfig === 'object'
      ? payload.additionalConfig
      : existing.additionalConfig;

    const updatedResult = await client.query(
      `UPDATE payment_gateway_settings SET
        is_enabled = $1,
        environment = $2,
        client_id_encrypted = $3,
        secret_key_encrypted = $4,
        sandbox_client_id_encrypted = $5,
        sandbox_secret_key_encrypted = $6,
        production_client_id_encrypted = $7,
        production_secret_key_encrypted = $8,
        callback_url = $9,
        return_url = $10,
        webhook_url = $11,
        additional_config = $12,
        updated_by = $13
       WHERE gateway_name = $14
       RETURNING *`,
      [
        isEnabled,
        environment,
        activeClientId ? encryptCredential(activeClientId) : null,
        activeSecretKey ? encryptCredential(activeSecretKey) : null,
        sandboxClientId ? encryptCredential(sandboxClientId) : null,
        sandboxSecretKey ? encryptCredential(sandboxSecretKey) : null,
        productionClientId ? encryptCredential(productionClientId) : null,
        productionSecretKey ? encryptCredential(productionSecretKey) : null,
        callbackUrl || null,
        returnUrl || null,
        webhookUrl || null,
        JSON.stringify(additionalConfig),
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
        JSON.stringify({
          environment,
          isEnabled,
          hasSandboxClient: Boolean(sandboxClientId),
          hasSandboxSecret: Boolean(sandboxSecretKey),
          hasProductionClient: Boolean(productionClientId),
          hasProductionSecret: Boolean(productionSecretKey),
        }),
        audit.adminId || null,
        audit.ipAddress || null,
        audit.userAgent || null,
      ]
    );
    await client.query('COMMIT');

    const runtime = mapRuntime(updatedResult.rows[0]);
    const secret = runtime.secretKey;
    const sandboxSecret = runtime.sandboxSecretKey;
    const productionSecret = runtime.productionSecretKey;

    delete runtime.secretKey;
    delete runtime.sandboxSecretKey;
    delete runtime.productionSecretKey;

    return {
      ...runtime,
      secretConfigured: Boolean(secret),
      secretMasked: secret ? maskCredentialValue(secret) : '',
      sandboxSecretConfigured: Boolean(sandboxSecret),
      sandboxSecretMasked: sandboxSecret ? maskCredentialValue(sandboxSecret) : '',
      productionSecretConfigured: Boolean(productionSecret),
      productionSecretMasked: productionSecret ? maskCredentialValue(productionSecret) : '',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const bulkUpdateEnvironment = async (environment, audit = {}) => {
  const env = String(environment || '').toLowerCase();
  if (!['sandbox', 'production'].includes(env)) {
    const error = new Error('Environment must be sandbox or production');
    error.status = 400;
    throw error;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM payment_gateway_settings FOR UPDATE');
    for (const row of existing.rows) {
      const runtime = mapRuntime(row);
      const activeClientId = env === 'production' ? runtime.productionClientId : runtime.sandboxClientId;
      const activeSecretKey = env === 'production' ? runtime.productionSecretKey : runtime.sandboxSecretKey;

      await client.query(
        `UPDATE payment_gateway_settings SET
          environment = $1,
          client_id_encrypted = $2,
          secret_key_encrypted = $3,
          updated_by = $4
         WHERE gateway_name = $5`,
        [
          env,
          activeClientId ? encryptCredential(activeClientId) : row.client_id_encrypted,
          activeSecretKey ? encryptCredential(activeSecretKey) : row.secret_key_encrypted,
          audit.adminId || null,
          row.gateway_name,
        ]
      );

      await client.query(
        `INSERT INTO payment_gateway_audit_logs
          (gateway_name, action, changed_fields, admin_id, ip_address, user_agent)
         VALUES ($1, 'bulk_environment_switch', $2, $3, $4, $5)`,
        [
          row.gateway_name,
          JSON.stringify({ previous: row.environment, new: env }),
          audit.adminId || null,
          audit.ipAddress || null,
          audit.userAgent || null,
        ]
      );
    }
    await client.query('COMMIT');
    return await getAdminGatewaySettings();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
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
  bulkUpdateEnvironment,
};
