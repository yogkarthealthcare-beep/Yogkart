const { query, getClient } = require('../../config/database');
const {
  encryptCredential,
  decryptCredential,
  maskCredentialValue,
} = require('../../utils/encryption');

const safeDecrypt = (val) => (val ? decryptCredential(val) : '');
const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Format raw database row into safe admin UI representation.
 */
const formatAdminIntegration = (row) => {
  if (!row) return null;
  const clientId = safeDecrypt(row.client_id_encrypted);
  const clientSecret = safeDecrypt(row.client_secret_encrypted);
  const refreshToken = safeDecrypt(row.refresh_token_encrypted);
  const isConfigured = Boolean(clientId && clientSecret && refreshToken);

  return {
    id: row.id,
    accountName: row.account_name || 'Amazon India Seller Store',
    clientId: clientId || '',
    clientIdMasked: clientId ? maskCredentialValue(clientId, 6) : '',
    clientSecretConfigured: Boolean(clientSecret),
    clientSecretMasked: clientSecret ? maskCredentialValue(clientSecret, 4) : '',
    refreshTokenConfigured: Boolean(refreshToken),
    refreshTokenMasked: refreshToken ? maskCredentialValue(refreshToken, 4) : '',
    marketplaceId: row.marketplace_id || 'A21TJRUUN4KGV',
    region: row.region || 'eu-west-1',
    endpoint: row.endpoint || 'https://sellingpartnerapi-eu.amazon.com',
    sellerId: row.seller_id || '',
    isActive: row.is_active ?? true,
    connectionStatus: row.connection_status || 'NOT_CONNECTED',
    lastTestedAt: row.last_tested_at,
    lastSyncAt: row.last_sync_at,
    lastErrorMessage: row.last_error_message,
    isConfigured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Fetch raw decrypted Amazon SP-API credentials for backend execution only.
 */
const getAmazonCredentials = async ({ integrationId = null, requireConfigured = false } = {}) => {
  let result;
  if (isValidUuid(integrationId)) {
    result = await query(`SELECT * FROM amazon_integrations WHERE id = $1 LIMIT 1`, [integrationId]);
  } else {
    result = await query(`SELECT * FROM amazon_integrations ORDER BY is_active DESC, updated_at DESC, created_at ASC LIMIT 1`);
  }

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
 * Fetch all saved Amazon integrations and active credentials for Admin UI.
 */
const getAdminAmazonCredentials = async ({ integrationId = null } = {}) => {
  const allRes = await query(
    `SELECT * FROM amazon_integrations ORDER BY is_active DESC, updated_at DESC, created_at ASC`
  );

  const integrations = allRes.rows.map(formatAdminIntegration);

  let active = null;
  if (integrationId && isValidUuid(integrationId)) {
    active = integrations.find(i => i.id === integrationId) || null;
  }
  if (!active && integrations.length > 0) {
    active = integrations.find(i => i.isActive) || integrations[0];
  }

  if (!active) {
    active = {
      isConfigured: false,
      accountName: 'Amazon India Seller Store',
      clientId: '',
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
    ...active,
    integrations,
  };
};

/**
 * Save / Update Amazon SP-API credentials in database.
 * Supports multiple accounts, updating existing by ID or adding new.
 */
const saveAmazonCredentials = async (payload, adminId = null) => {
  const targetId = isValidUuid(payload.id) ? payload.id : null;
  const isNew = payload.isNew === true || payload.id === 'new';

  let existing = null;
  if (targetId && !isNew) {
    const existingRes = await query('SELECT * FROM amazon_integrations WHERE id = $1', [targetId]);
    if (existingRes.rows.length) {
      existing = existingRes.rows[0];
    }
  }
  if (!existing && !isNew) {
    const latestRes = await query('SELECT * FROM amazon_integrations ORDER BY is_active DESC, updated_at DESC LIMIT 1');
    if (latestRes.rows.length) {
      existing = latestRes.rows[0];
    }
  }

  const existingClientId = existing ? safeDecrypt(existing.client_id_encrypted) : '';
  const existingClientSecret = existing ? safeDecrypt(existing.client_secret_encrypted) : '';
  const existingRefreshToken = existing ? safeDecrypt(existing.refresh_token_encrypted) : '';

  const accountName = String(payload.accountName || existing?.account_name || 'Amazon India Seller Store').trim();
  const marketplaceId = String(payload.marketplaceId || existing?.marketplace_id || 'A21TJRUUN4KGV').trim();
  const region = String(payload.region || existing?.region || 'eu-west-1').trim();
  const endpoint = String(payload.endpoint || existing?.endpoint || 'https://sellingpartnerapi-eu.amazon.com').trim();
  const sellerId = String(payload.sellerId !== undefined ? payload.sellerId : (existing?.seller_id || '')).trim();
  const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : true;

  // Preserve existing secret values if user left them empty / masked
  const clientId = payload.clientId && !payload.clientId.includes('••••') && !payload.clientId.includes('****')
    ? String(payload.clientId).trim()
    : existingClientId;

  const clientSecret = payload.clientSecret && !payload.clientSecret.includes('••••') && !payload.clientSecret.includes('****')
    ? String(payload.clientSecret).trim()
    : existingClientSecret;

  const refreshToken = payload.refreshToken && !payload.refreshToken.includes('••••') && !payload.refreshToken.includes('****')
    ? String(payload.refreshToken).trim()
    : existingRefreshToken;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let validAdminId = null;
    if (isValidUuid(adminId)) {
      const adminCheck = await client.query('SELECT id FROM admins WHERE id = $1', [adminId]);
      if (adminCheck.rows.length) validAdminId = adminId;
    }

    let savedId = null;

    if (existing?.id && !isNew) {
      const updateRes = await client.query(
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
        RETURNING id`,
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
          validAdminId,
          existing.id,
        ]
      );
      savedId = updateRes.rows[0]?.id || existing.id;
    } else {
      const insertRes = await client.query(
        `INSERT INTO amazon_integrations (
          account_name, client_id_encrypted, client_secret_encrypted,
          refresh_token_encrypted, marketplace_id, region, endpoint,
          seller_id, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
        RETURNING id`,
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
          validAdminId,
        ]
      );
      savedId = insertRes.rows[0]?.id;
    }

    const isNowConfigured = Boolean(clientId && clientSecret && refreshToken);
    await client.query(
      `UPDATE seller_marketplaces
       SET status = $1, updated_at = NOW()
       WHERE code = 'AMAZON'`,
      [isNowConfigured ? 'CONNECTED' : 'NOT_CONNECTED']
    );

    await client.query('COMMIT');
    return await getAdminAmazonCredentials({ integrationId: savedId });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Delete a saved Amazon integration by ID.
 */
const deleteAmazonIntegration = async (id) => {
  if (!isValidUuid(id)) {
    const error = new Error('Invalid integration ID');
    error.status = 400;
    throw error;
  }
  await query('DELETE FROM amazon_integrations WHERE id = $1', [id]);
  return await getAdminAmazonCredentials();
};

/**
 * Update Amazon connection status in database after test / sync.
 */
const updateAmazonConnectionStatus = async (status, errorMessage = null, integrationId = null) => {
  if (isValidUuid(integrationId)) {
    await query(
      `UPDATE amazon_integrations SET
        connection_status = $1,
        last_tested_at = NOW(),
        last_error_message = $2,
        updated_at = NOW()
      WHERE id = $3`,
      [status, errorMessage, integrationId]
    );
  } else {
    await query(
      `UPDATE amazon_integrations SET
        connection_status = $1,
        last_tested_at = NOW(),
        last_error_message = $2,
        updated_at = NOW()`,
      [status, errorMessage]
    );
  }

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
const updateAmazonLastSyncTimestamp = async (integrationId = null) => {
  if (isValidUuid(integrationId)) {
    await query(
      `UPDATE amazon_integrations SET
        last_sync_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [integrationId]
    );
  } else {
    await query(
      `UPDATE amazon_integrations SET
        last_sync_at = NOW(),
        updated_at = NOW()`
    );
  }
};

module.exports = {
  getAmazonCredentials,
  getAdminAmazonCredentials,
  saveAmazonCredentials,
  deleteAmazonIntegration,
  updateAmazonConnectionStatus,
  updateAmazonLastSyncTimestamp,
};
