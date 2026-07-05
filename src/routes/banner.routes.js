const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/banner.controller');
const { adminProtect, adminOrSuperAdmin } = require('../middleware/admin.auth.middleware');

// Public
router.get('/', ctrl.getBanners);

// Admin protected
router.get('/admin', adminProtect, adminOrSuperAdmin, ctrl.adminGetBanners);

router.post('/admin', adminProtect, adminOrSuperAdmin, ctrl.createBanner);

router.put('/admin/:id', adminProtect, adminOrSuperAdmin, ctrl.updateBanner);

router.delete('/admin/:id', adminProtect, adminOrSuperAdmin, ctrl.deleteBanner);

router.patch(
  '/admin/:id/toggle',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.toggleBanner
);

module.exports = router;