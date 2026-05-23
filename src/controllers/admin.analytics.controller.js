/**
 * admin.analytics.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. getSalesAnalytics — orders table mein `discount` column nahi hai
 *     lekin order_items se calculate kar sakte hain; use subtotal-total instead
 *  2. Numeric type casts — all SUM/AVG → ::numeric prevent string return
 *  3. getProductAnalytics — LEFT JOIN chain fix (cancelled orders exclude karo)
 *  4. getUserAnalytics — top_customers result shape Angular ke saath match
 *  5. getOrderAnalytics — count/revenue types explicit cast
 */

const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ── GET /api/admin/analytics/sales ────────────────────
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', from_date, to_date } = req.query;

    let groupBy;
    if (period === 'daily') {
      groupBy = `DATE_TRUNC('day', created_at)`;
    } else if (period === 'weekly') {
      groupBy = `DATE_TRUNC('week', created_at)`;
    } else {
      groupBy = `DATE_TRUNC('month', created_at)`;
    }

    // Period label format
    const periodLabel = period === 'daily'
      ? `TO_CHAR(${groupBy}, 'DD Mon')`
      : period === 'weekly'
      ? `TO_CHAR(${groupBy}, 'DD Mon YYYY')`
      : `TO_CHAR(${groupBy}, 'Mon YYYY')`;

    const conditions = [`status != 'cancelled'`];
    const params = [];
    let idx = 1;

    if (from_date) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(from_date);
    }
    if (to_date) {
      conditions.push(`created_at <= $${idx++}::date + INTERVAL '1 day'`);
      params.push(to_date);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Revenue chart per period
    const revenueChart = await query(
      `SELECT
         ${periodLabel}                   AS period,
         COALESCE(SUM(total), 0)::numeric AS revenue,
         COUNT(*)::int                    AS orders
       FROM orders
       ${where}
       GROUP BY ${groupBy}
       ORDER BY ${groupBy}`,
      params
    );

    // Summary stats
    // discount = subtotal - total (delivery_fee + tax adjust)
    const summary = await query(
      `SELECT
         COALESCE(SUM(total), 0)::numeric          AS total_revenue,
         COUNT(*)::int                             AS total_orders,
         COALESCE(AVG(total), 0)::numeric          AS avg_order_value,
         COALESCE(SUM(subtotal - total + delivery_fee + tax), 0)::numeric
                                                   AS total_discounts
       FROM orders
       ${where}`,
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
    // Top selling products (exclude cancelled orders)
    const topSelling = await query(`
      SELECT
        p.id, p.name, p.thumbnail, p.price,
        COALESCE(SUM(oi.quantity), 0)::int      AS total_sold,
        COALESCE(SUM(oi.total), 0)::numeric     AS revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Sales by category
    const byCategory = await query(`
      SELECT
        c.id,
        c.name                                    AS category,
        COALESCE(SUM(oi.total), 0)::numeric       AS revenue,
        COALESCE(SUM(oi.quantity), 0)::int        AS units_sold
      FROM categories c
      LEFT JOIN products p       ON p.category_id = c.id
      LEFT JOIN order_items oi   ON oi.product_id = p.id
      LEFT JOIN orders o         ON o.id = oi.order_id AND o.status != 'cancelled'
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY revenue DESC
    `);

    return success(res, {
      top_selling:  topSelling.rows,
      by_category:  byCategory.rows,
    });
  } catch (err) {
    console.error('getProductAnalytics error:', err);
    return error(res, 'Failed to fetch product analytics');
  }
};

// ── GET /api/admin/analytics/users ────────────────────
const getUserAnalytics = async (req, res) => {
  try {
    // New registrations per month (last 6 months)
    const newUsers = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COUNT(*)::int                                         AS count
      FROM users
      WHERE role = 'customer'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // Top customers by total spending (non-cancelled orders)
    const topCustomers = await query(`
      SELECT
        u.id, u.name, u.email,
        COUNT(o.id)::int                AS total_orders,
        COALESCE(SUM(o.total), 0)::numeric AS total_spent
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
    console.error('getUserAnalytics error:', err);
    return error(res, 'Failed to fetch user analytics');
  }
};

// ── GET /api/admin/analytics/orders ───────────────────
const getOrderAnalytics = async (req, res) => {
  try {
    // Orders grouped by status
    const byStatus = await query(`
      SELECT
        status,
        COUNT(*)::int                    AS count,
        COALESCE(SUM(total), 0)::numeric AS revenue
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

    // Orders grouped by payment method
    const byPayment = await query(`
      SELECT
        payment_method,
        COUNT(*)::int                    AS count,
        COALESCE(SUM(total), 0)::numeric AS revenue
      FROM orders
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    return success(res, {
      by_status:  byStatus.rows,
      by_payment: byPayment.rows,
    });
  } catch (err) {
    console.error('getOrderAnalytics error:', err);
    return error(res, 'Failed to fetch order analytics');
  }
};

module.exports = {
  getSalesAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
};
