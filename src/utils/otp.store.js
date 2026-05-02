const { query } = require('../config/database');

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const saveOtp = async (email, otp) => {
  await query(
    `INSERT INTO otp_store (email, otp, expires_at, attempts)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
     ON CONFLICT (email) DO UPDATE
     SET otp = $2, expires_at = NOW() + INTERVAL '10 minutes', attempts = 0`,
    [email.toLowerCase(), otp]
  );
    console.log(`Saved OTP for ${email}: ${otp}`) // Debug log
};

const verifyOtp = async (email, otp) => {
  const result = await query(
    `SELECT * FROM otp_store WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0)
    return { valid: false, reason: 'OTP not found or already used' };

  const record = result.rows[0];

  if (new Date() > new Date(record.expires_at)) {
    await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
    return { valid: false, reason: 'OTP expired' };
  }

  if (record.attempts >= 5) {
    await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
    return { valid: false, reason: 'Too many attempts' };
  }

  await query(
    `UPDATE otp_store SET attempts = attempts + 1 WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (record.otp !== otp.toString())
    return { valid: false, reason: 'Invalid OTP' };

  await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
  return { valid: true };
};

module.exports = { generateOtp, saveOtp, verifyOtp };