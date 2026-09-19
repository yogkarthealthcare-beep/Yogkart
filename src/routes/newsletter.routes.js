const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletter.controller');

// Public route to subscribe to newsletter
router.post('/subscribe', newsletterController.subscribe);

module.exports = router;
