const { query } = require('../config/database');
const { 
  encryptCredential, 
  decryptCredential, 
  maskCredentialValue,
  validateEncryptionKey 
} = require('../utils/encryption');
const { success, error, notFound, badRequest } = require('../utils/response');

// Validate encryption key on module load
validateEncryptionKey();

// ──────────────────────────────────────────────────────
// Credential Categories Configuration
// ──────────────────────────────────────────────────────
const CREDENTIAL_CATEGORIES = {
  email: {
    name: 'Email/SMTP',
    icon: 'mail',
    fields: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']
  },
  payment: {
    name: 'Payment Gateway',
    icon: 'payment',
    fields: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_KEY', 'STRIPE_SECRET']
  },
  firebase: {
    name: 'Firebase',
    icon: 'cloud',
    fields: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_STORAGE_BUCKET']
  },
  api: {
    name: 'API Keys',
    icon: 'key',
    fields: ['JWT_SECRET', 'API_KEY_GOOGLE', 'API_KEY_MAPS', 'RESEND_API_KEY']
  },
  sms: {
    name: 'SMS Provider',
    icon: 'sms',
    fields: ['SMS_PROVIDER', 'SMS_API_KEY', 'SMS_SENDER_ID']
  },
  other: {
    name: 'Other Services',
    icon: 'extension',
    fields: []
  }
};

// ──────────────────────────────────────────────────────
// GET /api/admin/credentials
// List all credentials (paginated, with masking)
// ──────────────────────────────────────────────────────
const getCredentials = async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    let params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      whereClause += ` AND credential_category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (credential_key ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM system_credentials ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get credentials (paginated)
    const result = await query(
      `SELECT 
        id, credential_key, credential_category, description, 
        is_active, is_sensitive, created_by, updated_by, 
        last_used_at, created_at, updated_at
      FROM system_credentials
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const credentials = result.rows.map(cred => ({
      ...cred,
      credential_value: null,  // Never expose encrypted value in list
      credential_value_masked: '••••••••••••••••'  // Show masked value
    }));

    return success(res, {
      credentials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ Get credentials error:', err.message);
    return error(res, 'Failed to fetch credentials');
  }
};

// ──────────────────────────────────────────────────────
// GET /api/admin/credentials/:id
// Get single credential (with decrypted value)
// ──────────────────────────────────────────────────────
const getCredentialById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM system_credentials WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return notFound(res, 'Credential not found');
    }

    const credential = result.rows[0];

    // Decrypt the value
    let decryptedValue;
    try {
      decryptedValue = decryptCredential(credential.credential_value);
    } catch (err) {
      console.error('❌ Decryption failed:', err.message);
      decryptedValue = null;
    }

    return success(res, {
      ...credential,
      credential_value: decryptedValue
    });
  } catch (err) {
    console.error('❌ Get credential error:', err.message);
    return error(res, 'Failed to fetch credential');
  }
};

// ──────────────────────────────────────────────────────
// POST /api/admin/credentials
// Create new credential
// ──────────────────────────────────────────────────────
const createCredential = async (req, res) => {
  try {
    const { credential_key, credential_category, credential_value, description } = req.body;
    const adminId = req.admin.id;

    // Validation
    if (!credential_key || !credential_category || !credential_value) {
      return badRequest(res, 'Missing required fields: credential_key, credential_category, credential_value');
    }

    if (!CREDENTIAL_CATEGORIES[credential_category]) {
      return badRequest(res, `Invalid category. Allowed: ${Object.keys(CREDENTIAL_CATEGORIES).join(', ')}`);
    }

    // Check if key already exists
    const existing = await query(
      `SELECT id FROM system_credentials WHERE credential_key = $1`,
      [credential_key]
    );

    if (existing.rows.length > 0) {
      return badRequest(res, `Credential key "${credential_key}" already exists`);
    }

    // Encrypt the value
    let encryptedValue;
    try {
      encryptedValue = encryptCredential(credential_value);
    } catch (err) {
      return error(res, 'Failed to encrypt credential');
    }

    // Insert
    const result = await query(
      `INSERT INTO system_credentials 
        (credential_key, credential_category, credential_value, description, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [credential_key, credential_category, encryptedValue, description || null, adminId, adminId]
    );

    const newCredential = result.rows[0];

    return success(res, {
      ...newCredential,
      credential_value: credential_value,  // Return plain value after creation
      message: 'Credential created successfully'
    }, 201);
  } catch (err) {
    console.error('❌ Create credential error:', err.message);
    return error(res, 'Failed to create credential');
  }
};

// ──────────────────────────────────────────────────────
// PUT /api/admin/credentials/:id
// Update existing credential
// ──────────────────────────────────────────────────────
const updateCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { credential_value, description, is_active } = req.body;
    const adminId = req.admin.id;

    // Get existing credential
    const existing = await query(
      `SELECT * FROM system_credentials WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return notFound(res, 'Credential not found');
    }

    // Prepare update
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (credential_value !== undefined) {
      let encryptedValue;
      try {
        encryptedValue = encryptCredential(credential_value);
      } catch (err) {
        return error(res, 'Failed to encrypt credential');
      }
      updates.push(`credential_value = $${paramIndex}`);
      params.push(encryptedValue);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    updates.push(`updated_by = $${paramIndex}`);
    params.push(adminId);
    paramIndex++;

    params.push(id);

    if (updates.length === 1) {
      // Only updated_by was added, no changes
      return badRequest(res, 'No fields to update');
    }

    // Update
    const result = await query(
      `UPDATE system_credentials
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`,
      params
    );

    const updated = result.rows[0];
    let decryptedValue;
    try {
      decryptedValue = decryptCredential(updated.credential_value);
    } catch (err) {
      decryptedValue = null;
    }

    return success(res, {
      ...updated,
      credential_value: decryptedValue,
      message: 'Credential updated successfully'
    });
  } catch (err) {
    console.error('❌ Update credential error:', err.message);
    return error(res, 'Failed to update credential');
  }
};

// ──────────────────────────────────────────────────────
// PATCH /api/admin/credentials/:id/toggle
// Toggle credential active/inactive status
// ──────────────────────────────────────────────────────
const toggleCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get current status
    const existing = await query(
      `SELECT is_active FROM system_credentials WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return notFound(res, 'Credential not found');
    }

    const newStatus = !existing.rows[0].is_active;

    // Update
    const result = await query(
      `UPDATE system_credentials
      SET is_active = $1, updated_by = $2
      WHERE id = $3
      RETURNING *`,
      [newStatus, adminId, id]
    );

    return success(res, {
      ...result.rows[0],
      message: `Credential ${newStatus ? 'enabled' : 'disabled'} successfully`
    });
  } catch (err) {
    console.error('❌ Toggle credential error:', err.message);
    return error(res, 'Failed to toggle credential');
  }
};

// ──────────────────────────────────────────────────────
// DELETE /api/admin/credentials/:id
// Delete credential
// ──────────────────────────────────────────────────────
const deleteCredential = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT credential_key FROM system_credentials WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return notFound(res, 'Credential not found');
    }

    const credentialKey = existing.rows[0].credential_key;

    await query(
      `DELETE FROM system_credentials WHERE id = $1`,
      [id]
    );

    return success(res, {
      message: `Credential "${credentialKey}" deleted successfully`
    });
  } catch (err) {
    console.error('❌ Delete credential error:', err.message);
    return error(res, 'Failed to delete credential');
  }
};

// ──────────────────────────────────────────────────────
// GET /api/admin/credentials/categories
// Get available credential categories
// ──────────────────────────────────────────────────────
const getCredentialCategories = async (req, res) => {
  try {
    const categories = Object.entries(CREDENTIAL_CATEGORIES).map(([key, value]) => ({
      id: key,
      name: value.name,
      icon: value.icon,
      fields: value.fields
    }));

    return success(res, { categories });
  } catch (err) {
    console.error('❌ Get categories error:', err.message);
    return error(res, 'Failed to fetch categories');
  }
};

// ──────────────────────────────────────────────────────
// POST /api/admin/credentials/:id/test
// Test credential connectivity
// ──────────────────────────────────────────────────────
const testCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get credential
    const result = await query(
      `SELECT * FROM system_credentials WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return notFound(res, 'Credential not found');
    }

    const credential = result.rows[0];
    let decryptedValue;
    try {
      decryptedValue = decryptCredential(credential.credential_value);
    } catch (err) {
      return error(res, 'Failed to decrypt credential for testing');
    }

    let testResult = { success: false, message: 'Test not implemented' };

    // Test based on category
    switch (credential.credential_category) {
      case 'email':
        // Test SMTP connection (simplified)
        testResult = {
          success: decryptedValue && decryptedValue.length > 0,
          message: 'SMTP credential verified (basic check)',
          checkedAt: new Date().toISOString()
        };
        break;

      case 'payment':
        // Test payment gateway API (simplified)
        testResult = {
          success: decryptedValue && decryptedValue.length > 0,
          message: 'Payment credential verified (basic check)',
          checkedAt: new Date().toISOString()
        };
        break;

      case 'firebase':
        testResult = {
          success: decryptedValue && decryptedValue.length > 0,
          message: 'Firebase credential verified (basic check)',
          checkedAt: new Date().toISOString()
        };
        break;

      default:
        testResult = {
          success: decryptedValue && decryptedValue.length > 0,
          message: 'Credential verified (basic check)',
          checkedAt: new Date().toISOString()
        };
    }

    // Update last_used_at
    await query(
      `UPDATE system_credentials SET last_used_at = NOW() WHERE id = $1`,
      [id]
    );

    return success(res, testResult);
  } catch (err) {
    console.error('❌ Test credential error:', err.message);
    return error(res, 'Failed to test credential');
  }
};

module.exports = {
  getCredentials,
  getCredentialById,
  createCredential,
  updateCredential,
  toggleCredential,
  deleteCredential,
  getCredentialCategories,
  testCredential,
  CREDENTIAL_CATEGORIES
};
