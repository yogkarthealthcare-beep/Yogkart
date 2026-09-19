const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/admin.marketingEmails.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Memory storage for Excel/CSV file processing (up to 25 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.originalname.match(/\.(xlsx|xls|csv)$/i) ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
    }
  },
});

// All routes require Admin JWT
router.use(adminProtect);

// Specific routes first
router.get('/stats', ctrl.getStats);
router.get('/export', ctrl.exportToExcel);
router.post('/preview-excel', upload.single('file'), ctrl.previewExcel);
router.post('/import', ctrl.importRecords);
router.post('/send', ctrl.sendBulk);
router.post('/delete-bulk', ctrl.bulkDelete);
router.post('/reset-status', ctrl.resetStatus);
router.post('/remove-duplicates', ctrl.removeDuplicates);

// Collection & ID routes
router.get('/', ctrl.getMarketingEmails);
router.put('/:id', ctrl.updateRecord);
router.delete('/:id', ctrl.deleteRecord);

module.exports = router;
