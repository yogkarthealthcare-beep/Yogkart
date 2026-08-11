const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');

router.post('/event', ctrl.logEvent);

module.exports = router;
