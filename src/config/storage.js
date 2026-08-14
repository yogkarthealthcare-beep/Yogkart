const path = require('path');
const fs = require('fs');

/**
 * Yogkart VPS Independent Storage Configuration
 * Base storage directory: /var/www/yogkart-storage (Outside Git project)
 * Dev fallback: <project_root>/uploads
 */
const getStorageRootDir = () => {
  if (process.env.STORAGE_DIR) {
    const customPath = path.resolve(process.env.STORAGE_DIR);
    try {
      if (!fs.existsSync(customPath)) fs.mkdirSync(customPath, { recursive: true });
      fs.accessSync(customPath, fs.constants.W_OK);
      return customPath;
    } catch (err) {
      console.warn('⚠️ Custom STORAGE_DIR not writable, falling back:', err.message);
    }
  }

  if (process.platform === 'win32') {
    const winPath = path.resolve(__dirname, '../../../../yogkart-storage');
    try {
      if (!fs.existsSync(winPath)) fs.mkdirSync(winPath, { recursive: true });
      return winPath;
    } catch {
      const winFallback = path.resolve(__dirname, '../../uploads');
      if (!fs.existsSync(winFallback)) fs.mkdirSync(winFallback, { recursive: true });
      return winFallback;
    }
  }

  // Linux / VPS
  const vpsDir = '/var/www/yogkart-storage';
  try {
    if (!fs.existsSync(vpsDir)) {
      fs.mkdirSync(vpsDir, { recursive: true });
    }
    fs.accessSync(vpsDir, fs.constants.W_OK);
    return vpsDir;
  } catch (err) {
    console.warn('⚠️ VPS storage dir (/var/www/yogkart-storage) not writable, using local uploads fallback:', err.message);
    const localFallback = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(localFallback)) fs.mkdirSync(localFallback, { recursive: true });
    return localFallback;
  }
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
    const rootDir = getStorageRootDir();
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
    for (const cat of ALLOWED_CATEGORIES) {
      const catDir = path.join(rootDir, cat);
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
