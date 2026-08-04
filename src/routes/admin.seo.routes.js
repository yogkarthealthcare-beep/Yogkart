const express = require('express');
const router = express.Router();
const adminSeoController = require('../controllers/admin.seo.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

router.use(adminProtect);

// Locales
router.get('/locales', adminSeoController.getLocales);
router.post('/locales', adminSeoController.upsertLocale);

// AI Crawlers
router.get('/ai-crawlers', adminSeoController.getAiCrawlers);
router.post('/ai-crawlers', adminSeoController.updateAiCrawler);

// Redirect Mappings
router.get('/redirects', adminSeoController.getRedirects);
router.post('/redirects', adminSeoController.upsertRedirect);

module.exports = router;
