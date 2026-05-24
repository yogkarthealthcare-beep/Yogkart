// src/controllers/google-auth.controller.js
/**
 * Google Auth Controller
 * ──────────────────────
 * POST /api/auth/google
 * Body: { idToken: string }
 *
 * Handles Google OAuth login and registration.
 * Verifies both standard Google ID tokens & Firebase ID tokens.
 * Auto-links accounts, generates dummy data for missing fields,
 * and tracks temporary data / profile-completion status.
 */

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { verifyGoogleToken } = require('../utils/googleTokenVerifier');
const { generateDummyPhone, generateDummyName } = require('../utils/dummyGenerator');
const {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
} = require('../utils/jwt');
const { sendEmail } = require('../utils/email.service');
const { success, badRequest, error } = require('../utils/response');

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return badRequest(res, 'Google idToken required');

    // ── Step 1: Verify Google / Firebase token ─────────────────────────────
    let tokenData;
    try {
      tokenData = await verifyGoogleToken(idToken);
    } catch (verifyErr) {
      console.error('Google token verify failed:', verifyErr.message);
      return badRequest(res, 'Invalid Google token');
    }

    const { uid: googleId, email, name: rawName, picture: avatar, email_verified } = tokenData;

    if (!email) {
      return badRequest(res, 'Could not retrieve email from Google token');
    }
    if (!email_verified) {
      return badRequest(res, 'Google account email is not verified');
    }

    const cleanEmail = email.toLowerCase().trim();

    // Derive display name; flag as temporary when we had to generate one
    const resolvedName = rawName ? rawName.trim() : generateDummyName(cleanEmail);
    const isTemporaryData = !rawName;
    const isProfileCompleted = !isTemporaryData;

    // ── Step 2: Find or create user ────────────────────────────────────────
    const existing = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [cleanEmail]
    );

    let user;
    let isNewUser = false;

    if (existing.rows.length > 0) {
      // CASE A: Existing user — log in and link Google account if not already linked
      user = existing.rows[0];

      try {
        await query(
          `UPDATE users
           SET google_id   = COALESCE(google_id, $1),
               provider    = COALESCE(provider,  'GOOGLE'),
               avatar      = COALESCE(avatar,    $2),
               updated_at  = NOW()
           WHERE id = $3`,
          [googleId || null, avatar || null, user.id]
        );
        // Refresh local user object so response reflects any updates
        const refreshed = await query('SELECT * FROM users WHERE id = $1', [user.id]);
        user = refreshed.rows[0];
      } catch (updateErr) {
        // Column may not exist in older schema — non-fatal
        console.warn('Could not update google_id/avatar:', updateErr.message);
      }

    } else {
      // CASE B: New user — auto-register
      isNewUser = true;

      // Generate a secure random password (user can set/reset later)
      const randomPassword = `Ggl@${(googleId || Math.random().toString(36).slice(2, 10)).slice(0, 8)}#${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(
        randomPassword,
        parseInt(process.env.BCRYPT_ROUNDS) || 12
      );

      // Phone is optional; generate a dummy so profile-completion logic works correctly
      const phone = generateDummyPhone();

      try {
        // Full insert — assumes avatar, google_id, is_temporary_data, is_profile_completed columns exist
        const result = await query(
          `INSERT INTO users
             (name, email, phone, password_hash, avatar, provider, google_id,
              is_temporary_data, is_profile_completed, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
           RETURNING id, name, email, phone, role, avatar, provider, google_id,
                     is_temporary_data, is_profile_completed, created_at`,
          [
            resolvedName, cleanEmail, phone, passwordHash,
            avatar || null, 'GOOGLE', googleId || null,
            isTemporaryData, isProfileCompleted,
          ]
        );
        user = result.rows[0];
      } catch (insertErr) {
        // Fallback for older schema without extra columns
        console.warn('Full insert failed, trying minimal insert:', insertErr.message);
        const result = await query(
          `INSERT INTO users (name, email, phone, password_hash)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, email, phone, role`,
          [resolvedName, cleanEmail, phone, passwordHash]
        );
        user = result.rows[0];
      }

      // Send welcome e-mail asynchronously — failure must not block the response
      sendEmail({ type: 'welcome', to: cleanEmail, data: { name: resolvedName } })
        .catch((mailErr) => console.error('Welcome email error:', mailErr.message));
    }

    // ── Step 3: Issue JWT tokens ───────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    // ── Step 4: Respond ────────────────────────────────────────────────────
    return success(
      res,
      {
        user: {
          id:                 user.id,
          name:               user.name,
          email:              user.email,
          phone:              user.phone               || null,
          role:               user.role,
          avatar:             user.avatar              || avatar || null,
          provider:           user.provider            || 'GOOGLE',
          googleId:           user.google_id           || googleId || null,
          isTemporaryData:    user.is_temporary_data   ?? isTemporaryData,
          isProfileCompleted: user.is_profile_completed ?? isProfileCompleted,
        },
        accessToken,
        refreshToken,
      },
      isNewUser ? 'Account created successfully via Google' : 'Google login successful'
    );

  } catch (err) {
    console.error('Google login error:', err.message);
    return error(res, 'Google login failed');
  }
};

module.exports = { googleLogin };