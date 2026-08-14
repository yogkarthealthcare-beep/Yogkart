const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadCtrl = require('../controllers/upload.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// ── Public File Upload Endpoint (For public store uploads if needed) ──
router.post('/public', upload.single('file'), uploadCtrl.uploadSingleFile);

// ── Admin Authenticated Upload Endpoints ──────────────────────────────
router.post('/', adminProtect, upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/single', adminProtect, upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/multiple', adminProtect, upload.array('files', 10), uploadCtrl.uploadMultipleFiles);
router.delete('/', adminProtect, uploadCtrl.deleteUploadedFile);

module.exports = router;
