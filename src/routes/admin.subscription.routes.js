const express = require('express');
const router = express.Router();
const adminSubscriptionController = require('../controllers/admin.subscription.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Admin authenticated routes
router.use(adminProtect);

router.get('/payments', adminSubscriptionController.getAllPayments);
router.get('/subscriptions', adminSubscriptionController.getAllSubscriptions);

module.exports = router;
