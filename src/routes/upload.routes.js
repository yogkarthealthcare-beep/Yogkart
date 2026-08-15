const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadCtrl = require('../controllers/upload.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Helper to catch multer errors safely without 500 crash
const handleSingleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer single upload error:', err);
      const msg = err instanceof multer.MulterError ? `Upload error: ${err.message}` : (err.message || 'File upload failed');
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

const handleMultipleUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('❌ Multer multiple upload error:', err);
      const msg = err instanceof multer.MulterError ? `Upload error: ${err.message}` : (err.message || 'Files upload failed');
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

// ── Admin Protected Upload Endpoints (Verified via Admin Login Token) ──
router.post('/', adminProtect, handleSingleUpload, uploadCtrl.uploadSingleFile);
router.post('/single', adminProtect, handleSingleUpload, uploadCtrl.uploadSingleFile);
router.post('/multiple', adminProtect, handleMultipleUpload, uploadCtrl.uploadMultipleFiles);
router.delete('/', adminProtect, uploadCtrl.deleteUploadedFile);
router.all('/verify-images', uploadCtrl.verifyImageExistence);

module.exports = router;

