const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { STORAGE_ROOT_DIR, ALLOWED_CATEGORIES, ensureStorageDirs } = require('../config/storage');

ensureStorageDirs();

/**
 * Creates clean, human-readable, Google Image Search SEO-friendly filenames
 * Example: "Neem Wood Comb #1.png" -> "yogkart-neem-wood-comb-4a8b.png"
 */
const generateSeoFilename = (originalname, customTitle) => {
  const ext = path.extname(originalname || '').toLowerCase();
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.jpg';

  const baseText = customTitle || path.basename(originalname, ext);

  let slug = String(baseText || 'yogkart-product')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  if (!slug) {
    slug = 'yogkart-product';
  }

  if (!slug.startsWith('yogkart')) {
    slug = `yogkart-${slug}`;
  }

  const uniqueSuffix = `${Date.now().toString(36).slice(-4)}${crypto.randomBytes(2).toString('hex')}`;
  return `${slug}-${uniqueSuffix}${safeExt}`;
};

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
    const customTitle = req.body.title || req.body.name || req.query.title || req.query.name;
    const seoFilename = generateSeoFilename(file.originalname, customTitle);
    cb(null, seoFilename);
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
