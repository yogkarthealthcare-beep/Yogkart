const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ── GET /api/admin/dashboard ───────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // Orders stats
    const orderStats = await query(`
      SELECT
        COUNT(*)                                          AS total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')        AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'confirmed')      AS confirmed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')      AS delivered_orders,
        COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS today_revenue,
        COALESCE(SUM(total) FILTER (
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        ), 0) AS monthly_revenue,
        COALESCE(SUM(total), 0) AS total_revenue
      FROM orders
    `);

    // Users stats
    const userStats = await query(`
      SELECT
        COUNT(*)                                             AS total_users,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS new_today
      FROM users WHERE role = 'customer'
    `);

    // Products stats
    const productStats = await query(`
      SELECT
        COUNT(*)                                  AS total_products,
        COUNT(*) FILTER (WHERE stock <= 5 AND stock > 0) AS low_stock,
        COUNT(*) FILTER (WHERE stock = 0)         AS out_of_stock,
        COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive
      FROM products
    `);

    // Recent orders (last 10)
    const recentOrders = await query(`
      SELECT o.id, o.status, o.total, o.payment_method, o.created_at,
             u.name AS user_name, u.email AS user_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Monthly revenue chart (last 6 months)
    const revenueChart = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COALESCE(SUM(total), 0)  AS revenue,
        COUNT(*)                 AS orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
        AND status != 'cancelled'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // Top products by sales
    const topProducts = await query(`
      SELECT p.id, p.name, p.thumbnail, p.price,
             COALESCE(SUM(oi.quantity), 0) AS total_sold,
             COALESCE(SUM(oi.total), 0)    AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    return success(res, {
      orders:       orderStats.rows[0],
      users:        userStats.rows[0],
      products:     productStats.rows[0],
      recent_orders: recentOrders.rows,
      revenue_chart: revenueChart.rows,
      top_products:  topProducts.rows,
    }, 'Dashboard stats fetched');
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return error(res, 'Failed to fetch dashboard stats');
  }
};

module.exports = { getDashboardStats };
