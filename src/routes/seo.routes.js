const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seo.controller');

// Public SEO endpoints
router.get('/meta', seoController.getPageSeo);

module.exports = router;
