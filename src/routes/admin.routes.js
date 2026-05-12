const express = require('express');
const router = express.Router();
const { adminProtect, superAdminOnly } = require('../middleware/admin.auth.middleware');

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

// All admin routes require admin auth
router.use(adminProtect);

// ── Dashboard ──────────────────────────────────────────
router.get('/dashboard', dashCtrl.getDashboardStats);

// ── Orders ────────────────────────────────────────────
router.get('/orders/stats',          ordersCtrl.getOrderStats);
router.get('/orders',                ordersCtrl.getOrders);
router.get('/orders/:id',            ordersCtrl.getOrder);
router.patch('/orders/:id/status',   ordersCtrl.updateOrderStatus);
router.delete('/orders/:id',         ordersCtrl.cancelOrder);

// ── Products ──────────────────────────────────────────
router.get('/products',                  productsCtrl.getProducts);
router.get('/products/:id',              productsCtrl.getProduct);
router.post('/products',                 productsCtrl.createProduct);
router.put('/products/:id',              productsCtrl.updateProduct);
router.delete('/products/:id',           productsCtrl.deleteProduct);
router.patch('/products/:id/toggle',     productsCtrl.toggleProduct);
router.post('/products/bulk-stock',      productsCtrl.bulkUpdateStock);

// ── Categories ────────────────────────────────────────
router.get('/categories',          categoriesCtrl.getCategories);
router.post('/categories',         categoriesCtrl.createCategory);
router.put('/categories/:id',      categoriesCtrl.updateCategory);
router.delete('/categories/:id',   categoriesCtrl.deleteCategory);

// ── Users ─────────────────────────────────────────────
router.get('/users/stats',         usersCtrl.getUserStats);
router.get('/users',               usersCtrl.getUsers);
router.get('/users/:id',           usersCtrl.getUser);
router.patch('/users/:id/toggle',  usersCtrl.toggleUser);

// ── Inventory ─────────────────────────────────────────
router.get('/inventory',                  inventoryCtrl.getInventory);
router.get('/inventory/low-stock',        inventoryCtrl.getLowStock);
router.get('/inventory/out-of-stock',     inventoryCtrl.getOutOfStock);
router.patch('/inventory/:id/stock',      inventoryCtrl.updateStock);
router.post('/inventory/bulk-update',     inventoryCtrl.bulkUpdateStock);

// ── Analytics ─────────────────────────────────────────
router.get('/analytics/sales',    analyticsCtrl.getSalesAnalytics);
router.get('/analytics/products', analyticsCtrl.getProductAnalytics);
router.get('/analytics/users',    analyticsCtrl.getUserAnalytics);
router.get('/analytics/orders',   analyticsCtrl.getOrderAnalytics);

// ── Payments ──────────────────────────────────────────
router.get('/payments/stats',                  paymentsCtrl.getPaymentStats);
router.get('/payments',                        paymentsCtrl.getPayments);
router.patch('/payments/:orderId/status',      paymentsCtrl.updatePaymentStatus);
router.post('/refunds',                        paymentsCtrl.initiateRefund);

// ── Coupons ───────────────────────────────────────────
router.get('/coupons',              couponsCtrl.getCoupons);
router.post('/coupons',             couponsCtrl.createCoupon);
router.put('/coupons/:id',          couponsCtrl.updateCoupon);
router.delete('/coupons/:id',       couponsCtrl.deleteCoupon);
router.post('/coupons/validate',    couponsCtrl.validateCoupon);

module.exports = router;
