const { query } = require('../config/database');
const { success, error, notFound } = require('../utils/response');
const {
  AMAZON_7_TEMPLATES,
  generateProductAiPhoto,
  generateAmazon7ImageSet
} = require('../services/aiPhotoStudio.service');

/**
 * GET /api/admin/ai-photo/templates
 * Returns the list of standard Amazon 7 image templates
 */
const getTemplates = async (req, res) => {
  return success(res, { templates: AMAZON_7_TEMPLATES }, 'Amazon 7 templates retrieved');
};

/**
 * POST /api/admin/ai-photo/generate
 * Generates a single AI product photograph with automatic YogKart brand logo watermark
 */
const generatePhoto = async (req, res) => {
  try {
    const { productId, productName, templateType, customPrompt, geminiApiKey } = req.body;

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
      templateType: templateType || 'Main Product (Hero Shot)',
      customPrompt: customPrompt || '',
      geminiApiKey: geminiApiKey || null
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
 * POST /api/admin/ai-photo/amazon-7-set
 * Generates the complete 7-image Amazon set for a single product or batch of products
 */
const generateAmazon7Set = async (req, res) => {
  try {
    const { productId, productName, products, geminiApiKey, customPrompt } = req.body;

    // Bulk Mode: multiple products
    if (Array.isArray(products) && products.length > 0) {
      console.log(`🚀 [AI Studio] Starting Bulk 7-Set Generation for ${products.length} products...`);
      const bulkResults = [];

      for (const item of products) {
        let name = item.productName || item.name;
        const pId = item.productId || item.id;

        if (!name && pId) {
          const dbP = await query('SELECT name FROM products WHERE id = $1', [pId]);
          if (dbP.rows.length) name = dbP.rows[0].name;
        }

        if (name) {
          const singleSet = await generateAmazon7ImageSet({
            productName: name,
            productId: pId,
            geminiApiKey,
            customPrompt
          });
          bulkResults.push(singleSet);
        }
      }

      return success(res, {
        batchCount: bulkResults.length,
        results: bulkResults
      }, `Generated Amazon 7-Image sets for ${bulkResults.length} products`);
    }

    // Single Product Mode
    let targetName = productName;
    let targetId = productId;
    if (!targetName && targetId) {
      const prodRes = await query('SELECT name FROM products WHERE id = $1', [targetId]);
      if (prodRes.rows.length) {
        targetName = prodRes.rows[0].name;
      }
    }

    if (!targetName) {
      return error(res, 'Product Name or Product ID is required', 400);
    }

    const setResults = await generateAmazon7ImageSet({
      productName: targetName,
      productId: targetId,
      geminiApiKey,
      customPrompt
    });

    return success(res, setResults, `Generated Amazon 7-image suite for ${targetName}`);
  } catch (err) {
    console.error('❌ generateAmazon7Set error:', err);
    return error(res, err.message || 'Failed to generate Amazon 7-image set', 500);
  }
};

/**
 * POST /api/admin/ai-photo/apply
 * Applies a single photo as the product's main thumbnail or gallery image
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

/**
 * POST /api/admin/ai-photo/apply-7-set
 * 1-Click updates Product thumbnail (Image 1) and full images array (Images 1-7) in PostgreSQL
 */
const applyAmazon7SetToProduct = async (req, res) => {
  try {
    const { productId, images } = req.body;

    if (!productId) {
      return error(res, 'Product ID is required', 400);
    }

    if (!Array.isArray(images) || images.length === 0) {
      return error(res, 'At least 1 image URL is required', 400);
    }

    const validUrls = images.filter(img => typeof img === 'string' && img.trim());
    if (validUrls.length === 0) {
      return error(res, 'No valid image URLs provided', 400);
    }

    const mainThumbnail = validUrls[0];

    const updateRes = await query(
      `UPDATE products
       SET thumbnail = $1, images = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, thumbnail, images`,
      [mainThumbnail, JSON.stringify(validUrls), productId]
    );

    if (!updateRes.rows.length) {
      return notFound(res, 'Product not found in database');
    }

    return success(res, {
      product: updateRes.rows[0]
    }, 'Applied 7 Amazon images to product thumbnail and gallery successfully');
  } catch (err) {
    console.error('❌ applyAmazon7SetToProduct error:', err);
    return error(res, err.message || 'Failed to apply Amazon 7-set to product', 500);
  }
};

module.exports = {
  getTemplates,
  generatePhoto,
  generateAmazon7Set,
  applyPhotoToProduct,
  applyAmazon7SetToProduct
};
