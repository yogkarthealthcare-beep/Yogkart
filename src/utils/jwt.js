const jwt   = require('jsonwebtoken');
const { query } = require('../config/database');

// ✅ Fallback — Vercel pe env variable nahi milti toh hardcoded use karo
const JWT_SECRET          = process.env.JWT_SECRET          || '9f3b2c7a8e4d6f1a5b9c0d2e7f8a1b3c4d6e8f0a2b5c7d9e1f3a6b8c0d2e4f6a';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || '7c1e4a9f2b6d8c3e5f0a1d9b4c7e2f6a8b3d0c5e9f1a7b2c4d6e8f0a3b5c9d1';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '7d';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
};

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
};

const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  const result  = await query(
    `SELECT * FROM refresh_tokens
     WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
    [token, decoded.id]
  );
  if (result.rows.length === 0) throw new Error('Invalid or expired refresh token');
  return decoded;
};

const revokeRefreshToken = async (token) => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

const revokeAllUserTokens = async (userId) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};