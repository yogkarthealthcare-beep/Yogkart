const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Public route for fetching safe settings
router.get('/public', settingsController.getPublicSettings);

// Admin routes
router.get('/admin', protect, adminOnly, settingsController.getAllSettings);
router.put('/admin/:key', protect, adminOnly, settingsController.updateSetting);

module.exports = router;
