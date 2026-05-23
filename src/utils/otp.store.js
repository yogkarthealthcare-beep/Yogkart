const { query } = require('../config/database');

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const saveOtp = async (email, otp) => {
  try {
    await query(
      `INSERT INTO otp_store (email, otp, expires_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (email) DO UPDATE
       SET otp = $2,
       expires_at = NOW() + INTERVAL '10 minutes',
       attempts = 0;`,
      [email.toLowerCase(), otp]
    );
    console.log(`OTP saved for ${email}`);
  } catch (err) {
    console.error('Error saving OTP:', err.message);
    throw new Error('Failed to save OTP');
  }
};

const verifyOtp = async (email, otp) => {
  const result = await query(
    `SELECT * FROM otp_store WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0)
    return { valid: false, reason: 'OTP not found or already used' };

  const record = result.rows[0];

  // ✅ FIX 1: Expire check
  if (new Date() > new Date(record.expires_at)) {
    await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
    return { valid: false, reason: 'OTP expired' };
  }

  // ✅ FIX 2: Attempts check PEHLE karo, fir increment
  if (record.attempts >= 5) {
    await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
    return { valid: false, reason: 'Too many attempts. Please request a new OTP.' };
  }

  // ✅ FIX 3: Pehle OTP match karo, TABHI attempts increment karo
  if (record.otp !== otp.toString()) {
    await query(
      `UPDATE otp_store SET attempts = attempts + 1 WHERE email = $1`,
      [email.toLowerCase()]
    );
    return { valid: false, reason: 'Invalid OTP' };
  }

  // OTP sahi hai — record delete karo
  await query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
  return { valid: true };
};

module.exports = { generateOtp, saveOtp, verifyOtp };