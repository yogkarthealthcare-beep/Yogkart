const { query } = require('../config/database');
const { success, error, paginated } = require('../utils/response');

// ── GET /api/admin/payments ────────────────────────────
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_method, from_date, to_date } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (payment_method) { conditions.push(`o.payment_method = $${idx++}`); params.push(payment_method); }
    if (status)         { conditions.push(`o.payment_status = $${idx++}`); params.push(status); }
    if (from_date)      { conditions.push(`o.created_at >= $${idx++}`);    params.push(from_date); }
    if (to_date)        { conditions.push(`o.created_at <= $${idx++}::date + INTERVAL '1 day'`); params.push(to_date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT o.id, o.total, o.payment_method, o.payment_status, o.status AS order_status, o.created_at,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('getPayments error:', err);
    return error(res, 'Failed to fetch payments');
  }
};

// ── GET /api/admin/payments/stats ─────────────────────
const getPaymentStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        payment_method,
        COUNT(*)::int             AS count,
        COALESCE(SUM(total), 0)  AS total_amount,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int    AS paid_count,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE payment_status = 'failed')::int  AS failed_count
      FROM orders
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `);
    return success(res, { stats: stats.rows });
  } catch (err) {
    return error(res, 'Failed to fetch payment stats');
  }
};

// ── PATCH /api/admin/payments/:orderId/status ─────────
const updatePaymentStatus = async (req, res) => {
  try {
    const { payment_status } = req.body;
    const validStatuses = ['paid', 'pending', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return error(res, `Invalid status. Valid: ${validStatuses.join(', ')}`, 400);
    }

    const result = await query(
      'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, payment_status',
      [payment_status, req.params.orderId]
    );
    if (!result.rows.length) return error(res, 'Order not found', 404);

    return success(res, result.rows[0], 'Payment status updated');
  } catch (err) {
    return error(res, 'Failed to update payment status');
  }
};

// ── POST /api/admin/refunds ───────────────────────────
const initiateRefund = async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) return error(res, 'order_id required', 400);

    const orderRes = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (!orderRes.rows.length) return error(res, 'Order not found', 404);

    const order = orderRes.rows[0];
    if (order.payment_status === 'refunded') {
      return error(res, 'Order already refunded', 400);
    }

    await query(
      `UPDATE orders
       SET payment_status = 'refunded', status = 'refunded',
           notes = COALESCE(notes, '') || $1, updated_at = NOW()
       WHERE id = $2`,
      [`\n[REFUND] ${reason || 'Admin initiated refund'}`, order_id]
    );

    return success(res, null, 'Refund initiated. Process manually via payment gateway.');
  } catch (err) {
    return error(res, 'Failed to initiate refund');
  }
};

module.exports = { getPayments, getPaymentStats, updatePaymentStatus, initiateRefund };
