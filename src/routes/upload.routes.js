const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadCtrl = require('../controllers/upload.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Optional token handler for upload routes (doesn't reject if unauthenticated or token expired during upload)
const optionalAdminProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const { query } = require('../config/database');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.source === 'admin') {
        const result = await query(`SELECT id, name, email, role FROM admins WHERE id = $1`, [decoded.id]);
        if (result.rows.length > 0) {
          req.admin = result.rows[0];
        }
      }
    }
  } catch (err) {
    // Ignore invalid/expired token on image upload to allow smooth upload
  }
  next();
};

// File upload endpoints
router.post('/', optionalAdminProtect, upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/single', optionalAdminProtect, upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/multiple', optionalAdminProtect, upload.array('files', 10), uploadCtrl.uploadMultipleFiles);

// Admin-only deletion endpoint
router.delete('/', adminProtect, uploadCtrl.deleteUploadedFile);


module.exports = router;
