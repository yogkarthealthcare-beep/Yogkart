const sellerCenterService = require('../services/seller-center/sellerCenter.service');
const amazonCredentialsService = require('../services/seller-center/amazonCredentials.service');
const amazonSpApiService = require('../services/seller-center/amazonSpApi.service');
const { success, error, serverError } = require('../utils/response');

/**
 * GET /api/admin/seller-center/marketplaces
 */
const getMarketplaces = async (req, res) => {
  try {
    const data = await sellerCenterService.getMarketplaces();
    return success(res, 'Marketplaces fetched successfully', data);
  } catch (err) {
    console.error('Error fetching marketplaces:', err);
    return serverError(res, err.message);
  }
};

/**
 * GET /api/admin/seller-center/amazon/stats
 */
const getAmazonStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await sellerCenterService.getAmazonDashboardStats({ startDate, endDate });
    return success(res, 'Amazon statistics fetched successfully', data);
  } catch (err) {
    console.error('Error fetching Amazon stats:', err);
    return serverError(res, err.message);
  }
};

/**
 * GET /api/admin/seller-center/amazon/orders
 */
const getAmazonOrders = async (req, res) => {
  try {
    const { page, limit, status, search, startDate, endDate, fulfillment } = req.query;
    const data = await sellerCenterService.getAmazonOrders({
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      fulfillment,
    });
    return success(res, 'Amazon orders fetched successfully', data.orders, data.pagination);
  } catch (err) {
    console.error('Error fetching Amazon orders:', err);
    return serverError(res, err.message);
  }
};

/**
 * GET /api/admin/seller-center/amazon/orders/:id
 */
const getAmazonOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await sellerCenterService.getAmazonOrderById(id);
    return success(res, 'Amazon order details fetched successfully', data);
  } catch (err) {
    if (err.status === 404) return error(res, err.message, 404);
    console.error('Error fetching Amazon order details:', err);
    return serverError(res, err.message);
  }
};

/**
 * GET /api/admin/seller-center/amazon/products
 */
const getAmazonProducts = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const data = await sellerCenterService.getAmazonProducts({ page, limit, search, status });
    return success(res, 'Amazon products fetched successfully', data.products, data.pagination);
  } catch (err) {
    console.error('Error fetching Amazon products:', err);
    return serverError(res, err.message);
  }
};

/**
 * POST /api/admin/seller-center/amazon/sync
 * FETCH LIVE RECORD: Triggers manual live synchronization from SP-API into Yogkart DB.
 */
const syncAmazonLive = async (req, res) => {
  try {
    const adminId = req.admin?.id || null;
    const result = await sellerCenterService.syncAmazonLiveRecords(adminId);
    return success(res, result.message, result);
  } catch (err) {
    if (err.status === 409) return error(res, err.message, 409);
    if (err.status === 400 || err.status === 401) return error(res, err.message, err.status);
    console.error('Error syncing Amazon live records:', err);
    return serverError(res, err.message || 'Amazon sync failed');
  }
};

/**
 * GET /api/admin/seller-center/amazon/settings
 * Returns masked credentials safe for Admin UI.
 */
const getAmazonSettings = async (req, res) => {
  try {
    const data = await amazonCredentialsService.getAdminAmazonCredentials();
    return success(res, 'Amazon settings fetched successfully', data);
  } catch (err) {
    console.error('Error fetching Amazon settings:', err);
    return serverError(res, err.message);
  }
};

/**
 * POST /api/admin/seller-center/amazon/settings
 * Saves encrypted credentials into database without overwriting unchanged secrets.
 */
const saveAmazonSettings = async (req, res) => {
  try {
    const adminId = req.admin?.id || null;
    const data = await amazonCredentialsService.saveAmazonCredentials(req.body, adminId);
    return success(res, 'Amazon credentials saved securely in database', data);
  } catch (err) {
    console.error('Error saving Amazon settings:', err);
    return serverError(res, err.message || 'Failed to save Amazon settings');
  }
};

/**
 * POST /api/admin/seller-center/amazon/test-connection
 * Tests live authentication with Amazon SP-API using database credentials.
 */
const testAmazonConnection = async (req, res) => {
  try {
    const result = await amazonSpApiService.testConnection();
    if (result.success) {
      return success(res, result.message, result);
    } else {
      return error(res, result.message, 400, result);
    }
  } catch (err) {
    console.error('Error testing Amazon connection:', err);
    return error(res, err.message || 'Connection test failed', 400);
  }
};

/**
 * GET /api/admin/seller-center/sync-logs
 */
const getSyncLogs = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await sellerCenterService.getSyncLogs({ page, limit });
    return success(res, 'Sync logs fetched successfully', data.logs, data.pagination);
  } catch (err) {
    console.error('Error fetching sync logs:', err);
    return serverError(res, err.message);
  }
};

module.exports = {
  getMarketplaces,
  getAmazonStats,
  getAmazonOrders,
  getAmazonOrderById,
  getAmazonProducts,
  syncAmazonLive,
  getAmazonSettings,
  saveAmazonSettings,
  testAmazonConnection,
  getSyncLogs,
};
