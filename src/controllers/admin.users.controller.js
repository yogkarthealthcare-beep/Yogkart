/**
 * admin.users.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. paginated() — flat array + top-level total
 *  2. getUser — addresses table mein column name `line1` hai
 *     (address_line1 nahi) — schema se confirm kiya
 *  3. getUserStats — response shape fix: flat object (Angular direct use karta hai)
 *  4. getUsers — total_spent ka type fix (COALESCE ensures numeric)
 */

const { query } = require('../config/database');
const { success, notFound, error, paginated } = require('../utils/response');

// ── GET /api/admin/users/stats ─────────────────────────
// NOTE: Yeh route /users/:id se PEHLE admin.routes.js mein register hai — sahi hai
const getUserStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*)::int                                                   AS total_users,
        COUNT(*) FILTER (WHERE is_active = TRUE)::int                  AS active_users,
        COUNT(*) FILTER (WHERE is_active = FALSE)::int                 AS blocked_users,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::int   AS new_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_this_week
      FROM users
      WHERE role = 'customer'
    `);
    // Angular AdminDataService: res.data expected as flat object
    return success(res, stats.rows[0]);
  } catch (err) {
    console.error('getUserStats error:', err);
    return error(res, 'Failed to fetch user stats');
  }
};

// ── GET /api/admin/users ───────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, role } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Default: only customers unless role specified
    if (role) {
      conditions.push(`u.role = $${idx++}`);
      params.push(role);
    } else {
      conditions.push(`u.role = 'customer'`);
    }

    if (status === 'active')   conditions.push('u.is_active = TRUE');
    if (status === 'inactive') conditions.push('u.is_active = FALSE');

    if (search) {
      conditions.push(
        `(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataParams = [...params, parseInt(limit), offset];

    const result = await query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.role,
         u.is_active, u.created_at,
         COUNT(o.id)::int               AS total_orders,
         COALESCE(SUM(o.total), 0)::numeric AS total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
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
    // User details
    const userRes = await query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.role,
         u.is_active, u.created_at,
         COUNT(o.id)::int               AS total_orders,
         COALESCE(SUM(o.total), 0)::numeric AS total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!userRes.rows.length) return notFound(res, 'User not found');

    // Recent orders (last 10)
    const ordersRes = await query(
      `SELECT
         o.id, o.status, o.total, o.payment_method,
         o.payment_status, o.created_at,
         COUNT(oi.id)::int AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    // Addresses — schema mein columns: line1, line2, city, state, pincode
    const addrRes = await query(
      `SELECT
         id, name, phone,
         line1 AS address_line1,
         line2 AS address_line2,
         city, state, pincode,
         is_default, created_at
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.params.id]
    );

    return success(res, {
      user:      userRes.rows[0],
      orders:    ordersRes.rows,
      addresses: addrRes.rows,
    });
  } catch (err) {
    console.error('admin getUser error:', err);
    return error(res, 'Failed to fetch user details');
  }
};

// ── PATCH /api/admin/users/:id/toggle ─────────────────
const toggleUser = async (req, res) => {
  try {
    const result = await query(
      `UPDATE users
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND role != 'admin' AND role != 'super_admin'
       RETURNING id, name, is_active`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return notFound(res, 'User not found or cannot modify admin accounts');
    }
    const u = result.rows[0];
    return success(
      res,
      u,
      u.is_active ? `User '${u.name}' activated` : `User '${u.name}' blocked`
    );
  } catch (err) {
    console.error('toggleUser error:', err);
    return error(res, 'Failed to toggle user status');
  }
};

module.exports = { getUsers, getUser, toggleUser, getUserStats };
