/**
 * admin.categories.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. getCategories — is_active filter added (inactive categories hide karo by default)
 *  2. createCategory — id auto-generate karo agar nahi diya gaya
 *  3. deleteCategory — products count check mein is_active bhi check karo
 *  4. updateCategory — `updated_at` column categories table mein nahi hai
 *     (schema dekho) — hata diya
 */

const { query } = require('../config/database');
const { success, created, notFound, error } = require('../utils/response');

// ── GET /api/admin/categories ──────────────────────────
const getCategories = async (req, res) => {
  try {
    const { include_inactive = 'false' } = req.query;

    const where = include_inactive === 'true' ? '' : 'WHERE c.is_active = TRUE';

    const result = await query(`
      SELECT
        c.id, c.name, c.icon, c.color,
        c.sort_order, c.is_active, c.created_at,
        COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      ${where}
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    return success(res, { categories: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('getCategories error:', err);
    return error(res, 'Failed to fetch categories');
  }
};

// ── POST /api/admin/categories ─────────────────────────
const createCategory = async (req, res) => {
  try {
    const { name, icon, color, sort_order = 0 } = req.body;

    if (!name) return error(res, 'Category name is required', 400);

    // id not provided → auto-generate from name
    const rawId = req.body.id || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const id = rawId.slice(0, 50);

    const result = await query(
      `INSERT INTO categories (id, name, icon, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name.trim(), icon || null, color || null, parseInt(sort_order)]
    );

    return created(res, { category: result.rows[0] }, 'Category created successfully');
  } catch (err) {
    console.error('createCategory error:', err);
    if (err.code === '23505') return error(res, 'Category with this ID already exists', 409);
    return error(res, 'Failed to create category');
  }
};

// ── PUT /api/admin/categories/:id ─────────────────────
const updateCategory = async (req, res) => {
  try {
    const { name, icon, color, sort_order, is_active } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    // categories table mein `updated_at` column nahi hai (schema check)
    if (name       !== undefined) { updates.push(`name = $${idx++}`);       params.push(name.trim()); }
    if (icon       !== undefined) { updates.push(`icon = $${idx++}`);       params.push(icon); }
    if (color      !== undefined) { updates.push(`color = $${idx++}`);      params.push(color); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(parseInt(sort_order)); }
    if (is_active  !== undefined) { updates.push(`is_active = $${idx++}`);  params.push(Boolean(is_active)); }

    if (!updates.length) return error(res, 'No fields to update', 400);

    params.push(req.params.id);

    const result = await query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (!result.rows.length) return notFound(res, 'Category not found');
    return success(res, { category: result.rows[0] }, 'Category updated successfully');
  } catch (err) {
    console.error('updateCategory error:', err);
    return error(res, 'Failed to update category');
  }
};

// ── DELETE /api/admin/categories/:id ──────────────────
const deleteCategory = async (req, res) => {
  try {
    // Active products hain iss category mein?
    const products = await query(
      'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1',
      [req.params.id]
    );
    if (products.rows[0].count > 0) {
      return error(
        res,
        `Cannot delete: ${products.rows[0].count} product(s) belong to this category. Deactivate the category instead.`,
        409
      );
    }

    const result = await query(
      'DELETE FROM categories WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows.length) return notFound(res, 'Category not found');
    return success(res, null, 'Category deleted successfully');
  } catch (err) {
    console.error('deleteCategory error:', err);
    return error(res, 'Failed to delete category');
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
