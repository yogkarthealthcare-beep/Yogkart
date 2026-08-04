const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all payments for Admin panel with search, filters and metrics
 */
const getAllPayments = async (req, res) => {
  try {
    const {
      search = '',
      gateway = '',
      status = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 15,
      exportCsv = 'false'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(
        p.order_id ILIKE $${params.length} OR 
        p.transaction_id ILIKE $${params.length} OR 
        u.name ILIKE $${params.length} OR 
        u.email ILIKE $${params.length}
      )`);
    }

    if (gateway.trim()) {
      params.push(gateway.trim().toLowerCase());
      conditions.push(`p.gateway_name = $${params.length}`);
    }

    if (status.trim()) {
      params.push(status.trim().toLowerCase());
      conditions.push(`p.payment_status = $${params.length}`);
    }

    if (startDate.trim()) {
      params.push(startDate.trim());
      conditions.push(`p.created_at >= $${params.length}::timestamptz`);
    }

    if (endDate.trim()) {
      params.push(endDate.trim());
      conditions.push(`p.created_at <= $${params.length}::timestamptz`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Handle CSV export
    if (exportCsv === 'true') {
      const exportQuery = `
        SELECT p.order_id, p.transaction_id, u.name as customer_name, u.email as customer_email,
               p.gateway_name, p.currency, p.amount, p.payment_status, p.created_at as payment_date
        FROM payments p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC`;
      const { rows: exportRows } = await db.query(exportQuery, params);
      return successResponse(res, exportRows, 'Payment records for export generated');
    }

    // Total Count
    const countQuery = `
      SELECT COUNT(*) 
      FROM payments p 
      JOIN users u ON p.user_id = u.id 
      ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const totalCount = parseInt(countRows[0].count, 10);

    // Paginated Payments Query
    const dataParams = [...params, parseInt(limit, 10), offset];
    const dataQuery = `
      SELECT p.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             sp.name as plan_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    
    const { rows: payments } = await db.query(dataQuery, dataParams);

    // Calculate Analytics Metrics
    const { rows: metricsRows } = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END), 0) as total_revenue_inr,
        COUNT(CASE WHEN payment_status = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_count,
        COUNT(*) as total_transactions
      FROM payments
    `);

    const metrics = metricsRows[0];

    return successResponse(
      res,
      {
        payments,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(totalCount / parseInt(limit, 10))
        },
        metrics: {
          totalRevenueInr: parseFloat(metrics.total_revenue_inr),
          successCount: parseInt(metrics.success_count, 10),
          pendingCount: parseInt(metrics.pending_count, 10),
          failedCount: parseInt(metrics.failed_count, 10),
          totalTransactions: parseInt(metrics.total_transactions, 10)
        }
      },
      'Admin payments fetched successfully'
    );
  } catch (err) {
    console.error('Error fetching admin payments:', err);
    return errorResponse(res, 'Failed to fetch admin payments', 'ADMIN_PAYMENTS_ERROR', 500);
  }
};

/**
 * Get all user subscriptions for Admin panel
 */
const getAllSubscriptions = async (req, res) => {
  try {
    const { status = '', page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (status.trim()) {
      params.push(status.trim().toLowerCase());
      conditions.push(`us.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM user_subscriptions us ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const totalCount = parseInt(countRows[0].count, 10);

    const dataParams = [...params, parseInt(limit, 10), offset];
    const dataQuery = `
      SELECT us.*, u.name as user_name, u.email as user_email,
             sp.name as plan_name, sp.code as plan_code, p.gateway_name, p.amount, p.currency
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_plans sp ON us.plan_id = sp.id
      LEFT JOIN payments p ON us.payment_id = p.id
      ${whereClause}
      ORDER BY us.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;

    const { rows: subscriptions } = await db.query(dataQuery, dataParams);

    return successResponse(
      res,
      {
        subscriptions,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(totalCount / parseInt(limit, 10))
        }
      },
      'Admin subscriptions fetched successfully'
    );
  } catch (err) {
    console.error('Error fetching admin subscriptions:', err);
    return errorResponse(res, 'Failed to fetch admin subscriptions', 'ADMIN_SUBS_ERROR', 500);
  }
};

module.exports = {
  getAllPayments,
  getAllSubscriptions
};
