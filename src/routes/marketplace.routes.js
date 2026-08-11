const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketplace.controller');
const { adminProtect, adminOrSuperAdmin } = require('../middleware/admin.auth.middleware');

// ── Admin Routes ─────────────────────────────────────────────────────────────
router.get(
  '/admin/online-selling-platforms/platforms',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.getPlatforms
);

router.post(
  '/admin/online-selling-platforms/platforms',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.createPlatform
);

router.put(
  '/admin/online-selling-platforms/platforms/:id',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.updatePlatform
);

router.delete(
  '/admin/online-selling-platforms/platforms/:id',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.deletePlatform
);

router.get(
  '/admin/online-selling-platforms',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.getMappings
);

router.post(
  '/admin/online-selling-platforms',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.createMapping
);

router.put(
  '/admin/online-selling-platforms/:id',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.updateMapping
);

router.delete(
  '/admin/online-selling-platforms/:id',
  adminProtect,
  adminOrSuperAdmin,
  ctrl.deleteMapping
);

// ── Public Routes ────────────────────────────────────────────────────────────
router.get(
  '/products/:productId/marketplaces',
  ctrl.getProductMarketplaces
);

module.exports = router;
