/**
 * admin.products.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. paginated() — flat array + top-level total (Angular compatible)
 *  2. bulkUpdateStock — POST /products/bulk-stock ko GET /products/:id
 *     se conflict hota tha; route order fix kiya (routes file mein)
 *  3. createProduct — category_id null safe kiya (empty string → null)
 *  4. updateProduct — array fields (images, tags, key_benefits) properly
 *     handle honge chahe string ya array aaye
 *  5. getProducts — added `updated_at` in select for UI display
 */

const { query } = require('../config/database');
const { success, created, notFound, error, paginated } = require('../utils/response');

const slugify = (text) =>
  text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Array field — string ya array dono accept karo
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    // JSON string hai?
    try { return JSON.parse(val); } catch { return [val]; }
  }
  return [];
};

// ── GET /api/admin/products ────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(p.name ILIKE $${idx} OR p.brand ILIKE $${idx} OR p.slug ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category);
    }
    if (status === 'active')        conditions.push('p.is_active = TRUE');
    if (status === 'inactive')      conditions.push('p.is_active = FALSE');
    if (status === 'low_stock')     conditions.push('p.stock <= 5 AND p.stock > 0');
    if (status === 'out_of_stock')  conditions.push('p.stock = 0');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataParams = [...params, parseInt(limit), offset];

    const result = await query(
      `SELECT
         p.id, p.name, p.slug, p.brand,
         p.price, p.original_price, p.discount,
         p.stock, p.thumbnail,
         p.is_featured, p.is_new, p.is_best_seller,
         p.prescription, p.is_active,
         p.tags, p.images,
         p.created_at, p.updated_at,
         c.name AS category_name,
         p.category_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
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
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    return success(res, { product: result.rows[0] });
  } catch (err) {
    console.error('admin getProduct error:', err);
    return error(res, 'Failed to fetch product');
  }
};

// ── POST /api/admin/products ───────────────────────────
const createProduct = async (req, res) => {
  try {
    const {
      name, brand,
      price, original_price,
      category_id, subcategory,
      discount = 0, stock = 0,
      thumbnail,
      description, ingredients, dosage, side_effects,
      manufacturer, country_of_origin, pack_size,
      is_featured = false, is_new = false, is_best_seller = false,
      prescription = false, is_active = true,
    } = req.body;

    if (!name || !brand || !price || !original_price) {
      return error(res, 'name, brand, price, original_price are required', 400);
    }

    const images       = toArray(req.body.images);
    const key_benefits = toArray(req.body.key_benefits);
    const tags         = toArray(req.body.tags);

    // Empty string → null for FK
    const catId = category_id && category_id.trim() ? category_id.trim() : null;

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
        name, slug, catId, subcategory || null, brand,
        Number(price), Number(original_price), Number(discount), Number(stock),
        images, thumbnail || null,
        description || null, key_benefits, ingredients || null,
        dosage || null, side_effects || null,
        Boolean(is_featured), Boolean(is_new), Boolean(is_best_seller),
        tags, Boolean(prescription),
        manufacturer || null, country_of_origin || null, pack_size || null,
        Boolean(is_active),
      ]
    );

    return created(res, { product: result.rows[0] }, 'Product created successfully');
  } catch (err) {
    console.error('createProduct error:', err);
    if (err.code === '23505') return error(res, 'Product with this slug already exists', 409);
    if (err.code === '23503') return error(res, 'Invalid category_id', 400);
    return error(res, 'Failed to create product');
  }
};

// ── PUT /api/admin/products/:id ────────────────────────
const updateProduct = async (req, res) => {
  try {
    const existing = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return notFound(res, 'Product not found');

    const scalarFields = [
      'name', 'subcategory', 'brand',
      'price', 'original_price', 'discount', 'stock',
      'thumbnail', 'description', 'ingredients',
      'dosage', 'side_effects', 'is_featured', 'is_new',
      'is_best_seller', 'prescription', 'manufacturer',
      'country_of_origin', 'pack_size', 'is_active',
    ];
    const arrayFields = ['images', 'key_benefits', 'tags'];

    const updates = [];
    const params = [];
    let idx = 1;

    for (const field of scalarFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }
    for (const field of arrayFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(toArray(req.body[field]));
      }
    }
    // category_id separately (FK, empty string → null)
    if (req.body.category_id !== undefined) {
      updates.push(`category_id = $${idx++}`);
      params.push(
        req.body.category_id && req.body.category_id.trim()
          ? req.body.category_id.trim()
          : null
      );
    }

    if (!updates.length) return error(res, 'No fields to update', 400);

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return success(res, { product: result.rows[0] }, 'Product updated successfully');
  } catch (err) {
    console.error('updateProduct error:', err);
    if (err.code === '23503') return error(res, 'Invalid category_id', 400);
    return error(res, 'Failed to update product');
  }
};

// ── DELETE /api/admin/products/:id ────────────────────
const deleteProduct = async (req, res) => {
  try {
    const result = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return notFound(res, 'Product not found');

    // Soft delete — is_active = false
    await query(
      'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    return success(res, null, 'Product deactivated successfully');
  } catch (err) {
    console.error('deleteProduct error:', err);
    return error(res, 'Failed to deactivate product');
  }
};

// ── PATCH /api/admin/products/:id/toggle ──────────────
const toggleProduct = async (req, res) => {
  try {
    const result = await query(
      `UPDATE products
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, is_active`,
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    const p = result.rows[0];
    return success(res, p, `Product '${p.name}' ${p.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    console.error('toggleProduct error:', err);
    return error(res, 'Failed to toggle product status');
  }
};

// ── POST /api/admin/products/bulk-stock ──────────────
// IMPORTANT: Yeh route admin.routes.js mein /products/:id se PEHLE register karo
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, stock }]
    if (!Array.isArray(updates) || !updates.length) {
      return error(res, 'updates array required: [{ id, stock }]', 400);
    }

    const promises = updates.map(({ id, stock }) =>
      query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
        [Number(stock), id]
      )
    );
    await Promise.all(promises);

    return success(res, null, `Stock updated for ${updates.length} products`);
  } catch (err) {
    console.error('bulkUpdateStock error:', err);
    return error(res, 'Failed to bulk update stock');
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  bulkUpdateStock,
};
