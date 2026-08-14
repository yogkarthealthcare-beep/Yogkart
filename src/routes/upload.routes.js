const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadCtrl = require('../controllers/upload.controller');

// ── Completely Public & Auth-Free Upload Endpoints ──
router.post('/', upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/single', upload.single('file'), uploadCtrl.uploadSingleFile);
router.post('/multiple', upload.array('files', 10), uploadCtrl.uploadMultipleFiles);
router.delete('/', uploadCtrl.deleteUploadedFile);

module.exports = router;
