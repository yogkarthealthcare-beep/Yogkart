const crypto = require('crypto');

// ─────────────────────────────────────────────────────
// ENCRYPTION UTILITY FOR CREDENTIALS
// Uses AES-256-GCM for authenticated encryption
// ─────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const buildEncryptionKey = () => {
  const configured = process.env.ENCRYPTION_KEY;
  if (!configured) return null;
  if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
  if (Buffer.byteLength(configured, 'utf8') === 32) return Buffer.from(configured, 'utf8');
  return crypto.createHash('sha256').update(configured, 'utf8').digest();
};

const ENCRYPTION_KEY = buildEncryptionKey();
const ENCODING = 'hex';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

// ──────────────────────────────────────────────────────
// Encrypt plaintext credential value
// ──────────────────────────────────────────────────────
const encryptCredential = (plaintext) => {
  try {
    if (!plaintext) return null;
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not configured');

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt
    let encrypted = cipher.update(String(plaintext), 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data (all hex encoded)
    return iv.toString(ENCODING) + ':' + authTag.toString(ENCODING) + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
    throw new Error('Failed to encrypt credential');
  }
};

// ──────────────────────────────────────────────────────
// Decrypt encrypted credential value
// ──────────────────────────────────────────────────────
const decryptCredential = (encryptedData) => {
  try {
    if (!encryptedData) return null;
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not configured');

    // Split IV, authTag, and encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], ENCODING);
    const authTag = Buffer.from(parts[1], ENCODING);
    const encrypted = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    throw new Error('Failed to decrypt credential');
  }
};

// ──────────────────────────────────────────────────────
// Mask credential value for display (show only last 4 chars)
// ──────────────────────────────────────────────────────
const maskCredentialValue = (value, showLength = 4) => {
  if (!value || value.length <= showLength) return '••••••';
  const visible = value.slice(-showLength);
  const masked = '*'.repeat(Math.max(4, value.length - showLength));
  return masked + visible;
};

// ──────────────────────────────────────────────────────
// Validate encryption key exists
// ──────────────────────────────────────────────────────
const validateEncryptionKey = () => {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY must be configured before encrypted credentials can be used');
  }
};

module.exports = {
  encryptCredential,
  decryptCredential,
  maskCredentialValue,
  validateEncryptionKey,
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH
};
