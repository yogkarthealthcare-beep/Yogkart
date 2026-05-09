const express = require('express');
const router  = express.Router();
const { adminProtect } = require('../middleware/admin.auth.middleware');

const {
  adminLogin,
  adminMe,
  adminRefresh,
  adminLogout,
  adminChangePassword,
  createAdmin,
  listAdmins,
  toggleAdmin,
} = require('../controllers/admin.auth.controller');

// ── Public Routes (token nahi chahiye) ───────────────
router.post('/login',   adminLogin);    // POST /api/admin-auth/login
router.post('/refresh', adminRefresh);  // POST /api/admin-auth/refresh
router.post('/logout',  adminLogout);   // POST /api/admin-auth/logout

// ── Protected Routes (admin token chahiye) ───────────
router.get ('/me',              adminProtect, adminMe);              // GET  /api/admin-auth/me
router.put ('/change-password', adminProtect, adminChangePassword);  // PUT  /api/admin-auth/change-password

// ── Super Admin Only ─────────────────────────────────
router.post  ('/create-admin',    adminProtect, createAdmin);       // POST  /api/admin-auth/create-admin
router.get   ('/list',            adminProtect, listAdmins);        // GET   /api/admin-auth/list
router.patch ('/toggle/:id',      adminProtect, toggleAdmin);       // PATCH /api/admin-auth/toggle/:id

module.exports = router;
