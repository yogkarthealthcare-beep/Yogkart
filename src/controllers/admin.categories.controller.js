const { query } = require('../config/database');
const { success, created, notFound, error } = require('../utils/response');

// ── GET /api/admin/categories ──────────────────────────
const getCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    return success(res, { categories: result.rows });
  } catch (err) {
    return error(res, 'Failed to fetch categories');
  }
};

// ── POST /api/admin/categories ─────────────────────────
const createCategory = async (req, res) => {
  try {
    const { id, name, icon, color, sort_order = 0 } = req.body;
    if (!id || !name) return error(res, 'id and name are required', 400);

    const result = await query(
      'INSERT INTO categories (id, name, icon, color, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id.toLowerCase().replace(/\s+/g, '-'), name, icon, color, sort_order]
    );
    return created(res, { category: result.rows[0] }, 'Category created');
  } catch (err) {
    if (err.code === '23505') return error(res, 'Category ID already exists', 409);
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

    if (name !== undefined)       { updates.push(`name = $${idx++}`);       params.push(name); }
    if (icon !== undefined)       { updates.push(`icon = $${idx++}`);       params.push(icon); }
    if (color !== undefined)      { updates.push(`color = $${idx++}`);      params.push(color); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(sort_order); }
    if (is_active !== undefined)  { updates.push(`is_active = $${idx++}`);  params.push(is_active); }

    if (!updates.length) return error(res, 'No fields to update', 400);

    params.push(req.params.id);
    const result = await query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows.length) return notFound(res, 'Category not found');
    return success(res, { category: result.rows[0] }, 'Category updated');
  } catch (err) {
    return error(res, 'Failed to update category');
  }
};

// ── DELETE /api/admin/categories/:id ──────────────────
const deleteCategory = async (req, res) => {
  try {
    // Check if category has products
    const products = await query('SELECT COUNT(*) FROM products WHERE category_id = $1', [req.params.id]);
    if (parseInt(products.rows[0].count) > 0) {
      return error(res, 'Cannot delete category with products. Deactivate it instead.', 409);
    }

    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    return success(res, null, 'Category deleted');
  } catch (err) {
    return error(res, 'Failed to delete category');
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
