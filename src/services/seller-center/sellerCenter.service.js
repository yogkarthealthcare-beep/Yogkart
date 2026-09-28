const { query, getClient } = require('../../config/database');
const {
  getAmazonCredentials,
  updateAmazonLastSyncTimestamp,
} = require('./amazonCredentials.service');
const {
  fetchOrdersFromAmazon,
  fetchOrderItemsFromAmazon,
} = require('./amazonSpApi.service');

// Global Concurrency Guard
let isAmazonSyncRunning = false;

/**
 * Get all configured marketplaces with live summary metrics.
 */
const getMarketplaces = async () => {
  const marketplacesRes = await query(
    `SELECT * FROM seller_marketplaces ORDER BY display_order ASC`
  );

  // Get live Amazon stats
  const amazonStatsRes = await query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(CASE WHEN order_status NOT IN ('Canceled', 'Cancelled') THEN order_total ELSE 0 END), 0)::numeric(12,2) AS total_revenue
    FROM amazon_orders
  `);

  const amazonProductsRes = await query(`
    SELECT COUNT(*)::int AS total_products FROM amazon_products
  `);

  const amazonCredsRes = await query(`
    SELECT connection_status, last_sync_at, last_tested_at FROM amazon_integrations LIMIT 1
  `);

  const amazonInfo = amazonCredsRes.rows[0] || {};
  const totalOrders = amazonStatsRes.rows[0]?.total_orders || 0;
  const totalRevenue = parseFloat(amazonStatsRes.rows[0]?.total_revenue || 0);
  const totalProducts = amazonProductsRes.rows[0]?.total_products || 0;

  return marketplacesRes.rows.map(m => {
    if (m.code === 'AMAZON') {
      return {
        ...m,
        status: amazonInfo.connection_status || m.status,
        totalOrders,
        totalRevenue,
        totalProducts,
        lastSyncAt: amazonInfo.last_sync_at,
        lastTestedAt: amazonInfo.last_tested_at,
      };
    }
    return {
      ...m,
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
    };
  });
};

/**
 * Calculate KPI summary statistics for the Amazon dashboard.
 */
const getAmazonDashboardStats = async ({ startDate, endDate } = {}) => {
  let dateConditions = [];
  let params = [];
  let paramIdx = 1;

  if (startDate) {
    dateConditions.push(`purchase_date >= $${paramIdx++}`);
    params.push(new Date(startDate).toISOString());
  }
  if (endDate) {
    dateConditions.push(`purchase_date <= $${paramIdx++}`);
    params.push(new Date(endDate).toISOString());
  }

  const whereClause = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';

  // 1. Overall stats for date range
  const statsQuery = `
    SELECT
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(CASE WHEN order_status NOT IN ('Canceled', 'Cancelled') THEN order_total ELSE 0 END), 0)::numeric(12,2) AS total_revenue,
      COUNT(CASE WHEN order_status IN ('Pending', 'Unshipped', 'PartiallyShipped') THEN 1 END)::int AS pending_orders,
      COUNT(CASE WHEN order_status = 'Shipped' THEN 1 END)::int AS shipped_orders,
      COUNT(CASE WHEN order_status IN ('Delivered', 'Complete') THEN 1 END)::int AS delivered_orders,
      COUNT(CASE WHEN order_status IN ('Canceled', 'Cancelled') THEN 1 END)::int AS cancelled_orders,
      COUNT(CASE WHEN order_status ILIKE '%return%' OR order_status ILIKE '%refund%' THEN 1 END)::int AS returned_orders
    FROM amazon_orders
    ${whereClause}
  `;
  const statsRes = await query(statsQuery, params);
  const stats = statsRes.rows[0] || {};

  // 2. Today's stats (calculated dynamically regardless of selected historical range)
  const todayQuery = `
    SELECT
      COUNT(*)::int AS today_orders,
      COALESCE(SUM(CASE WHEN order_status NOT IN ('Canceled', 'Cancelled') THEN order_total ELSE 0 END), 0)::numeric(12,2) AS today_revenue
    FROM amazon_orders
    WHERE purchase_date >= CURRENT_DATE
  `;
  const todayRes = await query(todayQuery);
  const todayStats = todayRes.rows[0] || {};

  // 3. Products count
  const productsCountRes = await query(`SELECT COUNT(*)::int AS total_products FROM amazon_products`);
  const totalProducts = productsCountRes.rows[0]?.total_products || 0;

  // 4. Last sync details
  const syncInfoRes = await query(`
    SELECT connection_status, last_sync_at, last_tested_at, last_error_message
    FROM amazon_integrations LIMIT 1
  `);
  const syncInfo = syncInfoRes.rows[0] || {};

  return {
    totalOrders: stats.total_orders || 0,
    totalRevenue: parseFloat(stats.total_revenue || 0),
    pendingOrders: stats.pending_orders || 0,
    shippedOrders: stats.shipped_orders || 0,
    deliveredOrders: stats.delivered_orders || 0,
    cancelledOrders: stats.cancelled_orders || 0,
    returnedOrders: stats.returned_orders || 0,
    todayOrders: todayStats.today_orders || 0,
    todayRevenue: parseFloat(todayStats.today_revenue || 0),
    totalProducts,
    lossMetric: {
      available: false,
      amount: null,
      message: 'Loss calculation unavailable (Cost of Goods & Amazon FBA Fee data required)',
    },
    connectionStatus: syncInfo.connection_status || 'NOT_CONNECTED',
    lastSyncAt: syncInfo.last_sync_at,
    lastTestedAt: syncInfo.last_tested_at,
    lastErrorMessage: syncInfo.last_error_message,
  };
};

/**
 * Get Amazon Orders with filtering and pagination from local database.
 */
const getAmazonOrders = async ({
  page = 1,
  limit = 20,
  status = '',
  search = '',
  startDate = '',
  endDate = '',
  fulfillment = '',
} = {}) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`o.order_status ILIKE $${pIdx++}`);
    params.push(status);
  }

  if (fulfillment && fulfillment !== 'all') {
    conditions.push(`o.fulfillment_channel = $${pIdx++}`);
    params.push(fulfillment);
  }

  if (startDate) {
    conditions.push(`o.purchase_date >= $${pIdx++}`);
    params.push(new Date(startDate).toISOString());
  }

  if (endDate) {
    conditions.push(`o.purchase_date <= $${pIdx++}`);
    params.push(new Date(endDate).toISOString());
  }

  if (search) {
    conditions.push(`(
      o.amazon_order_id ILIKE $${pIdx} OR
      o.buyer_name ILIKE $${pIdx} OR
      o.buyer_email ILIKE $${pIdx} OR
      EXISTS (
        SELECT 1 FROM amazon_order_items oi
        WHERE oi.amazon_order_id = o.amazon_order_id
        AND (oi.title ILIKE $${pIdx} OR oi.asin ILIKE $${pIdx} OR oi.seller_sku ILIKE $${pIdx})
      )
    )`);
    params.push(`%${search}%`);
    pIdx++;
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count query
  const countSql = `SELECT COUNT(*)::int AS total FROM amazon_orders o ${whereSql}`;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  // Data query with aggregated items summary
  const dataSql = `
    SELECT
      o.id,
      o.amazon_order_id,
      o.purchase_date,
      o.order_status,
      o.fulfillment_channel,
      o.sales_channel,
      o.currency,
      o.order_total,
      o.number_of_items_shipped,
      o.number_of_items_unshipped,
      o.payment_method,
      o.buyer_name,
      o.shipping_city,
      o.shipping_state,
      o.synced_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'asin', oi.asin,
            'sellerSku', oi.seller_sku,
            'title', oi.title,
            'quantityOrdered', oi.quantity_ordered,
            'itemPrice', oi.item_price_amount
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) AS items
    FROM amazon_orders o
    LEFT JOIN amazon_order_items oi ON oi.amazon_order_id = o.amazon_order_id
    ${whereSql}
    GROUP BY o.id
    ORDER BY o.purchase_date DESC
    LIMIT $${pIdx++} OFFSET $${pIdx++}
  `;

  const dataParams = [...params, limitNum, offset];
  const dataRes = await query(dataSql, dataParams);

  return {
    orders: dataRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  };
};

/**
 * Get detailed Amazon Order by Order ID.
 */
const getAmazonOrderById = async (amazonOrderId) => {
  const orderRes = await query(
    `SELECT * FROM amazon_orders WHERE amazon_order_id = $1`,
    [amazonOrderId]
  );

  if (!orderRes.rows.length) {
    const error = new Error(`Amazon Order ${amazonOrderId} not found`);
    error.status = 404;
    throw error;
  }

  const order = orderRes.rows[0];

  const itemsRes = await query(
    `SELECT * FROM amazon_order_items WHERE amazon_order_id = $1 ORDER BY created_at ASC`,
    [amazonOrderId]
  );

  return {
    ...order,
    items: itemsRes.rows,
  };
};

/**
 * Get Amazon Products / Catalog from local database.
 */
const getAmazonProducts = async ({
  page = 1,
  limit = 20,
  search = '',
  status = '',
} = {}) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`listing_status = $${pIdx++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(`(product_name ILIKE $${pIdx} OR sku ILIKE $${pIdx} OR asin ILIKE $${pIdx})`);
    params.push(`%${search}%`);
    pIdx++;
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM amazon_products ${whereSql}`, params);
  const total = countRes.rows[0]?.total || 0;

  const dataSql = `
    SELECT * FROM amazon_products
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${pIdx++} OFFSET $${pIdx++}
  `;

  const dataRes = await query(dataSql, [...params, limitNum, offset]);

  return {
    products: dataRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  };
};

/**
 * FETCH LIVE RECORD: Sync Amazon SP-API data into Yogkart database.
 * Uses Idempotent Upsert (duplicate protection) and concurrency lock.
 */
const syncAmazonLiveRecords = async (adminId = null) => {
  if (isAmazonSyncRunning) {
    const error = new Error('Amazon synchronization is already in progress. Please wait for the current sync to complete.');
    error.status = 409;
    throw error;
  }

  isAmazonSyncRunning = true;
  const startedAt = new Date();

  // Create audit log entry
  const logRes = await query(
    `INSERT INTO seller_center_sync_logs (
      marketplace, sync_type, started_at, status, admin_id
    ) VALUES ('AMAZON', 'MANUAL_FETCH_LIVE_RECORD', $1, 'IN_PROGRESS', $2)
    RETURNING id`,
    [startedAt, adminId]
  );
  const logId = logRes.rows[0].id;

  let recordsFetched = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let productsFetched = 0;
  let productsInserted = 0;
  let productsUpdated = 0;

  try {
    const credentials = await getAmazonCredentials({ requireConfigured: true });

    // Determine incremental sync starting timestamp
    const lastSyncRes = await query(`
      SELECT MAX(last_update_date) AS last_update, MAX(purchase_date) AS last_purchase
      FROM amazon_orders
    `);
    const lastUpdate = lastSyncRes.rows[0]?.last_update || lastSyncRes.rows[0]?.last_purchase;

    // 1. Fetch Orders from Amazon SP-API
    const { orders } = await fetchOrdersFromAmazon(credentials, {
      lastUpdatedAfter: lastUpdate || null,
    });
    recordsFetched = orders.length;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const order of orders) {
        const amazonOrderId = order.AmazonOrderId;
        const purchaseDate = new Date(order.PurchaseDate || Date.now());
        const lastUpdateDate = order.LastUpdateDate ? new Date(order.LastUpdateDate) : purchaseDate;
        const orderStatus = order.OrderStatus || 'Unshipped';
        const fulfillmentChannel = order.FulfillmentChannel || 'MFN';
        const salesChannel = order.SalesChannel || 'Amazon.in';
        const currency = order.OrderTotal?.CurrencyCode || 'INR';
        const orderTotal = parseFloat(order.OrderTotal?.Amount || 0);
        const shippedItems = parseInt(order.NumberOfItemsShipped || 0);
        const unshippedItems = parseInt(order.NumberOfItemsUnshipped || 0);
        const paymentMethod = order.PaymentMethod || 'Other';
        const buyerEmail = order.BuyerInfo?.BuyerEmail || null;
        const buyerName = order.BuyerInfo?.BuyerName || null;
        const shippingAddress = order.ShippingAddress || {};

        // Upsert order
        const upsertOrderSql = `
          INSERT INTO amazon_orders (
            amazon_order_id, purchase_date, last_update_date, order_status,
            fulfillment_channel, sales_channel, currency, order_total,
            number_of_items_shipped, number_of_items_unshipped, payment_method,
            buyer_email, buyer_name, shipping_city, shipping_state,
            shipping_postal_code, shipping_country, raw_payload, synced_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
          ON CONFLICT (amazon_order_id) DO UPDATE SET
            last_update_date = EXCLUDED.last_update_date,
            order_status = EXCLUDED.order_status,
            fulfillment_channel = EXCLUDED.fulfillment_channel,
            order_total = EXCLUDED.order_total,
            number_of_items_shipped = EXCLUDED.number_of_items_shipped,
            number_of_items_unshipped = EXCLUDED.number_of_items_unshipped,
            raw_payload = EXCLUDED.raw_payload,
            synced_at = NOW(),
            updated_at = NOW()
          RETURNING (xmax = 0) AS was_inserted
        `;

        const upsertRes = await client.query(upsertOrderSql, [
          amazonOrderId,
          purchaseDate,
          lastUpdateDate,
          orderStatus,
          fulfillmentChannel,
          salesChannel,
          currency,
          orderTotal,
          shippedItems,
          unshippedItems,
          paymentMethod,
          buyerEmail,
          buyerName,
          shippingAddress.City || null,
          shippingAddress.StateOrRegion || null,
          shippingAddress.PostalCode || null,
          shippingAddress.CountryCode || 'IN',
          JSON.stringify(order),
        ]);

        if (upsertRes.rows[0]?.was_inserted) {
          recordsInserted++;
        } else {
          recordsUpdated++;
        }

        // 2. Fetch & Upsert Order Items
        const items = await fetchOrderItemsFromAmazon(credentials, amazonOrderId);
        for (const item of items) {
          const asin = item.ASIN || 'UNKNOWN';
          const sellerSku = item.SellerSKU || asin;
          const title = item.Title || 'Amazon Product Item';
          const qtyOrdered = parseInt(item.QuantityOrdered || 1);
          const qtyShipped = parseInt(item.QuantityShipped || 0);
          const itemPrice = parseFloat(item.ItemPrice?.Amount || 0);
          const itemCurrency = item.ItemPrice?.CurrencyCode || currency;
          const itemTax = parseFloat(item.ItemTax?.Amount || 0);
          const shippingPrice = parseFloat(item.ShippingPrice?.Amount || 0);
          const conditionId = item.ConditionId || 'New';

          await client.query(`
            INSERT INTO amazon_order_items (
              amazon_order_id, order_item_id, asin, seller_sku, title,
              quantity_ordered, quantity_shipped, item_price_amount,
              item_price_currency, item_tax_amount, shipping_price_amount,
              condition_id, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (amazon_order_id, asin, seller_sku) DO UPDATE SET
              quantity_ordered = EXCLUDED.quantity_ordered,
              quantity_shipped = EXCLUDED.quantity_shipped,
              item_price_amount = EXCLUDED.item_price_amount,
              item_tax_amount = EXCLUDED.item_tax_amount,
              shipping_price_amount = EXCLUDED.shipping_price_amount,
              updated_at = NOW()
          `, [
            amazonOrderId,
            item.OrderItemId || null,
            asin,
            sellerSku,
            title,
            qtyOrdered,
            qtyShipped,
            itemPrice,
            itemCurrency,
            itemTax,
            shippingPrice,
            conditionId,
          ]);

          // 3. Upsert into Products catalog
          productsFetched++;
          const prodUpsertRes = await client.query(`
            INSERT INTO amazon_products (
              asin, sku, product_name, price_amount, price_currency,
              listing_status, last_synced_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
            ON CONFLICT (sku) DO UPDATE SET
              product_name = EXCLUDED.product_name,
              price_amount = EXCLUDED.price_amount,
              last_synced_at = NOW(),
              updated_at = NOW()
            RETURNING (xmax = 0) AS was_inserted
          `, [
            asin,
            sellerSku,
            title,
            itemPrice,
            itemCurrency,
          ]);

          if (prodUpsertRes.rows[0]?.was_inserted) {
            productsInserted++;
          } else {
            productsUpdated++;
          }
        }
      }

      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    const completedAt = new Date();
    await updateAmazonLastSyncTimestamp();

    // Update sync log with SUCCESS
    await query(`
      UPDATE seller_center_sync_logs SET
        status = 'SUCCESS',
        completed_at = $1,
        records_fetched = $2,
        records_inserted = $3,
        records_updated = $4,
        products_fetched = $5,
        products_inserted = $6,
        products_updated = $7
      WHERE id = $8
    `, [
      completedAt,
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      productsFetched,
      productsInserted,
      productsUpdated,
      logId,
    ]);

    return {
      success: true,
      message: 'Amazon data synchronization completed successfully',
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      productsFetched,
      productsInserted,
      productsUpdated,
    };
  } catch (err) {
    const errorMsg = err.message || 'Synchronization failed';
    await query(`
      UPDATE seller_center_sync_logs SET
        status = 'FAILED',
        completed_at = NOW(),
        error_message = $1
      WHERE id = $2
    `, [errorMsg, logId]);

    throw err;
  } finally {
    isAmazonSyncRunning = false;
  }
};

/**
 * Get sync audit logs.
 */
const getSyncLogs = async ({ page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const offset = (pageNum - 1) * limitNum;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM seller_center_sync_logs`);
  const total = countRes.rows[0]?.total || 0;

  const logsRes = await query(`
    SELECT l.*, a.name AS admin_name, a.email AS admin_email
    FROM seller_center_sync_logs l
    LEFT JOIN admins a ON a.id = l.admin_id
    ORDER BY l.started_at DESC
    LIMIT $1 OFFSET $2
  `, [limitNum, offset]);

  return {
    logs: logsRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

module.exports = {
  getMarketplaces,
  getAmazonDashboardStats,
  getAmazonOrders,
  getAmazonOrderById,
  getAmazonProducts,
  syncAmazonLiveRecords,
  getSyncLogs,
};
