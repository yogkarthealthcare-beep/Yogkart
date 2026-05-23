const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { success, created, error, unauthorized, badRequest, forbidden } = require('../utils/response');

// ─────────────────────────────────────────────────────
// JWT helpers (admins ke liye alag — source:'admin' payload)
// ─────────────────────────────────────────────────────
const generateAdminAccessToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, source: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h' }   // admin session 8 hours
  );
};

const generateAdminRefreshToken = (admin) => {
  return jwt.sign(
    { id: admin.id, source: 'admin' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const saveAdminRefreshToken = async (adminId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await query(
    `INSERT INTO admin_refresh_tokens (admin_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [adminId, token, expiresAt]
  );
};

// ─────────────────────────────────────────────────────
// POST /api/admin-auth/login
// ─────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return badRequest(res, 'Email aur password dono required hain');
    }

    // DB se admin fetch karo
    const result = await query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM admins
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return unauthorized(res, 'Invalid email or password');
    }

    const admin = result.rows[0];

    // Account active hai?
    if (!admin.is_active) {
      return unauthorized(res, 'Admin account deactivated hai. Support se contact karo.');
    }

    // Password verify
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Last login update karo
    await query(
      `UPDATE admins SET last_login_at = NOW() WHERE id = $1`,
      [admin.id]
    );

    // Tokens generate karo
    const accessToken  = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);
    await saveAdminRefreshToken(admin.id, refreshToken);

    return success(res, {
      admin: {
        id:    admin.id,
        name:  admin.name,
        email: admin.email,
        role:  admin.role,
      },
      accessToken,
      refreshToken,
    }, 'Admin login successful');

  } catch (err) {
    console.error('Admin login error:', err);
    return error(res, 'Login failed');
  }
};

// ─────────────────────────────────────────────────────
// GET /api/admin-auth/me   (protect middleware se guard)
// ─────────────────────────────────────────────────────
const adminMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, is_active, last_login_at, created_at
       FROM admins
       WHERE id = $1`,
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return unauthorized(res, 'Admin not found');
    }

    return success(res, { admin: result.rows[0] });
  } catch (err) {
    console.error('Admin me error:', err);
    return error(res, 'Profile fetch failed');
  }
};

// ─────────────────────────────────────────────────────
// POST /api/admin-auth/refresh
// ─────────────────────────────────────────────────────
const adminRefresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token required');

    // Signature verify
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return unauthorized(res, 'Invalid or expired refresh token');
    }

    // source check — user token se admin refresh na ho sake
    if (decoded.source !== 'admin') {
      return unauthorized(res, 'Invalid token source');
    }

    // DB mein token exist karta hai?
    const tokenRow = await query(
      `SELECT * FROM admin_refresh_tokens
       WHERE token = $1 AND admin_id = $2 AND expires_at > NOW()`,
      [refreshToken, decoded.id]
    );
    if (tokenRow.rows.length === 0) {
      return unauthorized(res, 'Refresh token expired ya invalid hai');
    }

    // Admin fetch karo
    const result = await query(
      `SELECT id, name, email, role, is_active FROM admins WHERE id = $1`,
      [decoded.id]
    );
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return unauthorized(res, 'Admin not found ya deactivated');
    }

    const admin = result.rows[0];

    // Old token revoke karo, naya issue karo
    await query('DELETE FROM admin_refresh_tokens WHERE token = $1', [refreshToken]);

    const newAccessToken  = generateAdminAccessToken(admin);
    const newRefreshToken = generateAdminRefreshToken(admin);
    await saveAdminRefreshToken(admin.id, newRefreshToken);

    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');

  } catch (err) {
    console.error('Admin refresh error:', err);
    return unauthorized(res, 'Token refresh failed');
  }
};

// ─────────────────────────────────────────────────────
// POST /api/admin-auth/logout
// ─────────────────────────────────────────────────────
const adminLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM admin_refresh_tokens WHERE token = $1', [refreshToken]);
    }
    return success(res, null, 'Logout successful');
  } catch (err) {
    return error(res, 'Logout failed');
  }
};

// ─────────────────────────────────────────────────────
// PUT /api/admin-auth/change-password  (protected)
// ─────────────────────────────────────────────────────
const adminChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequest(res, 'currentPassword aur newPassword dono chahiye');
    }

    if (newPassword.length < 8) {
      return badRequest(res, 'New password minimum 8 characters ka hona chahiye');
    }

    // Current password verify
    const result = await query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.admin.id]
    );
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return badRequest(res, 'Current password galat hai');

    // Hash aur update
    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.admin.id]
    );

    // Sab refresh tokens revoke karo — phir se login karna hoga
    await query('DELETE FROM admin_refresh_tokens WHERE admin_id = $1', [req.admin.id]);

    return success(res, null, 'Password change ho gaya. Phir se login karo.');

  } catch (err) {
    console.error('Admin change password error:', err);
    return error(res, 'Password change failed');
  }
};

// ─────────────────────────────────────────────────────
// POST /api/admin-auth/create-admin   (super_admin only)
// Naya admin account banana
// ─────────────────────────────────────────────────────
const createAdmin = async (req, res) => {
  try {
    // Sirf super_admin kar sakta hai
    if (req.admin.role !== 'super_admin') {
      return forbidden(res, 'Sirf super_admin naye admin bana sakta hai');
    }

    const { name, email, password, role = 'admin' } = req.body;

    if (!name || !email || !password) {
      return badRequest(res, 'name, email aur password required hain');
    }

    const validRoles = ['super_admin', 'admin', 'manager'];
    if (!validRoles.includes(role)) {
      return badRequest(res, `Role invalid hai. Valid roles: ${validRoles.join(', ')}`);
    }

    if (password.length < 8) {
      return badRequest(res, 'Password minimum 8 characters ka hona chahiye');
    }

    // Email already exist?
    const exists = await query('SELECT id FROM admins WHERE email = $1', [email.toLowerCase().trim()]);
    if (exists.rows.length > 0) {
      return badRequest(res, 'Yeh email already registered hai');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const result = await query(
      `INSERT INTO admins (name, email, password_hash, role, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role, req.admin.id]
    );

    return created(res, { admin: result.rows[0] }, `Admin "${name}" successfully create ho gaya`);

  } catch (err) {
    console.error('Create admin error:', err);
    return error(res, 'Admin creation failed');
  }
};

// ─────────────────────────────────────────────────────
// GET /api/admin-auth/list   (super_admin only)
// Sabhi admins ki list
// ─────────────────────────────────────────────────────
const listAdmins = async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return forbidden(res, 'Sirf super_admin admin list dekh sakta hai');
    }

    const result = await query(
      `SELECT a.id, a.name, a.email, a.role, a.is_active, a.last_login_at, a.created_at,
              c.name as created_by_name
       FROM admins a
       LEFT JOIN admins c ON a.created_by = c.id
       ORDER BY a.created_at DESC`
    );

    return success(res, { admins: result.rows, total: result.rows.length });

  } catch (err) {
    console.error('List admins error:', err);
    return error(res, 'Admin list fetch failed');
  }
};

// ─────────────────────────────────────────────────────
// PATCH /api/admin-auth/toggle/:id   (super_admin only)
// Admin ko activate / deactivate karo
// ─────────────────────────────────────────────────────
const toggleAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return forbidden(res, 'Sirf super_admin yeh action kar sakta hai');
    }

    const { id } = req.params;

    // Apne aap ko deactivate mat karo
    if (id === req.admin.id) {
      return badRequest(res, 'Tum apna khud ka account deactivate nahi kar sakte');
    }

    const result = await query(
      `UPDATE admins
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return badRequest(res, 'Admin not found');
    }

    const admin = result.rows[0];
    const msg = admin.is_active ? `${admin.name} activate ho gaya` : `${admin.name} deactivate ho gaya`;

    // Agar deactivate kiya — unke sab tokens revoke karo
    if (!admin.is_active) {
      await query('DELETE FROM admin_refresh_tokens WHERE admin_id = $1', [id]);
    }

    return success(res, { admin }, msg);

  } catch (err) {
    console.error('Toggle admin error:', err);
    return error(res, 'Status update failed');
  }
};

module.exports = {
  adminLogin,
  adminMe,
  adminRefresh,
  adminLogout,
  adminChangePassword,
  createAdmin,
  listAdmins,
  toggleAdmin,
};
