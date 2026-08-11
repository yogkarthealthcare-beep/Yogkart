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
 * POST /api/admin/upload - Handle single file upload
 */
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return error(res, 'No file uploaded', 400);
    }

    let category = (req.body.category || req.query.category || 'products').toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(category)) {
      category = 'other';
    }

    const filename = req.file.filename;
    const fileUrl = buildFileUrl(req, category, filename);

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
    console.error('uploadSingleFile error:', err);
    return error(res, 'Failed to upload file');
  }
};

/**
 * POST /api/admin/upload/multiple - Handle multiple files upload
 */
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return error(res, 'No files uploaded', 400);
    }

    let category = (req.body.category || req.query.category || 'products').toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(category)) {
      category = 'other';
    }

    const uploadedFiles = req.files.map(file => {
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

    return success(res, {
      files: uploadedFiles,
      urls: uploadedFiles.map(f => f.url)
    }, 'Files uploaded successfully');
  } catch (err) {
    console.error('uploadMultipleFiles error:', err);
    return error(res, 'Failed to upload files');
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

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteUploadedFile,
};
