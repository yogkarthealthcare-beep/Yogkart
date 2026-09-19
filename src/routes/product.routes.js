const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');

// Public routes
router.get('/',                 ctrl.getProducts);
router.get('/banners',          ctrl.getBanners);
router.get('/homepage',         ctrl.getHomepageProducts);
router.get('/featured',         ctrl.getFeatured);
router.get('/bestsellers',      ctrl.getBestSellers);
router.get('/:slug/variations', ctrl.getProductVariations);
router.get('/:slug/related',    ctrl.getRelated);
router.get('/:slug/reviews',    ctrl.getProductReviews);
router.post('/:slug/reviews',   ctrl.addProductReview);
router.get('/:slug',            ctrl.getProduct);

module.exports = router;