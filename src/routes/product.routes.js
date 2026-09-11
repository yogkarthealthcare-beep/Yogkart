const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');

// Public routes
router.get('/banners',          ctrl.getBanners);
router.get('/featured',         ctrl.getFeatured);
router.get('/bestsellers',      ctrl.getBestSellers);
router.get('/',                 ctrl.getProducts);
router.get('/:slug/variations', ctrl.getProductVariations);
router.get('/:slug/related',    ctrl.getRelated);
router.get('/:slug',            ctrl.getProduct);

module.exports = router;