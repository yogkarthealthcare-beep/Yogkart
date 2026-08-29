const express = require('express');
const router = express.Router();
const navigationController = require('../controllers/navigation.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Public route for fetching the navigation tree
router.get('/', navigationController.getPublicNavigations);

// Admin routes
router.get('/admin', protect, adminOnly, navigationController.getAdminNavigations);
router.post('/admin', protect, adminOnly, navigationController.createMenu);
router.put('/admin/reorder', protect, adminOnly, navigationController.reorderMenus);
router.put('/admin/:id', protect, adminOnly, navigationController.updateMenu);
router.delete('/admin/:id', protect, adminOnly, navigationController.deleteMenu);

module.exports = router;
