const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { STORAGE_ROOT_DIR, ALLOWED_CATEGORIES, ensureStorageDirs } = require('../config/storage');

ensureStorageDirs();

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureStorageDirs();
    let category = (req.body.category || req.query.category || 'products').toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(category)) {
      category = 'other';
    }
    const destDir = path.join(STORAGE_ROOT_DIR, category);
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename: <timestamp>-<random_hex>.<ext>
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Allowed image extensions
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.jpg';
    const safeFilename = `${timestamp}-${randomHex}${safeExt}`;
    cb(null, safeFilename);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, SVG, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  }
});

module.exports = upload;
