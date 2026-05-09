const { query } = require('../config/database');
const { success, notFound, error, paginated } = require('../utils/response');

// ── GET /api/admin/users ───────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, role } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      conditions.push(`u.role = $${idx++}`);
      params.push(role);
    } else {
      // Default: only customers
      conditions.push(`u.role = 'customer'`);
    }

    if (status === 'active')   conditions.push('u.is_active = TRUE');
    if (status === 'inactive') conditions.push('u.is_active = FALSE');

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) FROM users u ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              COUNT(o.id)::int AS total_orders,
              COALESCE(SUM(o.total), 0) AS total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('admin getUsers error:', err);
    return error(res, 'Failed to fetch users');
  }
};

// ── GET /api/admin/users/:id ───────────────────────────
const getUser = async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (!userRes.rows.length) return notFound(res, 'User not found');

    // Recent orders
    const ordersRes = await query(
      `SELECT o.id, o.status, o.total, o.payment_method, o.created_at,
              COUNT(oi.id)::int AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    // Addresses
    const addrRes = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC',
      [req.params.id]
    );

    return success(res, {
      user:      userRes.rows[0],
      orders:    ordersRes.rows,
      addresses: addrRes.rows,
    });
  } catch (err) {
    return error(res, 'Failed to fetch user');
  }
};

// ── PATCH /api/admin/users/:id/toggle ─────────────────
const toggleUser = async (req, res) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 AND role != $2 RETURNING id, is_active',
      [req.params.id, 'admin']
    );
    if (!result.rows.length) return notFound(res, 'User not found or cannot modify admin');
    return success(
      res,
      result.rows[0],
      result.rows[0].is_active ? 'User activated' : 'User blocked'
    );
  } catch (err) {
    return error(res, 'Failed to toggle user status');
  }
};

// ── GET /api/admin/users/stats ─────────────────────────
const getUserStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*)                                                   AS total_users,
        COUNT(*) FILTER (WHERE is_active = TRUE)                  AS active_users,
        COUNT(*) FILTER (WHERE is_active = FALSE)                 AS blocked_users,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)  AS new_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
      FROM users WHERE role = 'customer'
    `);
    return success(res, stats.rows[0]);
  } catch (err) {
    return error(res, 'Failed to fetch user stats');
  }
};

module.exports = { getUsers, getUser, toggleUser, getUserStats };
