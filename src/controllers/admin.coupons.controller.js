const { query } = require('../config/database');
const { success, created, notFound, error, paginated } = require('../utils/response');

// ── GET /api/admin/coupons ─────────────────────────────
const getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const conditions = [];
    if (status === 'active')   conditions.push('is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())');
    if (status === 'expired')  conditions.push('expires_at < NOW()');
    if (status === 'inactive') conditions.push('is_active = FALSE');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM coupons ${where}`);
    const total = parseInt(countRes.rows[0].count);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT * FROM coupons ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('getCoupons error:', err);
    return error(res, 'Failed to fetch coupons');
  }
};

// ── POST /api/admin/coupons ────────────────────────────
const createCoupon = async (req, res) => {
  try {
    const {
      code, discount_type, discount_value,
      min_order_value = 0, max_uses,
      expires_at, is_active = true, description,
    } = req.body;

    if (!code || !discount_type || !discount_value) {
      return error(res, 'code, discount_type, discount_value required', 400);
    }
    if (!['percent', 'flat'].includes(discount_type)) {
      return error(res, 'discount_type must be percent or flat', 400);
    }
    if (discount_type === 'percent' && discount_value > 100) {
      return error(res, 'Percentage discount cannot exceed 100', 400);
    }

    const result = await query(
      `INSERT INTO coupons
         (code, discount_type, discount_value, min_order_value, max_uses, expires_at, is_active, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code.toUpperCase(), discount_type, discount_value, min_order_value, max_uses, expires_at, is_active, description]
    );

    return created(res, { coupon: result.rows[0] }, 'Coupon created');
  } catch (err) {
    if (err.code === '23505') return error(res, 'Coupon code already exists', 409);
    console.error('createCoupon error:', err);
    return error(res, 'Failed to create coupon');
  }
};

// ── PUT /api/admin/coupons/:id ─────────────────────────
const updateCoupon = async (req, res) => {
  try {
    const fields = ['discount_value', 'min_order_value', 'max_uses', 'expires_at', 'is_active', 'description'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`);
        params.push(req.body[f]);
      }
    }

    if (!updates.length) return error(res, 'No fields to update', 400);

    params.push(req.params.id);
    const result = await query(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows.length) return notFound(res, 'Coupon not found');
    return success(res, { coupon: result.rows[0] }, 'Coupon updated');
  } catch (err) {
    return error(res, 'Failed to update coupon');
  }
};

// ── DELETE /api/admin/coupons/:id ─────────────────────
const deleteCoupon = async (req, res) => {
  try {
    const result = await query('DELETE FROM coupons WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return notFound(res, 'Coupon not found');
    return success(res, null, 'Coupon deleted');
  } catch (err) {
    return error(res, 'Failed to delete coupon');
  }
};

// ── POST /api/admin/coupons/validate (test a coupon) ──
const validateCoupon = async (req, res) => {
  try {
    const { code, order_total } = req.body;
    const result = await query(
      `SELECT * FROM coupons
       WHERE code = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [code?.toUpperCase()]
    );

    if (!result.rows.length) return error(res, 'Invalid or expired coupon', 400);

    const coupon = result.rows[0];
    if (order_total < coupon.min_order_value) {
      return error(res, `Minimum order value ₹${coupon.min_order_value} required`, 400);
    }

    const discount = coupon.discount_type === 'percent'
      ? Math.min((order_total * coupon.discount_value) / 100, coupon.max_discount_value || Infinity)
      : coupon.discount_value;

    return success(res, { coupon, discount_amount: Math.round(discount) }, 'Coupon valid');
  } catch (err) {
    return error(res, 'Failed to validate coupon');
  }
};

module.exports = { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon };
