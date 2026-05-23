<<<<<<< HEAD
/**
 * ============================================================
 * Google Auth Controller
 * ============================================================
 * Handles Google OAuth login and registration.
 *
 * Verifies standard Google ID tokens & Firebase ID tokens securely.
 * Automatically handles account linking, missing field dummy generation,
 * and tracks temporary data / profile completion status.
 *
 * POST /api/auth/google
 * Body: { idToken: string }
 */

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { verifyGoogleToken } = require('../utils/googleTokenVerifier');
const { generateDummyPhone, generateDummyName } = require('../utils/dummyGenerator');
const { generateAccessToken, generateRefreshToken, saveRefreshToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/email.service');
const { success, badRequest, error } = require('../utils/response');

=======
// src/controllers/google-auth.controller.js
const bcrypt               = require('bcryptjs');
const { query }            = require('../config/database');
const { verifyGoogleToken } = require('../utils/googleTokenVerifier');
const { generateDummyName } = require('../utils/dummyGenerator');
const {
  generateAccessToken, generateRefreshToken, saveRefreshToken
} = require('../utils/jwt');
const { success, error, badRequest } = require('../utils/response');

// POST /api/auth/google
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return badRequest(res, 'Google idToken required');

<<<<<<< HEAD
    // ── Step 1: Verify Google/Firebase token ───────────────────────────────
    let tokenData;
    try {
      tokenData = await verifyGoogleToken(idToken);
=======
    // ── Token verify ────────────────────────────────────
    let googleUser;
    try {
      googleUser = await verifyGoogleToken(idToken);
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
    } catch (verifyErr) {
      console.error('Google token verify failed:', verifyErr.message);
      return badRequest(res, 'Invalid Google token');
    }

<<<<<<< HEAD
    const { uid: googleId, email, name: rawName, picture: avatar, email_verified } = tokenData;

    if (!email_verified) {
      return badRequest(res, 'Google account email is not verified');
    }
    if (!email) {
      return badRequest(res, 'Could not retrieve email from Google token');
    }

    const cleanEmail = email.toLowerCase().trim();
=======
    const { uid, email, name, picture } = googleUser;

    if (!email) return badRequest(res, 'Email not found in Google token');
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11

    const emailClean      = email.toLowerCase().trim();
    const resolvedName    = name || generateDummyName(email);
    const isTemporaryData = !name;

    // ── Check existing user ──────────────────────────────
    const existing = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
<<<<<<< HEAD
      [cleanEmail]
=======
      [emailClean]
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
    );

    let user;
    let isNewUser = false;
    let isTemporaryData = false;
    let isProfileCompleted = true;

<<<<<<< HEAD
    if (exists.rows.length > 0) {
      // CASE A: Existing user — log in and link account if not already linked
      user = exists.rows[0];

      let needsUpdate = false;
      const updateFields = [];
      const updateValues = [];

      if (!user.google_id) {
        updateFields.push(`google_id = $${updateFields.length + 1}`);
        updateValues.push(googleId);
        needsUpdate = true;
      }
      if (!user.provider) {
        updateFields.push(`provider = $${updateFields.length + 1}`);
        updateValues.push('GOOGLE');
        needsUpdate = true;
      }
      if (avatar && !user.avatar) {
        updateFields.push(`avatar = $${updateFields.length + 1}`);
        updateValues.push(avatar);
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateValues.push(user.id);
        await query(
          `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${updateValues.length}`,
          updateValues
        );
        
        // Refresh local user object
        const updatedRes = await query('SELECT * FROM users WHERE id = $1', [user.id]);
        user = updatedRes.rows[0];
      }

      isTemporaryData = user.is_temporary_data;
      isProfileCompleted = user.is_profile_completed;
    } else {
      // CASE B: New user — auto-register
      isNewUser = true;

      // Map/generate profile details
      const name = rawName ? rawName.trim() : generateDummyName(cleanEmail);
      
      // Phone is optional in DB but if we want to ensure profile completion flag works,
      // we generate a dummy phone number and mark profile as incomplete.
      const phone = generateDummyPhone(); 
      isTemporaryData = true; // Mark as temporary since we generated phone
      isProfileCompleted = false;

      // Hash a secure random password (so they can reset/set password later)
      const randomPassword = `Ggl@${googleId.slice(0, 8)}#${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(randomPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      const result = await query(
        `INSERT INTO users (name, email, phone, password_hash, avatar, provider, google_id, is_temporary_data, is_profile_completed, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         RETURNING id, name, email, phone, role, avatar, provider, google_id, is_temporary_data, is_profile_completed, created_at`,
        [name, cleanEmail, phone, passwordHash, avatar || null, 'GOOGLE', googleId, isTemporaryData, isProfileCompleted]
      );
      user = result.rows[0];

      // Send welcome email asynchronously
      sendEmail({ type: 'welcome', to: cleanEmail, data: { name: user.name } })
        .catch(mailErr => console.error('Welcome email error:', mailErr.message));
    }

    // ── Step 3: Tokens and Response ────────────────────────────────────────
    const accessToken = generateAccessToken(user);
=======
    if (existing.rows.length > 0) {
      // ── Existing user — login + link google_id ──────────
      user = existing.rows[0];

      // google_id link karo agar nahi tha
      try {
        await query(
          `UPDATE users
           SET google_id = COALESCE(google_id, $1),
               provider  = COALESCE(provider, 'GOOGLE'),
               avatar    = COALESCE(avatar, $2),
               updated_at = NOW()
           WHERE id = $3`,
          [uid || null, picture || null, user.id]
        );
      } catch (updateErr) {
        // avatar/google_id column nahi hai toh skip
        console.warn('Could not update google_id/avatar:', updateErr.message);
      }

    } else {
      // ── New user — register ─────────────────────────────
      isNewUser = true;
      const autoPassword = `Gk@${uid?.slice(0, 8) || Math.random().toString(36).slice(2, 10)}#${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(autoPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      try {
        // With avatar + google_id columns
        const result = await query(
          `INSERT INTO users
             (name, email, phone, password_hash, avatar, provider, google_id, is_temporary_data, is_profile_completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, name, email, phone, role, avatar, is_temporary_data, is_profile_completed`,
          [
            resolvedName, emailClean, null, passwordHash,
            picture || null, 'GOOGLE', uid || null,
            isTemporaryData, !isTemporaryData
          ]
        );
        user = result.rows[0];
      } catch (insertErr) {
        // Fallback — bina naye columns ke insert karo
        console.warn('Full insert failed, trying minimal insert:', insertErr.message);
        const result = await query(
          `INSERT INTO users (name, email, phone, password_hash)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, email, phone, role`,
          [resolvedName, emailClean, null, passwordHash]
        );
        user = result.rows[0];
      }
    }

    // ── JWT tokens ───────────────────────────────────────
    const accessToken  = generateAccessToken(user);
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    // ── Response ─────────────────────────────────────────
    return success(res, {
      user: {
<<<<<<< HEAD
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        avatar: user.avatar || null,
        provider: user.provider || null,
        googleId: user.google_id || null,
        isTemporaryData: user.is_temporary_data,
        isProfileCompleted: user.is_profile_completed
      },
      accessToken,
      refreshToken
    }, isNewUser ? 'Account created successfully via Google' : 'Google login successful');
=======
        id:                 user.id,
        name:               user.name,
        email:              user.email,
        phone:              user.phone              || null,
        role:               user.role,
        avatar:             user.avatar             || picture || null,
        provider:           user.provider           || 'GOOGLE',
        isTemporaryData:    user.is_temporary_data  ?? isTemporaryData,
        isProfileCompleted: user.is_profile_completed ?? !isTemporaryData,
      },
      accessToken,
      refreshToken,
    }, isNewUser ? 'Account created successfully' : 'Login successful');
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11

  } catch (err) {
    console.error('Google login error:', err.message);
    return error(res, 'Google login failed');
  }
};

module.exports = { googleLogin };