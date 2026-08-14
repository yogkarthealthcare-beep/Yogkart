const path = require('path');
const fs = require('fs');

/**
 * Yogkart VPS Independent Storage Configuration
 * Base storage directory: /var/www/yogkart-storage (Outside Git project)
 * Dev fallback: <project_root>/uploads
 */
const getStorageRootDir = () => {
  if (process.env.STORAGE_DIR) {
    return path.resolve(process.env.STORAGE_DIR);
  }
  if (process.platform === 'win32') {
    // Windows: Save outside project root directory
    return path.resolve(__dirname, '../../../../yogkart-storage');
  }
  // Linux / VPS: Outside git project directory
  return '/var/www/yogkart-storage';
};

const STORAGE_ROOT_DIR = getStorageRootDir();


const ALLOWED_CATEGORIES = [
  'products',
  'banners',
  'categories',
  'users',
  'blogs',
  'other'
];

/**
 * Safely auto-creates storage root and category subdirectories if missing.
 */
const ensureStorageDirs = () => {
  try {
    if (!fs.existsSync(STORAGE_ROOT_DIR)) {
      fs.mkdirSync(STORAGE_ROOT_DIR, { recursive: true });
    }
    for (const cat of ALLOWED_CATEGORIES) {
      const catDir = path.join(STORAGE_ROOT_DIR, cat);
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
    }
  } catch (err) {
    console.error('Error initializing storage directories:', err.message);
  }
};

module.exports = {
  STORAGE_ROOT_DIR,
  ALLOWED_CATEGORIES,
  ensureStorageDirs,
};
