const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/response');
const { STORAGE_ROOT_DIR, ALLOWED_CATEGORIES } = require('../config/storage');

/**
 * Constructs the public web URL for an uploaded file
 */
const buildFileUrl = (req, category, filename) => {
  const relPath = `/uploads/${category}/${filename}`;
  if (process.env.PUBLIC_URL || process.env.APP_URL) {
    const base = (process.env.PUBLIC_URL || process.env.APP_URL).replace(/\/$/, '');
    return `${base}${relPath}`;
  }
  
  // Dynamic host fallback if req is available
  if (req && req.get('host')) {
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return `${protocol}://${req.get('host')}${relPath}`;
  }

  return relPath;
};

/**
 * Guarantees uploaded file exists in both VPS storage and local uploads directory
 */
const ensureDualStorageCopy = (file, category) => {
  try {
    if (!file || !file.path) return;
    const filename = file.filename;
    const secondaryDir = path.resolve(__dirname, '../../uploads');

    const primaryCategoryDir = path.join(STORAGE_ROOT_DIR, category);
    const secondaryCategoryDir = path.join(secondaryDir, category);

    if (!fs.existsSync(primaryCategoryDir)) fs.mkdirSync(primaryCategoryDir, { recursive: true });
    if (!fs.existsSync(secondaryCategoryDir)) fs.mkdirSync(secondaryCategoryDir, { recursive: true });

    const primaryFilePath = path.join(primaryCategoryDir, filename);
    const secondaryFilePath = path.join(secondaryCategoryDir, filename);

    if (fs.existsSync(file.path) && file.path !== primaryFilePath && !fs.existsSync(primaryFilePath)) {
      fs.copyFileSync(file.path, primaryFilePath);
    }
    if (fs.existsSync(file.path) && file.path !== secondaryFilePath && !fs.existsSync(secondaryFilePath)) {
      fs.copyFileSync(file.path, secondaryFilePath);
    }
  } catch (copyErr) {
    console.warn('⚠️ Dual storage sync warning:', copyErr.message);
  }
};

/**
 * POST /api/admin/upload - Handle single file upload
 */
const uploadSingleFile = async (req, res) => {
  try {
    console.log('📥 [Backend Upload] Single file upload request received');
    console.log('📥 [Backend Upload] req.file:', req.file);
    console.log('📥 [Backend Upload] req.body:', req.body);

    if (!req.file) {
      console.warn('⚠️ [Backend Upload] req.file is missing');
      return error(res, 'No file uploaded', 400);
    }

    let category = (req.body.category || req.query.category || 'products').toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(category)) {
      category = 'other';
    }

    ensureDualStorageCopy(req.file, category);

    const filename = req.file.filename;
    const fileUrl = buildFileUrl(req, category, filename);

    console.log('✅ [Backend Upload] Single file saved successfully:', fileUrl);


    return success(res, {
      url: fileUrl,
      relative_path: `/uploads/${category}/${filename}`,
      filename: filename,
      category: category,
      original_name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 'File uploaded successfully');
  } catch (err) {
    console.error('❌ [Backend Upload] uploadSingleFile error:', err);
    return error(res, `Failed to upload file: ${err.message || err}`, 500);
  }
};

/**
 * POST /api/admin/upload/multiple - Handle multiple files upload
 */
const uploadMultipleFiles = async (req, res) => {
  try {
    console.log('📥 [Backend Upload] Multiple files upload request received');
    console.log('📥 [Backend Upload] req.files count:', req.files?.length);
    console.log('📥 [Backend Upload] req.body:', req.body);

    if (!req.files || req.files.length === 0) {
      console.warn('⚠️ [Backend Upload] req.files is missing or empty');
      return error(res, 'No files uploaded', 400);
    }

    let category = (req.body.category || req.query.category || 'products').toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(category)) {
      category = 'other';
    }

    const uploadedFiles = req.files.map(file => {
      ensureDualStorageCopy(file, category);
      const filename = file.filename;
      const fileUrl = buildFileUrl(req, category, filename);

      return {
        url: fileUrl,
        relative_path: `/uploads/${category}/${filename}`,
        filename: filename,
        category: category,
        original_name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

    console.log('✅ [Backend Upload] Multiple files saved successfully. URLs:', uploadedFiles.map(f => f.url));

    return success(res, {
      files: uploadedFiles,
      urls: uploadedFiles.map(f => f.url)
    }, 'Files uploaded successfully');
  } catch (err) {
    console.error('❌ [Backend Upload] uploadMultipleFiles error:', err);
    return error(res, `Failed to upload files: ${err.message || err}`, 500);
  }
};


/**
 * DELETE /api/admin/upload - Safely delete a VPS-stored uploaded file
 */
const deleteUploadedFile = async (req, res) => {
  try {
    const { file_path, filename, category } = req.body;
    let targetCategory = (category || 'products').toLowerCase().trim();
    let targetFilename = filename;

    // If a full path or URL is provided, extract category and filename safely
    if (file_path) {
      // Do NOT delete Cloudinary URLs
      if (file_path.includes('cloudinary.com')) {
        return success(res, null, 'Cloudinary URLs are preserved and not deleted from VPS');
      }

      const match = file_path.match(/\/uploads\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
      if (match) {
        targetCategory = match[1];
        targetFilename = match[2];
      }
    }

    if (!targetFilename || !ALLOWED_CATEGORIES.includes(targetCategory)) {
      return error(res, 'Invalid filename or category', 400);
    }

    // Security check: Prevent path traversal (no '..' allowed)
    const sanitizedFilename = path.basename(targetFilename);
    const fullPath = path.join(STORAGE_ROOT_DIR, targetCategory, sanitizedFilename);

    // Verify file is inside storage root
    if (!fullPath.startsWith(STORAGE_ROOT_DIR)) {
      return error(res, 'Security violation: Path traversal prevented', 403);
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return success(res, null, 'File deleted from VPS storage successfully');
    }

    return error(res, 'File not found on VPS storage', 404);
  } catch (err) {
    console.error('deleteUploadedFile error:', err);
    return error(res, 'Failed to delete file');
  }
};

/**
 * POST /api/upload/verify-images - Server-authoritative filesystem check for image URLs
 */
const verifyImageExistence = async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [req.body?.url || req.query?.url].filter(Boolean);
    const results = {};

    for (const rawUrl of urls) {
      if (!rawUrl || typeof rawUrl !== 'string') continue;
      const url = rawUrl.trim();

      const match = url.match(/\/uploads\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
      if (match) {
        const category = match[1];
        const filename = match[2];
        const primaryPath = path.join(STORAGE_ROOT_DIR, category, filename);
        const secondaryPath = path.resolve(__dirname, '../../uploads', category, filename);

        const existsOnPrimary = fs.existsSync(primaryPath);
        const existsOnSecondary = fs.existsSync(secondaryPath);

        const exists = existsOnPrimary || existsOnSecondary;
        results[url] = {
          exists,
          isLocal: true,
          category,
          filename
        };
      } else if (url.includes('cloudinary.com') || /^https?:\/\//i.test(url)) {
        results[url] = {
          exists: true,
          isLocal: false
        };
      } else {
        results[url] = {
          exists: false,
          isLocal: false
        };
      }
    }

    return success(res, results, 'Image existence verified');
  } catch (err) {
    console.error('verifyImageExistence error:', err);
    return error(res, 'Failed to verify image existence');
  }
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteUploadedFile,
  verifyImageExistence,
};

