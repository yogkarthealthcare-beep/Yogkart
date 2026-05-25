const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/banner.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Public
router.get('/', ctrl.getBanners);

// Admin protected
router.get('/admin', protect, adminOnly, ctrl.adminGetBanners);

router.post('/admin', protect, adminOnly, ctrl.createBanner);

router.put('/admin/:id', protect, adminOnly, ctrl.updateBanner);

router.delete('/admin/:id', protect, adminOnly, ctrl.deleteBanner);

router.patch(
  '/admin/:id/toggle',
  protect,
  adminOnly,
  ctrl.toggleBanner
);

module.exports = router;