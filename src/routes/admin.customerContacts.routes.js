const express = require('express');
const multer = require('multer');
const router = express.Router();
const customerContactsCtrl = require('../controllers/admin.customerContacts.controller');
const { adminProtect } = require('../middleware/admin.auth.middleware');

// Memory storage for fast in-memory Excel file processing (up to 25 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i) ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
    }
  }
});

// All routes require Admin JWT
router.use(adminProtect);

// Specific routes first
router.get('/stats', customerContactsCtrl.getStats);
router.post('/preview', upload.single('file'), customerContactsCtrl.previewExcel);
router.post('/import', upload.single('file'), customerContactsCtrl.importExcel);
router.post('/batch', customerContactsCtrl.batchInsert);
router.post('/delete-bulk', customerContactsCtrl.bulkDelete);
router.delete('/clear-all', customerContactsCtrl.clearAll);

// General collection & ID routes
router.get('/', customerContactsCtrl.getContacts);
router.delete('/:id', customerContactsCtrl.deleteContact);

module.exports = router;
