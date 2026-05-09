const { query } = require('../config/database');
const { success, created, notFound, error, paginated } = require('../utils/response');

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ── GET /api/admin/products ────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx} OR p.slug ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category);
    }
    if (status === 'active')   conditions.push('p.is_active = TRUE');
    if (status === 'inactive') conditions.push('p.is_active = FALSE');
    if (status === 'low_stock') conditions.push('p.stock <= 5 AND p.stock > 0');
    if (status === 'out_of_stock') conditions.push('p.stock = 0');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('admin getProducts error:', err);
    return error(res, 'Failed to fetch products');
  }
};

// ── GET /api/admin/products/:id ────────────────────────
const getProduct = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    return success(res, { product: result.rows[0] });
  } catch (err) {
    return error(res, 'Failed to fetch product');
  }
};

// ── POST /api/admin/products ───────────────────────────
const createProduct = async (req, res) => {
  try {
    const {
      name, category_id, subcategory, brand,
      price, original_price, discount = 0, stock = 0,
      images = [], thumbnail,
      description, key_benefits = [], ingredients, dosage, side_effects,
      is_featured = false, is_new = false, is_best_seller = false,
      tags = [], prescription = false,
      manufacturer, country_of_origin, pack_size,
      is_active = true,
    } = req.body;

    if (!name || !brand || !price || !original_price) {
      return error(res, 'name, brand, price, original_price are required', 400);
    }

    const slug = slugify(name) + '-' + Date.now();

    const result = await query(
      `INSERT INTO products (
        name, slug, category_id, subcategory, brand,
        price, original_price, discount, stock,
        images, thumbnail,
        description, key_benefits, ingredients, dosage, side_effects,
        is_featured, is_new, is_best_seller, tags, prescription,
        manufacturer, country_of_origin, pack_size, is_active
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,
        $22,$23,$24,$25
      ) RETURNING *`,
      [
        name, slug, category_id, subcategory, brand,
        price, original_price, discount, stock,
        images, thumbnail,
        description, key_benefits, ingredients, dosage, side_effects,
        is_featured, is_new, is_best_seller, tags, prescription,
        manufacturer, country_of_origin, pack_size, is_active,
      ]
    );

    return created(res, { product: result.rows[0] }, 'Product created successfully');
  } catch (err) {
    console.error('createProduct error:', err);
    if (err.code === '23505') return error(res, 'Product slug already exists', 409);
    return error(res, 'Failed to create product');
  }
};

// ── PUT /api/admin/products/:id ────────────────────────
const updateProduct = async (req, res) => {
  try {
    const existing = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return notFound(res, 'Product not found');

    const fields = [
      'name', 'category_id', 'subcategory', 'brand',
      'price', 'original_price', 'discount', 'stock',
      'images', 'thumbnail', 'description', 'key_benefits',
      'ingredients', 'dosage', 'side_effects',
      'is_featured', 'is_new', 'is_best_seller',
      'tags', 'prescription', 'manufacturer',
      'country_of_origin', 'pack_size', 'is_active',
    ];

    const updates = [];
    const params = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }

    if (!updates.length) return error(res, 'No fields to update', 400);

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return success(res, { product: result.rows[0] }, 'Product updated');
  } catch (err) {
    console.error('updateProduct error:', err);
    return error(res, 'Failed to update product');
  }
};

// ── DELETE /api/admin/products/:id ────────────────────
const deleteProduct = async (req, res) => {
  try {
    const result = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return notFound(res, 'Product not found');

    // Soft delete
    await query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    return success(res, null, 'Product deactivated');
  } catch (err) {
    return error(res, 'Failed to delete product');
  }
};

// ── PATCH /api/admin/products/:id/toggle ──────────────
const toggleProduct = async (req, res) => {
  try {
    const result = await query(
      'UPDATE products SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active',
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    return success(res, result.rows[0], `Product ${result.rows[0].is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    return error(res, 'Failed to toggle product');
  }
};

// ── PATCH /api/admin/products/bulk-stock ──────────────
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, stock }]
    if (!Array.isArray(updates) || !updates.length) {
      return error(res, 'updates array required', 400);
    }

    const promises = updates.map(({ id, stock }) =>
      query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [stock, id])
    );
    await Promise.all(promises);

    return success(res, null, `${updates.length} products stock updated`);
  } catch (err) {
    return error(res, 'Failed to bulk update stock');
  }
};

module.exports = {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, toggleProduct, bulkUpdateStock,
};
