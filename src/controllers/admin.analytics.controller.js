const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ── GET /api/admin/analytics/sales ────────────────────
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', from_date, to_date } = req.query;

    let groupBy, dateFormat;
    if (period === 'daily') {
      groupBy = `DATE_TRUNC('day', created_at)`;
      dateFormat = 'DD Mon YYYY';
    } else if (period === 'weekly') {
      groupBy = `DATE_TRUNC('week', created_at)`;
      dateFormat = 'WW IYYY';
    } else {
      groupBy = `DATE_TRUNC('month', created_at)`;
      dateFormat = 'Mon YYYY';
    }

    const conditions = ["status != 'cancelled'"];
    const params = [];
    let idx = 1;

    if (from_date) { conditions.push(`created_at >= $${idx++}`); params.push(from_date); }
    if (to_date)   { conditions.push(`created_at <= $${idx++}::date + INTERVAL '1 day'`); params.push(to_date); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const revenueChart = await query(
      `SELECT
         TO_CHAR(${groupBy}, '${dateFormat}') AS period,
         COALESCE(SUM(total), 0)               AS revenue,
         COUNT(*)                              AS orders
       FROM orders ${where}
       GROUP BY ${groupBy}
       ORDER BY ${groupBy}`,
      params
    );

    const summary = await query(
      `SELECT
         COALESCE(SUM(total), 0)  AS total_revenue,
         COUNT(*)                 AS total_orders,
         COALESCE(AVG(total), 0)  AS avg_order_value,
         COALESCE(SUM(discount), 0) AS total_discounts
       FROM orders ${where}`,
      params
    );

    return success(res, {
      chart:   revenueChart.rows,
      summary: summary.rows[0],
    });
  } catch (err) {
    console.error('getSalesAnalytics error:', err);
    return error(res, 'Failed to fetch sales analytics');
  }
};

// ── GET /api/admin/analytics/products ─────────────────
const getProductAnalytics = async (req, res) => {
  try {
    // Top selling products
    const topSelling = await query(`
      SELECT p.id, p.name, p.thumbnail, p.price,
             COALESCE(SUM(oi.quantity), 0) AS total_sold,
             COALESCE(SUM(oi.total), 0)    AS revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Sales by category
    const byCategory = await query(`
      SELECT c.name AS category, c.id,
             COALESCE(SUM(oi.total), 0)    AS revenue,
             COALESCE(SUM(oi.quantity), 0) AS units_sold
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY c.id
      ORDER BY revenue DESC
    `);

    return success(res, {
      top_selling:  topSelling.rows,
      by_category:  byCategory.rows,
    });
  } catch (err) {
    return error(res, 'Failed to fetch product analytics');
  }
};

// ── GET /api/admin/analytics/users ────────────────────
const getUserAnalytics = async (req, res) => {
  try {
    // New users per month (last 6 months)
    const newUsers = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COUNT(*) AS count
      FROM users
      WHERE role = 'customer'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // Top customers by spending
    const topCustomers = await query(`
      SELECT u.id, u.name, u.email,
             COUNT(o.id)::int            AS total_orders,
             COALESCE(SUM(o.total), 0)   AS total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    return success(res, {
      new_users:     newUsers.rows,
      top_customers: topCustomers.rows,
    });
  } catch (err) {
    return error(res, 'Failed to fetch user analytics');
  }
};

// ── GET /api/admin/analytics/orders ───────────────────
const getOrderAnalytics = async (req, res) => {
  try {
    // Orders by status
    const byStatus = await query(`
      SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS revenue
      FROM orders
      GROUP BY status
    `);

    // Orders by payment method
    const byPayment = await query(`
      SELECT payment_method, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS revenue
      FROM orders
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    return success(res, {
      by_status:  byStatus.rows,
      by_payment: byPayment.rows,
    });
  } catch (err) {
    return error(res, 'Failed to fetch order analytics');
  }
};

module.exports = { getSalesAnalytics, getProductAnalytics, getUserAnalytics, getOrderAnalytics };
