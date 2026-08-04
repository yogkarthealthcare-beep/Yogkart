const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { protect } = require('../middleware/auth.middleware');

// Public route - list plans
router.get('/plans', subscriptionController.getPlans);

// Authenticated customer routes
router.post('/initiate', protect, subscriptionController.initiateSubscription);
router.post('/verify', protect, subscriptionController.verifyPayment);
router.get('/my-subscriptions', protect, subscriptionController.getMySubscriptions);
router.get('/invoice/:paymentId', protect, subscriptionController.getInvoice);

module.exports = router;
