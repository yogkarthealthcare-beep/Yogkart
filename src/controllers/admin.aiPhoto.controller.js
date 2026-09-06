const { query } = require('../config/database');
const { success, error, notFound } = require('../utils/response');
const { generateProductAiPhoto } = require('../services/aiPhotoStudio.service');

/**
 * POST /api/admin/ai-photo/generate
 * Generates an AI product photograph with automatic YogKart brand logo watermark
 */
const generatePhoto = async (req, res) => {
  try {
    const { productId, productName, templateType, customPrompt } = req.body;

    let targetName = productName;
    if (!targetName && productId) {
      const prodRes = await query('SELECT name FROM products WHERE id = $1', [productId]);
      if (prodRes.rows.length) {
        targetName = prodRes.rows[0].name;
      }
    }

    if (!targetName) {
      return error(res, 'Product Name is required to generate photo', 400);
    }

    const result = await generateProductAiPhoto({
      productName: targetName,
      templateType: templateType || 'Main Product',
      customPrompt: customPrompt || ''
    });

    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${result.imageUrl}`;

    return success(res, {
      ...result,
      fullUrl
    }, 'AI Product photograph generated successfully with YogKart branding');
  } catch (err) {
    console.error('❌ generatePhoto error:', err);
    return error(res, err.message || 'Failed to generate AI product photo', 500);
  }
};

/**
 * POST /api/admin/ai-photo/apply
 * Applies the generated photo as the product's main thumbnail or gallery image
 */
const applyPhotoToProduct = async (req, res) => {
  try {
    const { productId, imageUrl, target = 'thumbnail' } = req.body;

    if (!productId || !imageUrl) {
      return error(res, 'Product ID and Image URL are required', 400);
    }

    const prodRes = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (!prodRes.rows.length) {
      return notFound(res, 'Product not found');
    }

    const product = prodRes.rows[0];
    let currentImages = [];
    if (Array.isArray(product.images)) {
      currentImages = product.images;
    } else if (typeof product.images === 'string') {
      try {
        currentImages = JSON.parse(product.images);
      } catch {
        currentImages = product.images.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    let updatedProduct;

    if (target === 'thumbnail') {
      // Set as main thumbnail and also ensure it's in images[0]
      if (!currentImages.includes(imageUrl)) {
        currentImages.unshift(imageUrl);
      }
      const updateRes = await query(
        `UPDATE products 
         SET thumbnail = $1, images = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [imageUrl, JSON.stringify(currentImages), productId]
      );
      updatedProduct = updateRes.rows[0];
    } else {
      // Add to gallery
      if (!currentImages.includes(imageUrl)) {
        currentImages.push(imageUrl);
      }
      const updateRes = await query(
        `UPDATE products 
         SET images = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [JSON.stringify(currentImages), productId]
      );
      updatedProduct = updateRes.rows[0];
    }

    return success(res, { product: updatedProduct }, `Product image updated as ${target} successfully`);
  } catch (err) {
    console.error('❌ applyPhotoToProduct error:', err);
    return error(res, err.message || 'Failed to apply photo to product', 500);
  }
};

module.exports = {
  generatePhoto,
  applyPhotoToProduct
};
