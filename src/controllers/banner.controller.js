// src/controllers/banner.controller.js
const { query } = require('../config/database');
const { success, error, badRequest, notFound } = require('../utils/response');

// ── GET /api/banners  (public — frontend slider) ────────────────────────────
const getBanners = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM banners WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`
    );
    return success(res, { banners: result.rows });
  } catch (err) {
    console.error('[Banner Controller] getBanners error:', err);
    return error(res, 'Failed to fetch banners');
  }
};

// ── GET /api/admin/banners  (admin — all banners) ───────────────────────────
const adminGetBanners = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM banners ORDER BY sort_order ASC, id ASC`
    );
    return success(res, { banners: result.rows });
  } catch (err) {
    console.error('[Banner Controller] adminGetBanners error:', err);
    return error(res, 'Failed to fetch banners');
  }
};

// ── POST /api/admin/banners ──────────────────────────────────────────────────
const createBanner = async (req, res) => {
  try {
    const {
      type, title, subtitle, badge, bg_color, image,
      cta_text, cta_link, sort_order, is_active,
      product_id, product_name, product_price, product_image,
      coupon_code, coupon_discount, coupon_expiry,
    } = req.body;

    if (!type || !title) return badRequest(res, 'type aur title required hain');
    if (!['product', 'festival', 'coupon'].includes(type)) {
      return badRequest(res, 'type sirf product, festival, ya coupon ho sakta hai');
    }

    const result = await query(
      `INSERT INTO banners
        (type, title, subtitle, badge, bg_color, image, cta_text, cta_link, sort_order, is_active,
         product_id, product_name, product_price, product_image,
         coupon_code, coupon_discount, coupon_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        type, title, subtitle || null, badge || null,
        bg_color || '#064e3b', image || null,
        cta_text || 'Shop Now', cta_link || '/products',
        sort_order ?? 0, is_active ?? true,
        product_id || null, product_name || null,
        product_price || null, product_image || null,
        coupon_code || null, coupon_discount || null,
        coupon_expiry || null,
      ]
    );
    return success(res, { banner: result.rows[0] }, 'Banner created');
  } catch (err) {
    console.error('[Banner Controller] createBanner error:', err);
    return error(res, 'Failed to create banner');
  }
};

// ── PUT /api/admin/banners/:id ───────────────────────────────────────────────
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type, title, subtitle, badge, bg_color, image,
      cta_text, cta_link, sort_order, is_active,
      product_id, product_name, product_price, product_image,
      coupon_code, coupon_discount, coupon_expiry,
    } = req.body;

    const result = await query(
      `UPDATE banners SET
        type=$1, title=$2, subtitle=$3, badge=$4, bg_color=$5, image=$6,
        cta_text=$7, cta_link=$8, sort_order=$9, is_active=$10,
        product_id=$11, product_name=$12, product_price=$13, product_image=$14,
        coupon_code=$15, coupon_discount=$16, coupon_expiry=$17,
        updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [
        type, title, subtitle || null, badge || null,
        bg_color || '#064e3b', image || null,
        cta_text || 'Shop Now', cta_link || '/products',
        sort_order ?? 0, is_active ?? true,
        product_id || null, product_name || null,
        product_price || null, product_image || null,
        coupon_code || null, coupon_discount || null,
        coupon_expiry || null, id,
      ]
    );
    if (!result.rows.length) return notFound(res, 'Banner not found');
    return success(res, { banner: result.rows[0] }, 'Banner updated');
  } catch (err) {
    console.error('[Banner Controller] updateBanner error:', err);
    return error(res, 'Failed to update banner');
  }
};

// ── DELETE /api/admin/banners/:id ────────────────────────────────────────────
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM banners WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length) return notFound(res, 'Banner not found');
    return success(res, null, 'Banner deleted');
  } catch (err) {
    console.error('[Banner Controller] deleteBanner error:', err);
    return error(res, 'Failed to delete banner');
  }
};

// ── PATCH /api/admin/banners/:id/toggle ─────────────────────────────────────
const toggleBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE banners SET is_active = NOT is_active, updated_at=NOW()
       WHERE id=$1 RETURNING id, is_active`, [id]
    );
    if (!result.rows.length) return notFound(res, 'Banner not found');
    return success(res, result.rows[0], `Banner ${result.rows[0].is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    console.error('[Banner Controller] toggleBanner error:', err);
    return error(res, 'Failed to toggle banner');
  }
};

module.exports = { getBanners, adminGetBanners, createBanner, updateBanner, deleteBanner, toggleBanner };
