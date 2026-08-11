const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadCtrl = require('../controllers/upload.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Public or Admin file upload endpoints
router.post('/', upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/single', upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/multiple', upload.array('files', 10), uploadCtrl.uploadMultipleFiles);

// Admin-only deletion endpoint
router.delete('/', adminProtect, uploadCtrl.deleteUploadedFile);

module.exports = router;
