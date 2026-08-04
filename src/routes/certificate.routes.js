const express = require('express');
const router = express.Router();
const certCtrl = require('../controllers/certificate.controller');
const { protect } = require('../middleware/auth.middleware');

// PUBLIC verification route (no auth needed)
router.get('/verify/:uid', certCtrl.verifyCertificate);

// Protected routes (Download & list)
router.get('/my', protect, certCtrl.getMyCertificates);
router.get('/:uid/pdf', certCtrl.downloadCertificatePdf);

module.exports = router;
