const newsletterService = require('../services/newsletter.service');

/**
 * Public: POST /api/newsletter/subscribe
 * Body: { email, name, source }
 */
const subscribe = async (req, res) => {
  try {
    const { email, name, source } = req.body || {};

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email format.'
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const subscriber = await newsletterService.subscribe({
      email: cleanEmail,
      name: name || '',
      ipAddress,
      source: source || 'Home Page Newsletter'
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you for subscribing! Your 15% discount coupon is YOGKART15.',
      data: {
        id: subscriber.id,
        email: subscriber.email,
        couponCode: 'YOGKART15',
        discount: '15% OFF'
      }
    });
  } catch (err) {
    console.error('❌ Error subscribing to newsletter:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter. Please try again later.'
    });
  }
};

/**
 * Admin: GET /api/admin/newsletter
 */
const getSubscribers = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await newsletterService.getSubscribers({ page, limit, search, status });
    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('❌ Error fetching newsletter subscribers:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter subscribers.'
    });
  }
};

/**
 * Admin: GET /api/admin/newsletter/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await newsletterService.getStats();
    return res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('❌ Error fetching newsletter stats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter statistics.'
    });
  }
};

/**
 * Admin: DELETE /api/admin/newsletter/:id
 */
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await newsletterService.deleteSubscriber(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Subscriber not found.' });
    }
    return res.json({ success: true, message: 'Subscriber deleted successfully.', data: deleted });
  } catch (err) {
    console.error('❌ Error deleting subscriber:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete subscriber.' });
  }
};

/**
 * Admin: POST /api/admin/newsletter/delete-bulk
 */
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No subscriber IDs provided.' });
    }
    const result = await newsletterService.bulkDelete(ids);
    return res.json({ success: true, message: `${result.deletedCount} subscribers deleted successfully.` });
  } catch (err) {
    console.error('❌ Error bulk deleting subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk delete subscribers.' });
  }
};

/**
 * Admin: PATCH /api/admin/newsletter/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const updated = await newsletterService.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Subscriber not found.' });
    }
    return res.json({ success: true, message: 'Subscriber status updated.', data: updated });
  } catch (err) {
    console.error('❌ Error updating subscriber status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subscriber status.' });
  }
};

/**
 * Admin: GET /api/admin/newsletter/export
 */
const exportAll = async (req, res) => {
  try {
    const records = await newsletterService.getAllForExport();
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('❌ Error exporting subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to export subscribers.' });
  }
};

module.exports = {
  subscribe,
  getSubscribers,
  getStats,
  deleteSubscriber,
  bulkDelete,
  updateStatus,
  exportAll
};
