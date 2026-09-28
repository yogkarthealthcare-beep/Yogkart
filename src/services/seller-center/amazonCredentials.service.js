const { query, getClient } = require('../../config/database');
const {
  encryptCredential,
  decryptCredential,
  maskCredentialValue,
} = require('../../utils/encryption');

const safeDecrypt = (val) => (val ? decryptCredential(val) : '');

/**
 * Fetch raw decrypted Amazon SP-API credentials for backend execution only.
 */
const getAmazonCredentials = async ({ requireConfigured = false } = {}) => {
  const result = await query(
    `SELECT * FROM amazon_integrations ORDER BY created_at ASC LIMIT 1`
  );

  if (!result.rows.length) {
    if (requireConfigured) {
      const error = new Error('Amazon SP-API integration record not found in database');
      error.status = 404;
      throw error;
    }
    return null;
  }

  const row = result.rows[0];
  const clientId = safeDecrypt(row.client_id_encrypted);
  const clientSecret = safeDecrypt(row.client_secret_encrypted);
  const refreshToken = safeDecrypt(row.refresh_token_encrypted);

  const isConfigured = Boolean(clientId && clientSecret && refreshToken);

  if (requireConfigured && !isConfigured) {
    const error = new Error('Amazon SP-API credentials are incomplete or missing. Please configure them in Seller Center Settings.');
    error.status = 400;
    throw error;
  }

  return {
    id: row.id,
    accountName: row.account_name,
    clientId,
    clientSecret,
    refreshToken,
    marketplaceId: row.marketplace_id || 'A21TJRUUN4KGV',
    region: row.region || 'eu-west-1',
    endpoint: row.endpoint || 'https://sellingpartnerapi-eu.amazon.com',
    sellerId: row.seller_id || '',
    isActive: row.is_active,
    connectionStatus: row.connection_status,
    lastTestedAt: row.last_tested_at,
    lastSyncAt: row.last_sync_at,
    lastErrorMessage: row.last_error_message,
    additionalConfig: row.additional_config || {},
    isConfigured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Fetch masked Amazon SP-API credentials safe for Admin UI.
 * Never exposes raw secret/refresh token to the browser.
 */
const getAdminAmazonCredentials = async () => {
  const creds = await getAmazonCredentials();
  if (!creds) {
    return {
      isConfigured: false,
      accountName: 'Amazon India Seller Store',
      clientIdMasked: '',
      clientSecretConfigured: false,
      clientSecretMasked: '',
      refreshTokenConfigured: false,
      refreshTokenMasked: '',
      marketplaceId: 'A21TJRUUN4KGV',
      region: 'eu-west-1',
      endpoint: 'https://sellingpartnerapi-eu.amazon.com',
      sellerId: '',
      isActive: true,
      connectionStatus: 'NOT_CONNECTED',
      lastTestedAt: null,
      lastSyncAt: null,
    };
  }

  return {
    id: creds.id,
    isConfigured: creds.isConfigured,
    accountName: creds.accountName,
    clientIdMasked: creds.clientId ? maskCredentialValue(creds.clientId, 6) : '',
    clientSecretConfigured: Boolean(creds.clientSecret),
    clientSecretMasked: creds.clientSecret ? maskCredentialValue(creds.clientSecret, 4) : '',
    refreshTokenConfigured: Boolean(creds.refreshToken),
    refreshTokenMasked: creds.refreshToken ? maskCredentialValue(creds.refreshToken, 4) : '',
    marketplaceId: creds.marketplaceId,
    region: creds.region,
    endpoint: creds.endpoint,
    sellerId: creds.sellerId,
    isActive: creds.isActive,
    connectionStatus: creds.connectionStatus,
    lastTestedAt: creds.lastTestedAt,
    lastSyncAt: creds.lastSyncAt,
    lastErrorMessage: creds.lastErrorMessage,
  };
};

/**
 * Save / Update Amazon SP-API credentials in database.
 * If sensitive fields are left blank, existing encrypted values are preserved.
 */
const saveAmazonCredentials = async (payload, adminId = null) => {
  const existing = await getAmazonCredentials();

  const accountName = String(payload.accountName || existing?.accountName || 'Amazon India Seller Store').trim();
  const marketplaceId = String(payload.marketplaceId || existing?.marketplaceId || 'A21TJRUUN4KGV').trim();
  const region = String(payload.region || existing?.region || 'eu-west-1').trim();
  const endpoint = String(payload.endpoint || existing?.endpoint || 'https://sellingpartnerapi-eu.amazon.com').trim();
  const sellerId = String(payload.sellerId !== undefined ? payload.sellerId : (existing?.sellerId || '')).trim();
  const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : (existing?.isActive ?? true);

  // Preserve existing secret values if user left them empty / masked
  const clientId = payload.clientId && !payload.clientId.includes('••••') && !payload.clientId.includes('****')
    ? String(payload.clientId).trim()
    : (existing?.clientId || '');

  const clientSecret = payload.clientSecret && !payload.clientSecret.includes('••••') && !payload.clientSecret.includes('****')
    ? String(payload.clientSecret).trim()
    : (existing?.clientSecret || '');

  const refreshToken = payload.refreshToken && !payload.refreshToken.includes('••••') && !payload.refreshToken.includes('****')
    ? String(payload.refreshToken).trim()
    : (existing?.refreshToken || '');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let updatedResult;
    if (existing?.id) {
      updatedResult = await client.query(
        `UPDATE amazon_integrations SET
          account_name = $1,
          client_id_encrypted = $2,
          client_secret_encrypted = $3,
          refresh_token_encrypted = $4,
          marketplace_id = $5,
          region = $6,
          endpoint = $7,
          seller_id = $8,
          is_active = $9,
          updated_by = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
        [
          accountName,
          clientId ? encryptCredential(clientId) : null,
          clientSecret ? encryptCredential(clientSecret) : null,
          refreshToken ? encryptCredential(refreshToken) : null,
          marketplaceId,
          region,
          endpoint,
          sellerId || null,
          isActive,
          adminId,
          existing.id,
        ]
      );
    } else {
      updatedResult = await client.query(
        `INSERT INTO amazon_integrations (
          account_name, client_id_encrypted, client_secret_encrypted,
          refresh_token_encrypted, marketplace_id, region, endpoint,
          seller_id, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
        RETURNING *`,
        [
          accountName,
          clientId ? encryptCredential(clientId) : null,
          clientSecret ? encryptCredential(clientSecret) : null,
          refreshToken ? encryptCredential(refreshToken) : null,
          marketplaceId,
          region,
          endpoint,
          sellerId || null,
          isActive,
          adminId,
        ]
      );
    }

    // Update marketplace registry status
    const isNowConfigured = Boolean(clientId && clientSecret && refreshToken);
    await client.query(
      `UPDATE seller_marketplaces
       SET status = $1, updated_at = NOW()
       WHERE code = 'AMAZON'`,
      [isNowConfigured ? 'CONNECTED' : 'NOT_CONNECTED']
    );

    await client.query('COMMIT');
    return await getAdminAmazonCredentials();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update Amazon connection status in database after test / sync.
 */
const updateAmazonConnectionStatus = async (status, errorMessage = null) => {
  await query(
    `UPDATE amazon_integrations SET
      connection_status = $1,
      last_tested_at = NOW(),
      last_error_message = $2,
      updated_at = NOW()`,
    [status, errorMessage]
  );

  await query(
    `UPDATE seller_marketplaces SET
      status = $1,
      updated_at = NOW()
     WHERE code = 'AMAZON'`,
    [status === 'CONNECTED' ? 'CONNECTED' : 'NOT_CONNECTED']
  );
};

/**
 * Update last successful sync timestamp.
 */
const updateAmazonLastSyncTimestamp = async () => {
  await query(
    `UPDATE amazon_integrations SET
      last_sync_at = NOW(),
      updated_at = NOW()`
  );
};

module.exports = {
  getAmazonCredentials,
  getAdminAmazonCredentials,
  saveAmazonCredentials,
  updateAmazonConnectionStatus,
  updateAmazonLastSyncTimestamp,
};
