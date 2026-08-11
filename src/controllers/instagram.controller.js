const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// GET /api/instagram-reels (Public — Active Reels for Homepage)
const getPublicReels = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM instagram_reels WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`
    );
    return success(res, { reels: result.rows });
  } catch (err) {
    console.error('Error fetching public instagram reels:', err);
    return error(res, 'Failed to fetch instagram reels');
  }
};

// GET /api/admin/instagram-reels (Admin — All Reels)
const getAdminReels = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM instagram_reels ORDER BY sort_order ASC, id ASC`
    );
    return success(res, { reels: result.rows });
  } catch (err) {
    console.error('Error fetching admin instagram reels:', err);
    return error(res, 'Failed to fetch instagram reels');
  }
};

// POST /api/admin/instagram-reels (Admin — Create Reel)
const createReel = async (req, res) => {
  try {
    const { title, video_url, instagram_link, sort_order = 0, is_active = true } = req.body;
    if (!video_url || !instagram_link) {
      return error(res, 'video_url and instagram_link are required fields');
    }

    const result = await query(
      `INSERT INTO instagram_reels (title, video_url, instagram_link, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title || '', video_url.trim(), instagram_link.trim(), parseInt(sort_order) || 0, Boolean(is_active)]
    );

    return success(res, { reel: result.rows[0] }, 'Instagram reel created successfully', 201);
  } catch (err) {
    console.error('Error creating instagram reel:', err);
    return error(res, 'Failed to create instagram reel');
  }
};

// PUT /api/admin/instagram-reels/:id (Admin — Update Reel)
const updateReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, video_url, instagram_link, sort_order, is_active } = req.body;

    const check = await query('SELECT id FROM instagram_reels WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return error(res, 'Instagram reel not found', 404);
    }

    const result = await query(
      `UPDATE instagram_reels
       SET title = $1, video_url = $2, instagram_link = $3, sort_order = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        title || '',
        video_url ? video_url.trim() : '',
        instagram_link ? instagram_link.trim() : '',
        parseInt(sort_order) || 0,
        Boolean(is_active),
        id
      ]
    );

    return success(res, { reel: result.rows[0] }, 'Instagram reel updated successfully');
  } catch (err) {
    console.error('Error updating instagram reel:', err);
    return error(res, 'Failed to update instagram reel');
  }
};

// DELETE /api/admin/instagram-reels/:id (Admin — Delete Reel)
const deleteReel = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM instagram_reels WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return error(res, 'Instagram reel not found', 404);
    }
    return success(res, { id }, 'Instagram reel deleted successfully');
  } catch (err) {
    console.error('Error deleting instagram reel:', err);
    return error(res, 'Failed to delete instagram reel');
  }
};

// PATCH /api/admin/instagram-reels/:id/toggle (Admin — Toggle Active Status)
const toggleReelActive = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE instagram_reels SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) {
      return error(res, 'Instagram reel not found', 404);
    }
    return success(res, { reel: result.rows[0] }, 'Instagram reel status updated');
  } catch (err) {
    console.error('Error toggling instagram reel status:', err);
    return error(res, 'Failed to toggle instagram reel status');
  }
};

module.exports = {
  getPublicReels,
  getAdminReels,
  createReel,
  updateReel,
  deleteReel,
  toggleReelActive
};
