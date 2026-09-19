const express = require('express');
const router = express.Router();
const newsletterCtrl = require('../controllers/newsletter.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// All admin newsletter routes require admin JWT
router.use(adminProtect);

router.get('/stats', newsletterCtrl.getStats);
router.get('/export', newsletterCtrl.exportAll);
router.post('/delete-bulk', newsletterCtrl.bulkDelete);
router.post('/remove-duplicates', newsletterCtrl.removeDuplicates);
router.patch('/:id/status', newsletterCtrl.updateStatus);
router.delete('/:id', newsletterCtrl.deleteSubscriber);
router.get('/', newsletterCtrl.getSubscribers);

module.exports = router;
