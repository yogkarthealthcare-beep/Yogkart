const express = require('express');
const router = express.Router();
const healthCtrl = require('../controllers/health.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// Public Health & Remedies endpoints
router.get('/remedies', healthCtrl.listRemedies);
router.get('/remedies/:slug', healthCtrl.getRemedyBySlug);
router.post('/bmi', healthCtrl.calculateBmi);
router.post('/dosha', optionalAuth, healthCtrl.evaluateDosha);

// Protected Wellness tracking endpoints
router.use(protect);
router.post('/wellness', healthCtrl.logWellness);
router.get('/wellness/history', healthCtrl.getWellnessHistory);

module.exports = router;
