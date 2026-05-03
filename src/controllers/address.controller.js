const { query }  = require('../config/database');
const { success, badRequest, error, notFound } = require('../utils/response');

// ── GET /api/addresses ────────────────────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    return success(res, result.rows, 'Addresses fetched');
  } catch (err) {
    console.error('getAddresses error:', err);
    return error(res, 'Failed to fetch addresses');
  }
};

// ── POST /api/addresses ───────────────────────────────────────────────────────
const addAddress = async (req, res) => {
  try {
    const { name, phone, line1, line2, city, state, pincode, is_default = false } = req.body;

    if (!name || !phone || !line1 || !city || !state || !pincode)
      return badRequest(res, 'name, phone, line1, city, state, pincode are required');

    // Agar naya address default hai toh baaki sab ka default hata do
    if (is_default) {
      await query(
        `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
        [req.user.id]
      );
    }

    const result = await query(
      `INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pincode, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [req.user.id, name, phone, line1, line2 || null, city, state, pincode, is_default]
    );

    return success(res, result.rows[0], 'Address saved successfully');
  } catch (err) {
    console.error('addAddress error:', err);
    return error(res, 'Failed to save address');
  }
};

// ── PUT /api/addresses/:id ────────────────────────────────────────────────────
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, line1, line2, city, state, pincode, is_default } = req.body;

    // Verify ownership
    const owns = await query(
      `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (owns.rows.length === 0) return notFound(res, 'Address not found');

    if (is_default) {
      await query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
    }

    const result = await query(
      `UPDATE addresses
       SET name=$1, phone=$2, line1=$3, line2=$4, city=$5, state=$6, pincode=$7, is_default=$8
       WHERE id=$9 AND user_id=$10
       RETURNING *`,
      [name, phone, line1, line2 || null, city, state, pincode, is_default ?? false, id, req.user.id]
    );

    return success(res, result.rows[0], 'Address updated');
  } catch (err) {
    console.error('updateAddress error:', err);
    return error(res, 'Failed to update address');
  }
};

// ── DELETE /api/addresses/:id ─────────────────────────────────────────────────
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return notFound(res, 'Address not found');
    return success(res, null, 'Address deleted');
  } catch (err) {
    console.error('deleteAddress error:', err);
    return error(res, 'Failed to delete address');
  }
};

// ── PATCH /api/addresses/:id/default ─────────────────────────────────────────
const setDefault = async (req, res) => {
  try {
    const { id } = req.params;

    const owns = await query(
      `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (owns.rows.length === 0) return notFound(res, 'Address not found');

    // Pehle sab ka default hatao
    await query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);

    // Ab is ek ka default set karo
    const result = await query(
      `UPDATE addresses SET is_default = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    return success(res, result.rows[0], 'Default address updated');
  } catch (err) {
    console.error('setDefault error:', err);
    return error(res, 'Failed to set default address');
  }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, setDefault };
