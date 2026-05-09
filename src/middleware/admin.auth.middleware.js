const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

// ─────────────────────────────────────────────────────
// adminProtect — Admin JWT verify karo (admins table se)
// Yeh middleware admin-auth routes pe lagta hai
// ─────────────────────────────────────────────────────
const adminProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Admin token required');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return unauthorized(res, 'Admin token expired');
      return unauthorized(res, 'Invalid admin token');
    }

    // source check — user token se admin panel access na ho sake
    if (decoded.source !== 'admin') {
      return unauthorized(res, 'Invalid token. Admin token required.');
    }

    // DB se fresh admin fetch karo
    const result = await query(
      `SELECT id, name, email, role, is_active FROM admins WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return unauthorized(res, 'Admin not found');
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return unauthorized(res, 'Admin account deactivated hai');
    }

    req.admin = admin;   // req.admin se aage access karo
    next();

  } catch (err) {
    console.error('Admin protect error:', err);
    return unauthorized(res, 'Authentication failed');
  }
};

// ─────────────────────────────────────────────────────
// superAdminOnly — Sirf super_admin ke liye
// ─────────────────────────────────────────────────────
const superAdminOnly = (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return forbidden(res, 'Sirf super_admin yeh action kar sakta hai');
  }
  next();
};

// ─────────────────────────────────────────────────────
// adminOrSuperAdmin — admin ya super_admin dono ke liye
// ─────────────────────────────────────────────────────
const adminOrSuperAdmin = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.admin?.role)) {
    return forbidden(res, 'Admin access required');
  }
  next();
};

module.exports = { adminProtect, superAdminOnly, adminOrSuperAdmin };
