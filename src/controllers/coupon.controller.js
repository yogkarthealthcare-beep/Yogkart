const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const calculateDiscount = (coupon, orderTotal) => {
  const total = Number(orderTotal || 0);
  const value = Number(coupon.discount_value || 0);
  const raw = coupon.discount_type === 'percent'
    ? (total * value) / 100
    : value;
  return Math.max(0, Math.min(total, Math.round(raw)));
};

const validateCoupon = async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    const orderTotal = Number(req.body.order_total ?? req.body.orderTotal ?? 0);
    if (!code) return error(res, 'Coupon code required', 400);
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return error(res, 'Order total required', 400);
    }

    const result = await query(
      `SELECT *
       FROM coupons
       WHERE UPPER(code) = $1
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR current_uses < max_uses)
       LIMIT 1`,
      [code]
    );

    if (!result.rows.length) return error(res, 'Invalid or expired coupon', 400);

    const coupon = result.rows[0];
    if (orderTotal < Number(coupon.min_order_value || 0)) {
      return error(res, `Minimum order value Rs. ${coupon.min_order_value} required`, 400);
    }

    return success(res, {
      coupon,
      discount_amount: calculateDiscount(coupon, orderTotal),
    }, 'Coupon valid');
  } catch (err) {
    console.error('validateCoupon error:', err);
    return error(res, 'Failed to validate coupon');
  }
};

module.exports = { validateCoupon, calculateDiscount, normalizeCode };
