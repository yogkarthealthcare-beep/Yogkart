const { query } = require('../config/database');
const { success, error, badRequest, notFound, conflict } = require('../utils/response');

const isValidUrl = (stringUrl) => {
  try {
    const url = new URL(stringUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

// ── GET /api/admin/online-selling-platforms/platforms (Admin) ───────────────
const getPlatforms = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM selling_platforms ORDER BY display_order ASC, id ASC`);
    return success(res, { platforms: result.rows });
  } catch (err) {
    console.error('[Marketplace Controller] getPlatforms error:', err);
    return error(res, 'Failed to fetch selling platforms');
  }
};

// ── POST /api/admin/online-selling-platforms/platforms (Admin) ──────────────
const createPlatform = async (req, res) => {
  try {
    const { name, logo, website_url, display_order, is_active } = req.body;
    if (!name || !name.trim()) {
      return badRequest(res, 'Platform name is required');
    }

    if (website_url && !isValidUrl(website_url)) {
      return badRequest(res, 'Please provide a valid HTTP or HTTPS website URL');
    }

    const check = await query(`SELECT id FROM selling_platforms WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (check.rows.length > 0) {
      return conflict(res, `Platform '${name}' already exists`);
    }

    const result = await query(
      `INSERT INTO selling_platforms (name, logo, website_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), logo || '', website_url || '', parseInt(display_order) || 0, is_active !== false]
    );

    return success(res, { platform: result.rows[0] }, 'Platform created successfully');
  } catch (err) {
    console.error('[Marketplace Controller] createPlatform error:', err);
    return error(res, 'Failed to create platform');
  }
};

// ── PUT /api/admin/online-selling-platforms/platforms/:id (Admin) ───────────
const updatePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo, website_url, display_order, is_active } = req.body;

    if (website_url && !isValidUrl(website_url)) {
      return badRequest(res, 'Please provide a valid HTTP or HTTPS website URL');
    }

    const result = await query(
      `UPDATE selling_platforms 
       SET name = COALESCE($1, name),
           logo = COALESCE($2, logo),
           website_url = COALESCE($3, website_url),
           display_order = COALESCE($4, display_order),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [name?.trim(), logo, website_url, display_order !== undefined ? parseInt(display_order) : undefined, is_active, id]
    );

    if (result.rows.length === 0) {
      return notFound(res, 'Platform not found');
    }

    return success(res, { platform: result.rows[0] }, 'Platform updated successfully');
  } catch (err) {
    console.error('[Marketplace Controller] updatePlatform error:', err);
    return error(res, 'Failed to update platform');
  }
};

// ── DELETE /api/admin/online-selling-platforms/platforms/:id (Admin) ────────
const deletePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM selling_platforms WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return notFound(res, 'Platform not found');
    }
    return success(res, null, 'Platform deleted successfully');
  } catch (err) {
    console.error('[Marketplace Controller] deletePlatform error:', err);
    return error(res, 'Failed to delete platform');
  }
};

// ── GET /api/admin/online-selling-platforms (Admin — Mappings List) ─────────
const getMappings = async (req, res) => {
  try {
    const { productId, platformId, status, search } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (productId) {
      queryParams.push(parseInt(productId));
      whereConditions.push(`pmm.product_id = $${queryParams.length}`);
    }

    if (platformId) {
      queryParams.push(parseInt(platformId));
      whereConditions.push(`pmm.platform_id = $${queryParams.length}`);
    }

    if (status === 'active') {
      whereConditions.push(`pmm.is_active = TRUE`);
    } else if (status === 'inactive') {
      whereConditions.push(`pmm.is_active = FALSE`);
    }

    if (search) {
      queryParams.push(`%${search.trim()}%`);
      whereConditions.push(`(p.name ILIKE $${queryParams.length} OR pmm.external_product_id ILIKE $${queryParams.length} OR sp.name ILIKE $${queryParams.length})`);
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT 
        pmm.id,
        pmm.product_id,
        pmm.platform_id,
        pmm.external_product_id,
        pmm.product_url,
        pmm.is_active,
        pmm.display_order,
        pmm.created_at,
        pmm.updated_at,
        p.name AS product_name,
        p.sku AS product_sku,
        p.images AS product_images,
        p.price AS product_price,
        p.category AS product_category,
        sp.name AS platform_name,
        sp.logo AS platform_logo
       FROM product_marketplace_mappings pmm
       JOIN products p ON pmm.product_id = p.id
       JOIN selling_platforms sp ON pmm.platform_id = sp.id
       ${whereClause}
       ORDER BY pmm.display_order ASC, pmm.created_at DESC`,
      queryParams
    );

    return success(res, { mappings: result.rows });
  } catch (err) {
    console.error('[Marketplace Controller] getMappings error:', err);
    return error(res, 'Failed to fetch marketplace mappings');
  }
};

// ── POST /api/admin/online-selling-platforms (Admin — Create Mapping) ───────
const createMapping = async (req, res) => {
  try {
    const { product_id, platform_id, external_product_id, product_url, is_active, display_order } = req.body;

    if (!product_id || !platform_id || !product_url) {
      return badRequest(res, 'Product ID, Platform ID, and Product URL are required');
    }

    if (!isValidUrl(product_url)) {
      return badRequest(res, 'Please enter a valid HTTP or HTTPS product URL (e.g. https://www.amazon.in/dp/...)');
    }

    // Check duplicate mapping
    const existing = await query(
      `SELECT pmm.id, sp.name AS platform_name 
       FROM product_marketplace_mappings pmm
       JOIN selling_platforms sp ON pmm.platform_id = sp.id
       WHERE pmm.product_id = $1 AND pmm.platform_id = $2`,
      [product_id, platform_id]
    );

    if (existing.rows.length > 0) {
      const platformName = existing.rows[0].platform_name || 'this platform';
      return conflict(res, `This product is already mapped to ${platformName}.`);
    }

    const result = await query(
      `INSERT INTO product_marketplace_mappings
        (product_id, platform_id, external_product_id, product_url, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        parseInt(product_id),
        parseInt(platform_id),
        external_product_id ? external_product_id.trim() : '',
        product_url.trim(),
        is_active !== false,
        parseInt(display_order) || 0
      ]
    );

    return success(res, { mapping: result.rows[0] }, 'Product marketplace mapping created successfully');
  } catch (err) {
    console.error('[Marketplace Controller] createMapping error:', err);
    return error(res, 'Failed to create marketplace mapping');
  }
};

// ── PUT /api/admin/online-selling-platforms/:id (Admin — Update Mapping) ────
const updateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { external_product_id, product_url, is_active, display_order } = req.body;

    if (product_url && !isValidUrl(product_url)) {
      return badRequest(res, 'Please enter a valid HTTP or HTTPS product URL');
    }

    const result = await query(
      `UPDATE product_marketplace_mappings
       SET external_product_id = COALESCE($1, external_product_id),
           product_url = COALESCE($2, product_url),
           is_active = COALESCE($3, is_active),
           display_order = COALESCE($4, display_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [
        external_product_id !== undefined ? external_product_id.trim() : undefined,
        product_url !== undefined ? product_url.trim() : undefined,
        is_active,
        display_order !== undefined ? parseInt(display_order) : undefined,
        id
      ]
    );

    if (result.rows.length === 0) {
      return notFound(res, 'Marketplace mapping not found');
    }

    return success(res, { mapping: result.rows[0] }, 'Mapping updated successfully');
  } catch (err) {
    console.error('[Marketplace Controller] updateMapping error:', err);
    return error(res, 'Failed to update marketplace mapping');
  }
};

// ── DELETE /api/admin/online-selling-platforms/:id (Admin — Delete Mapping) ──
const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM product_marketplace_mappings WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return notFound(res, 'Marketplace mapping not found');
    }
    return success(res, null, 'Mapping deleted successfully');
  } catch (err) {
    console.error('[Marketplace Controller] deleteMapping error:', err);
    return error(res, 'Failed to delete marketplace mapping');
  }
};

// ── GET /api/products/:productId/marketplaces (Public — Available Platforms) ─
const getProductMarketplaces = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await query(
      `SELECT 
        pmm.id,
        pmm.external_product_id,
        pmm.product_url,
        pmm.display_order,
        sp.id AS platform_id,
        sp.name AS platform_name,
        sp.logo AS platform_logo,
        sp.website_url AS platform_website_url
       FROM product_marketplace_mappings pmm
       JOIN selling_platforms sp ON pmm.platform_id = sp.id
       JOIN products p ON pmm.product_id = p.id
       WHERE pmm.product_id = $1 
         AND pmm.is_active = TRUE 
         AND sp.is_active = TRUE
         AND (p.is_active = TRUE OR p.is_active IS NULL)
       ORDER BY pmm.display_order ASC, sp.display_order ASC, sp.name ASC`,
      [productId]
    );

    return success(res, { marketplaces: result.rows });
  } catch (err) {
    console.error('[Marketplace Controller] getProductMarketplaces error:', err);
    return error(res, 'Failed to fetch product marketplaces');
  }
};

module.exports = {
  getPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  getMappings,
  createMapping,
  updateMapping,
  deleteMapping,
  getProductMarketplaces
};
