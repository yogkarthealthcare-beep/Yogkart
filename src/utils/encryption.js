const crypto = require('crypto');

// ─────────────────────────────────────────────────────
// ENCRYPTION UTILITY FOR CREDENTIALS
// Uses AES-256-GCM for authenticated encryption
// ─────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ENCODING = 'hex';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

// ──────────────────────────────────────────────────────
// Encrypt plaintext credential value
// ──────────────────────────────────────────────────────
const encryptCredential = (plaintext) => {
  try {
    if (!plaintext) return null;

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
    console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in .env. Using random key.');
    console.warn('⚠️  This will cause decryption to fail if the app restarts.');
    console.warn('⚠️  Set ENCRYPTION_KEY=<32-byte-hex-key> in your .env file');
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
