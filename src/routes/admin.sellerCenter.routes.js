const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.sellerCenter.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// All Seller Center admin endpoints require valid admin token
router.use(adminProtect);

// ── Marketplaces Hub ───────────────────────────────────
router.get('/marketplaces', controller.getMarketplaces);

// ── Amazon Dedicated Routes ────────────────────────────
router.get('/amazon/stats', controller.getAmazonStats);
router.get('/amazon/orders', controller.getAmazonOrders);
router.get('/amazon/orders/:id', controller.getAmazonOrderById);
router.get('/amazon/products', controller.getAmazonProducts);

// Live SP-API Synchronization Trigger
router.post('/amazon/sync', controller.syncAmazonLive);

// Database Credentials & SP-API Connection Testing
router.get('/amazon/settings', controller.getAmazonSettings);
router.post('/amazon/settings', controller.saveAmazonSettings);
router.post('/amazon/test-connection', controller.testAmazonConnection);

// Sync Audit Logs
router.get('/sync-logs', controller.getSyncLogs);

module.exports = router;
