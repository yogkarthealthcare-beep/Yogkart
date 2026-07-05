const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/coupon.controller');

router.post('/validate', ctrl.validateCoupon);

module.exports = router;
