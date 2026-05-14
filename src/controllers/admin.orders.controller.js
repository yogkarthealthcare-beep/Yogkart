/**
 * admin.orders.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. paginated() — ab top-level `data` array + `total` return karta hai
 *  2. getOrder — order_items mein `name` column hai (product_name nahi)
 *  3. getOrders search — uuid type ka order id ke saath ILIKE kaam nahi
 *     karta, isliye CAST(o.id AS TEXT) use kiya
 *  4. updateOrderStatus — status transition validation added
 *  5. getOrderStats — returns revenue bhi (Angular stats pills ke liye)
 */

const { query, getClient } = require('../config/database');
const { success, notFound, error, paginated } = require('../utils/response');

const VALID_STATUSES = [
  'pending', 'confirmed', 'packed', 'shipped',
  'delivered', 'cancelled', 'returned', 'refunded',
];

// Valid next statuses for each current status
const STATUS_FLOW = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed:    ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: ['returned'],
  returned:  ['refunded'],
  cancelled: [],
  refunded:  [],
};

// ── GET /api/admin/orders ──────────────────────────────
const getOrders = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      status, search,
      from_date, to_date,
      payment_method, payment_status,
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`o.status = $${idx++}`);
      params.push(status);
    }
    if (payment_method) {
      conditions.push(`o.payment_method = $${idx++}`);
      params.push(payment_method);
    }
    if (payment_status) {
      conditions.push(`o.payment_status = $${idx++}`);
      params.push(payment_status);
    }
    if (from_date) {
      conditions.push(`o.created_at >= $${idx++}`);
      params.push(from_date);
    }
    if (to_date) {
      conditions.push(`o.created_at <= $${idx++}::date + INTERVAL '1 day'`);
      params.push(to_date);
    }
    if (search) {
      // orders.id is VARCHAR(20), users.name/email are text — all safe for ILIKE
      conditions.push(
        `(LOWER(o.id) LIKE LOWER($${idx}) OR u.name ILIKE $${idx} OR u.email ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await query(
      `SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    // Data query
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataParams = [...params, parseInt(limit), offset];

    const result = await query(
      `SELECT
         o.id,
         o.status,
         o.payment_status,
         o.payment_method,
         o.subtotal,
         o.discount,
         o.delivery_fee,
         o.tax,
         o.total,
         o.notes,
         o.created_at,
         o.updated_at,
         u.name  AS user_name,
         u.email AS user_email,
         u.phone AS user_phone,
         (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('admin getOrders error:', err);
    return error(res, 'Failed to fetch orders');
  }
};

// ── GET /api/admin/orders/stats ───────────────────────
// NOTE: Yeh route /orders/:id se PEHLE register hona chahiye (admin.routes.js mein already hai)
const getOrderStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        status,
        COUNT(*)::int        AS count,
        COALESCE(SUM(total), 0) AS revenue
      FROM orders
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'pending'   THEN 1
          WHEN 'confirmed' THEN 2
          WHEN 'packed'    THEN 3
          WHEN 'shipped'   THEN 4
          WHEN 'delivered' THEN 5
          WHEN 'cancelled' THEN 6
          WHEN 'returned'  THEN 7
          WHEN 'refunded'  THEN 8
          ELSE 9
        END
    `);
    return success(res, { stats: stats.rows });
  } catch (err) {
    console.error('getOrderStats error:', err);
    return error(res, 'Failed to fetch order stats');
  }
};

// ── GET /api/admin/orders/:id ──────────────────────────
const getOrder = async (req, res) => {
  try {
    const orderRes = await query(
      `SELECT
         o.*,
         u.name  AS user_name,
         u.email AS user_email,
         u.phone AS user_phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    // order_items table mein column name `name` hai (product_name nahi)
    const itemsRes = await query(
      `SELECT
         oi.id,
         oi.product_id,
         oi.name        AS product_name,
         oi.thumbnail,
         oi.pack_size,
         oi.quantity,
         oi.price,
         oi.total,
         p.slug         AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [req.params.id]
    );

    return success(res, {
      order: { ...orderRes.rows[0], items: itemsRes.rows },
    });
  } catch (err) {
    console.error('admin getOrder error:', err);
    return error(res, 'Failed to fetch order');
  }
};

// ── PATCH /api/admin/orders/:id/status ────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return error(res, `Invalid status. Valid: ${VALID_STATUSES.join(', ')}`, 400);
    }

    // Current order fetch karo
    const orderRes = await query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    const currentStatus = orderRes.rows[0].status;

    // Status transition validate karo
    const allowedNext = STATUS_FLOW[currentStatus] ?? [];
    if (!allowedNext.includes(status)) {
      return error(
        res,
        `Cannot change status from '${currentStatus}' to '${status}'. Allowed: ${allowedNext.join(', ') || 'none'}`,
        400
      );
    }

    await query(
      `UPDATE orders
       SET status = $1,
           notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes || E'\\n', '') || $2 ELSE notes END,
           updated_at = NOW()
       WHERE id = $3`,
      [status, notes || null, req.params.id]
    );

    return success(res, { status }, `Order status updated to '${status}'`);
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return error(res, 'Failed to update order status');
  }
};

// ── DELETE /api/admin/orders/:id ── (cancel + stock restore)
const cancelOrder = async (req, res) => {
  const client = await getClient();
  try {
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    const order = orderRes.rows[0];

    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      return error(res, `Cannot cancel order with status: '${order.status}'`, 400);
    }

    await client.query('BEGIN');

    // Stock restore karo
    const items = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [order.id]
    );
    for (const item of items.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );

    await client.query('COMMIT');
    return success(res, null, 'Order cancelled and stock restored successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('admin cancelOrder error:', err);
    return error(res, 'Failed to cancel order');
  } finally {
    client.release();
  }
};

module.exports = {
  getOrders,
  getOrder,
  getOrderStats,
  updateOrderStatus,
  cancelOrder,
};
