const { query } = require('../config/database');
const { success, error, paginated } = require('../utils/response');

// ── GET /api/admin/inventory ───────────────────────────
const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, stock_status } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category);
    }
    if (stock_status === 'low')  conditions.push('p.stock > 0 AND p.stock <= 5');
    if (stock_status === 'out')  conditions.push('p.stock = 0');
    if (stock_status === 'good') conditions.push('p.stock > 5');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT p.id, p.name, p.brand, p.thumbnail, p.stock, p.price, p.is_active,
              c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.stock ASC, p.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('getInventory error:', err);
    return error(res, 'Failed to fetch inventory');
  }
};

// ── GET /api/admin/inventory/low-stock ─────────────────
const getLowStock = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.brand, p.thumbnail, p.stock, p.price,
              c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.stock <= 5 AND p.stock > 0 AND p.is_active = TRUE
       ORDER BY p.stock ASC`
    );
    return success(res, { products: result.rows, count: result.rows.length });
  } catch (err) {
    return error(res, 'Failed to fetch low stock products');
  }
};

// ── GET /api/admin/inventory/out-of-stock ──────────────
const getOutOfStock = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.brand, p.thumbnail, p.stock, p.price,
              c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.stock = 0 AND p.is_active = TRUE
       ORDER BY p.name ASC`
    );
    return success(res, { products: result.rows, count: result.rows.length });
  } catch (err) {
    return error(res, 'Failed to fetch out of stock products');
  }
};

// ── PATCH /api/admin/inventory/:id/stock ───────────────
const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      return error(res, 'Valid stock value required', 400);
    }

    const result = await query(
      'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, stock',
      [parseInt(stock), req.params.id]
    );
    if (!result.rows.length) return error(res, 'Product not found', 404);

    return success(res, result.rows[0], 'Stock updated');
  } catch (err) {
    return error(res, 'Failed to update stock');
  }
};

// ── POST /api/admin/inventory/bulk-update ─────────────
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{id, stock}]
    if (!Array.isArray(updates) || !updates.length) {
      return error(res, 'updates array required', 400);
    }

    const promises = updates.map(({ id, stock }) =>
      query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [stock, id])
    );
    await Promise.all(promises);

    return success(res, null, `${updates.length} products updated`);
  } catch (err) {
    return error(res, 'Failed to bulk update stock');
  }
};

module.exports = { getInventory, getLowStock, getOutOfStock, updateStock, bulkUpdateStock };
