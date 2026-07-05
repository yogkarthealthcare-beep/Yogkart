const { success, error, badRequest } = require('../utils/response');
const {
  getAdminGatewaySettings,
  updateGatewaySettings,
} = require('../services/paymentGatewaySettings.service');

const list = async (_req, res) => {
  try {
    return success(res, { gateways: await getAdminGatewaySettings() });
  } catch (err) {
    console.error('List payment gateways error:', err.message);
    return error(res, 'Failed to load payment gateway settings');
  }
};

const update = async (req, res) => {
  try {
    const gateway = await updateGatewaySettings(req.params.gateway, req.body, {
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return success(res, { gateway }, `${gateway.displayName} settings saved successfully`);
  } catch (err) {
    console.error('Update payment gateway error:', err.message);
    if (err.status === 400) return badRequest(res, err.message);
    return error(res, err.message || 'Failed to save payment gateway settings', err.status || 500);
  }
};

module.exports = { list, update };
