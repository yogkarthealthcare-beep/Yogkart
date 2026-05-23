/**
 * auth.controller.js — Yogkart Healthcare
 *
 * SIGNUP FLOW:
 *   POST /api/auth/signup-init    → pending_users mein rakho + OTP bhejo
 *   POST /api/auth/signup-verify  → OTP verify → users mein move karo
 *   POST /api/auth/resend-otp     → OTP dobara bhejo
 *
 * FORGOT PASSWORD:
 *   POST /api/auth/send-otp       → OTP bhejo
 *   POST /api/auth/verify-otp     → OTP verify karo
 *   POST /api/auth/reset-password → naya password set karo
 *
 * LOGIN:
 *   POST /api/auth/login
 */

const bcrypt    = require('bcryptjs');
const https     = require('https');
const { query } = require('../config/database');
const {
  generateAccessToken, generateRefreshToken,
  saveRefreshToken, verifyRefreshToken,
  revokeRefreshToken, revokeAllUserTokens,
} = require('../utils/jwt');
const { generateOtp, saveOtp, verifyOtp } = require('../utils/otp.store');
const { sendEmail }  = require('../utils/email.service');
const { success, created, error, unauthorized, badRequest, notFound } = require('../utils/response');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const userShape = (u, extra = {}) => ({
  id:                 u.id,
  name:               u.name,
  email:              u.email,
  phone:              u.phone              || null,
  role:               u.role              || 'customer',
  avatar:             u.avatar            || null,
  provider:           u.provider          || 'local',
  isTemporaryData:    u.is_temporary_data  ?? false,
  isProfileCompleted: u.is_profile_completed ?? true,
  ...extra,
});

// ── SIGNUP Step 1 ─────────────────────────────────────────
const signupInit = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password)
      return badRequest(res, 'Name, email aur password required hain');
    if (password.length < 6)
      return badRequest(res, 'Password kam se kam 6 characters ka hona chahiye');

    const emailClean = email.toLowerCase().trim();

    const existing = await query('SELECT id FROM users WHERE email = $1', [emailClean]);
    if (existing.rows.length > 0)
      return badRequest(res, 'Yeh email already registered hai');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const otp          = generateOtp();

    await query(
      `INSERT INTO pending_users (name, email, phone, password_hash, otp, otp_expires_at, attempts)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, phone = EXCLUDED.phone,
             password_hash = EXCLUDED.password_hash,
             otp = EXCLUDED.otp,
             otp_expires_at = NOW() + INTERVAL '10 minutes',
             attempts = 0, created_at = NOW()`,
      [name.trim(), emailClean, phone || null, passwordHash, otp]
    );

    await sendEmail({ type: 'otp', to: emailClean, data: { name: name.trim(), otp } });

    return success(res, { email: emailClean },
      'OTP bhej diya gaya — 10 minutes valid hai');

  } catch (err) {
    console.error('signupInit error:', err.message);
    return error(res, 'Signup shuru karne mein error aaya');
  }
};

// ── SIGNUP Step 2 ─────────────────────────────────────────
const signupVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return badRequest(res, 'Email aur OTP required hain');

    const emailClean = email.toLowerCase().trim();

    const pendingResult = await query(
      'SELECT * FROM pending_users WHERE email = $1', [emailClean]
    );
    if (pendingResult.rows.length === 0)
      return badRequest(res, 'Signup request nahi mili — dobara signup karein');

    const pending = pendingResult.rows[0];

    if (new Date() > new Date(pending.otp_expires_at)) {
      await query('DELETE FROM pending_users WHERE email = $1', [emailClean]);
      return badRequest(res, 'OTP expire ho gaya — dobara signup karein');
    }

    if (pending.attempts >= 5) {
      await query('DELETE FROM pending_users WHERE email = $1', [emailClean]);
      return badRequest(res, 'Zyada galat attempts — dobara signup karein');
    }

    if (pending.otp !== otp.toString().trim()) {
      await query(
        'UPDATE pending_users SET attempts = attempts + 1 WHERE email = $1', [emailClean]
      );
      const remaining = 5 - (pending.attempts + 1);
      return badRequest(res, `Galat OTP — ${remaining} attempts baaki hain`);
    }

    // OTP sahi — users mein move karo
    const alreadyExists = await query('SELECT id FROM users WHERE email = $1', [emailClean]);
    if (alreadyExists.rows.length > 0) {
      await query('DELETE FROM pending_users WHERE email = $1', [emailClean]);
      return badRequest(res, 'Yeh email already registered hai — login karein');
    }

    const userResult = await query(
      `INSERT INTO users (name, email, phone, password_hash, is_verified, provider)
       VALUES ($1, $2, $3, $4, TRUE, 'local')
       RETURNING id, name, email, phone, role, avatar, is_verified, created_at`,
      [pending.name, emailClean, pending.phone, pending.password_hash]
    );
    const user = userResult.rows[0];

    await query('DELETE FROM pending_users WHERE email = $1', [emailClean]);

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    sendEmail({ type: 'welcome', to: emailClean, data: { name: user.name } })
      .catch(e => console.warn('Welcome email failed:', e.message));

    return created(res, {
      user: userShape(user), accessToken, refreshToken,
    }, 'Account ban gaya — Yogkart mein aapka swagat hai!');

  } catch (err) {
    console.error('signupVerify error:', err.message);
    return error(res, 'OTP verification mein error aaya');
  }
};

// ── RESEND OTP ────────────────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const { email, type = 'signup' } = req.body;
    if (!email) return badRequest(res, 'Email required hai');

    const emailClean = email.toLowerCase().trim();
    const newOtp     = generateOtp();

    if (type === 'signup') {
      const result = await query(
        `UPDATE pending_users
         SET otp = $1, otp_expires_at = NOW() + INTERVAL '10 minutes', attempts = 0
         WHERE email = $2 RETURNING name`,
        [newOtp, emailClean]
      );
      if (result.rows.length === 0)
        return badRequest(res, 'Signup request nahi mili — dobara signup karein');

      await sendEmail({ type: 'otp', to: emailClean, data: { name: result.rows[0].name, otp: newOtp } });

    } else {
      const userResult = await query(
        'SELECT name FROM users WHERE email = $1 AND is_active = TRUE', [emailClean]
      );
      if (userResult.rows.length === 0)
        return success(res, null, 'Agar email registered hai toh OTP bheja jaayega');

      await saveOtp(emailClean, newOtp);
      await sendEmail({ type: 'password_reset', to: emailClean, data: { name: userResult.rows[0].name, otp: newOtp } });
    }

    return success(res, null, 'Naya OTP bhej diya gaya');
  } catch (err) {
    console.error('resendOtp error:', err.message);
    return error(res, 'OTP bhejne mein error aaya');
  }
};

// ── LOGIN ─────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return badRequest(res, 'Email aur password required hain');

    const emailClean = email.toLowerCase().trim();
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [emailClean]
    );
    if (result.rows.length === 0) return unauthorized(res, 'Email ya password galat hai');

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return unauthorized(res, 'Email ya password galat hai');

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    return success(res, { user: userShape(user), accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err.message);
    return error(res, 'Login mein error aaya');
  }
};

// ── FORGOT PASSWORD Step 1: OTP bhejo ────────────────────
const sendOtp = async (req, res) => {
  try {
    const { email, type = 'email_verify' } = req.body;
    if (!email) return badRequest(res, 'Email required hai');

    const emailClean = email.toLowerCase().trim();

    if (type === 'password_reset') {
      const userResult = await query(
        'SELECT id, name FROM users WHERE email = $1 AND is_active = TRUE', [emailClean]
      );
      if (userResult.rows.length === 0)
        return success(res, null, 'Agar email registered hai toh OTP bheja jaayega');

      const otp = generateOtp();
      await saveOtp(emailClean, otp);
      await sendEmail({ type: 'password_reset', to: emailClean, data: { name: userResult.rows[0].name, otp } });
      return success(res, null, 'Password reset OTP bhej diya gaya');
    }

    const otp = generateOtp();
    await saveOtp(emailClean, otp);
    await sendEmail({ type: 'otp', to: emailClean, data: { name: 'User', otp } });
    return success(res, null, 'OTP bhej diya gaya — 10 minutes valid hai');

  } catch (err) {
    console.error('sendOtp error:', err.message);
    return error(res, 'OTP bhejne mein error aaya');
  }
};

// ── FORGOT PASSWORD Step 2: OTP verify ───────────────────
const verifyOtpHandler = async (req, res) => {
  try {
    const { email, otp, purpose = 'email_verify' } = req.body;
    if (!email || !otp) return badRequest(res, 'Email aur OTP required hain');

    const emailClean = email.toLowerCase().trim();
    const result     = await verifyOtp(emailClean, otp);
    if (!result.valid) return badRequest(res, result.reason);

    if (purpose === 'password_reset') {
      await saveOtp(`reset_${emailClean}`, 'GRANTED');
      return success(res, { resetGranted: true }, 'OTP verify ho gaya — ab naya password set karein');
    }

    await query(
      'UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE email = $1', [emailClean]
    );
    return success(res, { verified: true }, 'Email verify ho gaya');

  } catch (err) {
    console.error('verifyOtpHandler error:', err.message);
    return error(res, 'OTP verify karne mein error aaya');
  }
};

// ── FORGOT PASSWORD Step 3: Password reset ───────────────
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return badRequest(res, 'Email aur newPassword required hain');
    if (newPassword.length < 6)  return badRequest(res, 'Password kam se kam 6 characters ka hona chahiye');

    const emailClean = email.toLowerCase().trim();

    const grant = await verifyOtp(`reset_${emailClean}`, 'GRANTED');
    if (!grant.valid)
      return badRequest(res, 'Reset session expire ho gaya — dobara OTP request karein');

    const hash   = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const result = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE email = $2 RETURNING id, name, email`,
      [hash, emailClean]
    );
    if (result.rows.length === 0) return notFound(res, 'User nahi mila');

    await query('DELETE FROM otp_store WHERE email = $1', [`reset_${emailClean}`]);
    await revokeAllUserTokens(result.rows[0].id);

    sendEmail({ type: 'password_changed', to: emailClean, data: { name: result.rows[0].name } })
      .catch(e => console.warn('Password changed email failed:', e.message));

    return success(res, null, 'Password reset ho gaya — ab naye password se login karein');

  } catch (err) {
    console.error('resetPassword error:', err.message);
    return error(res, 'Password reset mein error aaya');
  }
};

// ── REFRESH / LOGOUT / PROFILE ────────────────────────────
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token required hai');
    const decoded = await verifyRefreshToken(refreshToken);
    const result  = await query(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );
    if (result.rows.length === 0) return unauthorized(res, 'User nahi mila');
    const user = result.rows[0];
    await revokeRefreshToken(refreshToken);
    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, newRefreshToken);
    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) { return unauthorized(res, 'Invalid ya expired refresh token'); }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    return success(res, null, 'Logout successful');
  } catch (err) { return error(res, 'Logout mein error aaya'); }
};

const logoutAll = async (req, res) => {
  try {
    await revokeAllUserTokens(req.user.id);
    return success(res, null, 'Sab devices se logout ho gaye');
  } catch (err) { return error(res, 'Logout mein error aaya'); }
};

const me = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, avatar, provider, google_id,
              is_temporary_data, is_profile_completed, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return notFound(res, 'User nahi mila');
    return success(res, { user: userShape(result.rows[0]) });
  } catch (err) { return error(res, 'Profile fetch karne mein error aaya'); }
};

const updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const result = await query(
      `UPDATE users SET name=$1, phone=$2,
       is_temporary_data=FALSE, is_profile_completed=TRUE, updated_at=NOW()
       WHERE id=$3
       RETURNING id, name, email, phone, role, avatar, is_temporary_data, is_profile_completed`,
      [name.trim(), phone || null, req.user.id]
    );
    return success(res, { user: userShape(result.rows[0]) }, 'Profile update ho gaya');
  } catch (err) { return error(res, 'Profile update mein error aaya'); }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid  = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return badRequest(res, 'Current password galat hai');
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    await revokeAllUserTokens(req.user.id);
    return success(res, null, 'Password change ho gaya — dobara login karein');
  } catch (err) { return error(res, 'Password change mein error aaya'); }
};

// ── SOCIAL LOGIN ──────────────────────────────────────────
const linkedinApiRequest = (url, method = 'GET', body = null, accessToken = null) => {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const headers    = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(body); }
    const req = https.request(requestUrl, { method, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(new Error(`LinkedIn API ${res.statusCode}: ${json.error_description || data}`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
};

const exchangeLinkedInCode = async (code) => {
  const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI } = process.env;
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: LINKEDIN_REDIRECT_URI, client_id: LINKEDIN_CLIENT_ID, client_secret: LINKEDIN_CLIENT_SECRET }).toString();
  const tokenRes = await linkedinApiRequest('https://www.linkedin.com/oauth/v2/accessToken', 'POST', body);
  if (!tokenRes.access_token) throw new Error('LinkedIn access token nahi mila');
  return tokenRes.access_token;
};

const fetchLinkedInProfile = async (accessToken) => {
  const u = await linkedinApiRequest('https://api.linkedin.com/v2/userinfo', 'GET', null, accessToken);
  return { id: u.sub, email: u.email, name: u.name || `${u.given_name || ''} ${u.family_name || ''}`.trim(), avatar: u.picture || null };
};

const socialLogin = async (req, res) => {
  try {
    const { uid, email: bodyEmail, name: bodyName, photoUrl, accessToken: firebaseToken, code } = req.body;
    const provider = req.params.provider;
    let email = bodyEmail, name = bodyName, avatar = photoUrl, socialUid = uid, accessToken = firebaseToken;

    if (provider === 'linkedin' && (code || accessToken)) {
      if (!accessToken) accessToken = await exchangeLinkedInCode(code);
      const li = await fetchLinkedInProfile(accessToken);
      if (!li?.email || !li?.name) return badRequest(res, 'LinkedIn se email/name nahi mila');
      email = li.email; name = li.name; avatar = avatar || li.avatar; socialUid = socialUid || li.id || `li_${Date.now()}`;
    }

    if (!email || !name || !socialUid) return badRequest(res, 'name, email aur uid required hain');

    const emailClean = email.toLowerCase().trim();
    const exists = await query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [emailClean]);
    let user;

    if (exists.rows.length > 0) {
      user = exists.rows[0];
      try { if (avatar) { await query('UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2', [avatar, user.id]); } } catch { }
    } else {
      const autoPassword = `Yk@${(socialUid || '').slice(0, 8)}#9${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(autoPassword, BCRYPT_ROUNDS);
      try {
        const result = await query(
          `INSERT INTO users (name, email, phone, password_hash, avatar, provider, is_verified, is_temporary_data, is_profile_completed)
           VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,TRUE) RETURNING id, name, email, phone, role, avatar, is_temporary_data, is_profile_completed`,
          [name.trim(), emailClean, null, passwordHash, avatar || null, provider]
        );
        user = result.rows[0];
      } catch {
        const result = await query(
          `INSERT INTO users (name, email, phone, password_hash, is_verified) VALUES ($1,$2,$3,$4,TRUE) RETURNING id, name, email, phone, role`,
          [name.trim(), emailClean, null, passwordHash]
        );
        user = result.rows[0];
      }
    }

    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, newRefreshToken);

    return success(res, {
      user: userShape(user, { avatar: user.avatar || avatar || null }),
      accessToken: newAccessToken, refreshToken: newRefreshToken,
    }, exists.rows.length > 0 ? 'Login successful' : 'Account ban gaya');

  } catch (err) {
    console.error('Social login error:', err.message);
    return error(res, 'Social login failed');
  }
};

// ── OLD register — backward compat ─────────────────────────
// Ab signupInit + signupVerify use karo
// Yeh purane flow ke liye rakha hai
const register = signupInit;

module.exports = {
  register, signupInit, signupVerify, resendOtp,
  login, refresh, logout, logoutAll,
  me, updateMe, changePassword,
  sendOtp, verifyOtpHandler, resetPassword,
  socialLogin,
};