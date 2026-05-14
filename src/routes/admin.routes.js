/**
 * routes/admin.routes.js  (FIXED)
 * ─────────────────────────────────────────────────────────────────────
 * CRITICAL FIX: Specific routes (bulk-stock, stats, low-stock, out-of-stock)
 * ko HAMESHA :id se PEHLE register karo — warna Express ek ko dusra samajh leta hai.
 *
 * Rule:
 *   router.get('/products/bulk-stock', ...)   ← PEHLE
 *   router.get('/products/:id', ...)          ← BAAD MEIN
 */

const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Controllers
const dashCtrl      = require('../controllers/admin.dashboard.controller');
const ordersCtrl    = require('../controllers/admin.orders.controller');
const productsCtrl  = require('../controllers/admin.products.controller');
const usersCtrl     = require('../controllers/admin.users.controller');
const inventoryCtrl = require('../controllers/admin.inventory.controller');
const analyticsCtrl = require('../controllers/admin.analytics.controller');
const categoriesCtrl = require('../controllers/admin.categories.controller');
const paymentsCtrl  = require('../controllers/admin.payments.controller');
const couponsCtrl   = require('../controllers/admin.coupons.controller');
const credentialsRoutes = require('./admin.credentials.routes');

// ── All admin routes → admin JWT required ──────────────
router.use(adminProtect);

// ── Dashboard ──────────────────────────────────────────
router.get('/dashboard', dashCtrl.getDashboardStats);

// ── Orders ────────────────────────────────────────────
// IMPORTANT: /orders/stats PEHLE, /orders/:id BAAD MEIN
router.get('/orders/stats',        ordersCtrl.getOrderStats);
router.get('/orders',              ordersCtrl.getOrders);
router.get('/orders/:id',          ordersCtrl.getOrder);
router.patch('/orders/:id/status', ordersCtrl.updateOrderStatus);
router.delete('/orders/:id',       ordersCtrl.cancelOrder);

// ── Products ──────────────────────────────────────────
// IMPORTANT: /products/bulk-stock PEHLE, /products/:id BAAD MEIN
router.post('/products/bulk-stock',      productsCtrl.bulkUpdateStock);  // ← PEHLE
router.get('/products',                  productsCtrl.getProducts);
router.get('/products/:id',              productsCtrl.getProduct);
router.post('/products',                 productsCtrl.createProduct);
router.put('/products/:id',              productsCtrl.updateProduct);
router.delete('/products/:id',           productsCtrl.deleteProduct);
router.patch('/products/:id/toggle',     productsCtrl.toggleProduct);

// ── Categories ────────────────────────────────────────
router.get('/categories',        categoriesCtrl.getCategories);
router.post('/categories',       categoriesCtrl.createCategory);
router.put('/categories/:id',    categoriesCtrl.updateCategory);
router.delete('/categories/:id', categoriesCtrl.deleteCategory);

// ── Users ─────────────────────────────────────────────
// IMPORTANT: /users/stats PEHLE, /users/:id BAAD MEIN
router.get('/users/stats',        usersCtrl.getUserStats);  // ← PEHLE
router.get('/users',              usersCtrl.getUsers);
router.get('/users/:id',          usersCtrl.getUser);
router.patch('/users/:id/toggle', usersCtrl.toggleUser);

// ── Inventory ─────────────────────────────────────────
// IMPORTANT: specific sub-routes PEHLE, /:id BAAD MEIN
router.get('/inventory/low-stock',        inventoryCtrl.getLowStock);    // ← PEHLE
router.get('/inventory/out-of-stock',     inventoryCtrl.getOutOfStock);  // ← PEHLE
router.post('/inventory/bulk-update',     inventoryCtrl.bulkUpdateStock); // ← PEHLE
router.get('/inventory',                  inventoryCtrl.getInventory);
router.patch('/inventory/:id/stock',      inventoryCtrl.updateStock);

// ── Analytics ─────────────────────────────────────────
router.get('/analytics/sales',    analyticsCtrl.getSalesAnalytics);
router.get('/analytics/products', analyticsCtrl.getProductAnalytics);
router.get('/analytics/users',    analyticsCtrl.getUserAnalytics);
router.get('/analytics/orders',   analyticsCtrl.getOrderAnalytics);

// ── Payments ──────────────────────────────────────────
// IMPORTANT: /payments/stats PEHLE
router.get('/payments/stats',                 paymentsCtrl.getPaymentStats);  // ← PEHLE
router.get('/payments',                       paymentsCtrl.getPayments);
router.patch('/payments/:orderId/status',     paymentsCtrl.updatePaymentStatus);
router.post('/refunds',                       paymentsCtrl.initiateRefund);

// ── Coupons (existing — not changed) ──────────────────
router.get('/coupons',           couponsCtrl.getCoupons);
router.post('/coupons',          couponsCtrl.createCoupon);
router.put('/coupons/:id',       couponsCtrl.updateCoupon);
router.delete('/coupons/:id',    couponsCtrl.deleteCoupon);
router.post('/coupons/validate', couponsCtrl.validateCoupon);

// ── Credentials ────────────────────────────────────────
router.use('/credentials', credentialsRoutes);

module.exports = router;
