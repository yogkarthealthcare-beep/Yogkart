/**
 * admin.dashboard.controller.js  (FIXED & COMPLETE)
 * ─────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. orders table mein `discount` column nahi hai, subtotal-total use kiya
 *  2. All numeric aggregates → ::numeric cast
 *  3. revenueChart — period label consistent format
 */

const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const getDashboardStats = async (req, res) => {
  try {
    // ── Order aggregates ────────────────────────────────
    const orderStats = await query(`
      SELECT
        COUNT(*)::int                                                             AS total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')::int                          AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int                        AS confirmed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int                        AS cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')::int                        AS delivered_orders,
        COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0)::numeric
                                                                                 AS today_revenue,
        COALESCE(SUM(total) FILTER (
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
          AND   status != 'cancelled'
        ), 0)::numeric                                                           AS monthly_revenue,
        COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric   AS total_revenue
      FROM orders
    `);

    // ── User aggregates ─────────────────────────────────
    const userStats = await query(`
      SELECT
        COUNT(*)::int                                               AS total_users,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::int AS new_today
      FROM users
      WHERE role = 'customer'
    `);

    // ── Product aggregates ──────────────────────────────
    const productStats = await query(`
      SELECT
        COUNT(*)::int                                       AS total_products,
        COUNT(*) FILTER (WHERE stock <= 5 AND stock > 0)::int AS low_stock,
        COUNT(*) FILTER (WHERE stock = 0)::int              AS out_of_stock,
        COUNT(*) FILTER (WHERE is_active = FALSE)::int      AS inactive
      FROM products
    `);

    // ── Recent 10 orders ───────────────────────────────
    const recentOrders = await query(`
      SELECT
        o.id, o.status, o.payment_status,
        o.total, o.payment_method, o.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // ── Revenue chart — last 6 months ──────────────────
    const revenueChart = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COALESCE(SUM(total), 0)::numeric                     AS revenue,
        COUNT(*)::int                                        AS orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
        AND status != 'cancelled'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // ── Top 5 products by sales ─────────────────────────
    const topProducts = await query(`
      SELECT
        p.id, p.name, p.thumbnail, p.price,
        COALESCE(SUM(oi.quantity), 0)::int      AS total_sold,
        COALESCE(SUM(oi.total), 0)::numeric     AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    return success(res, {
      orders:        orderStats.rows[0],
      users:         userStats.rows[0],
      products:      productStats.rows[0],
      recent_orders: recentOrders.rows,
      revenue_chart: revenueChart.rows,
      top_products:  topProducts.rows,
    }, 'Dashboard stats fetched successfully');
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return error(res, 'Failed to fetch dashboard stats');
  }
};

module.exports = { getDashboardStats };
