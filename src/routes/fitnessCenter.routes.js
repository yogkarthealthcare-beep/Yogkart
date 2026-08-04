const express = require('express');
const router = express.Router();
const centerCtrl = require('../controllers/fitnessCenter.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// Public directory endpoints
router.get('/', optionalAuth, centerCtrl.listFitnessCenters);
router.post('/inquire', optionalAuth, centerCtrl.submitInquiry);
router.get('/:slug', optionalAuth, centerCtrl.getFitnessCenterDetail);

// Protected onboarding endpoint
router.post('/', protect, centerCtrl.createFitnessCenter);

module.exports = router;
