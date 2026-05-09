const { query, getClient } = require('../config/database');
const { success, notFound, error, paginated } = require('../utils/response');

const VALID_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];

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
      conditions.push(`(o.id ILIKE $${idx} OR u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('admin getOrders error:', err);
    return error(res, 'Failed to fetch orders');
  }
};

// ── GET /api/admin/orders/:id ──────────────────────────
const getOrder = async (req, res) => {
  try {
    const orderRes = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    const itemsRes = await query(
      `SELECT oi.*, p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );

    return success(res, { order: { ...orderRes.rows[0], items: itemsRes.rows } });
  } catch (err) {
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

    const orderRes = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    await query(
      `UPDATE orders SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3`,
      [status, notes, req.params.id]
    );

    return success(res, null, `Order status updated to ${status}`);
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return error(res, 'Failed to update order status');
  }
};

// ── DELETE /api/admin/orders/:id ── (soft cancel with stock restore)
const cancelOrder = async (req, res) => {
  const client = await getClient();
  try {
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!orderRes.rows.length) return notFound(res, 'Order not found');

    const order = orderRes.rows[0];
    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      return error(res, `Cannot cancel order with status: ${order.status}`, 400);
    }

    await client.query('BEGIN');

    // Restore stock
    const items = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    for (const item of items.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );

    await client.query('COMMIT');
    return success(res, null, 'Order cancelled and stock restored');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('admin cancelOrder error:', err);
    return error(res, 'Failed to cancel order');
  } finally {
    client.release();
  }
};

// ── GET /api/admin/orders/stats ───────────────────────
const getOrderStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        status,
        COUNT(*)         AS count,
        SUM(total)       AS revenue
      FROM orders
      GROUP BY status
    `);
    return success(res, { stats: stats.rows });
  } catch (err) {
    return error(res, 'Failed to fetch order stats');
  }
};

module.exports = { getOrders, getOrder, updateOrderStatus, cancelOrder, getOrderStats };
