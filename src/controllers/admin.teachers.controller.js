const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/admin/teachers
 * Admin list of all teachers with filter by verification_status
 */
exports.getTeachers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`t.verification_status = $${idx++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR t.city ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await db.query(
      `SELECT COUNT(*) FROM teachers t JOIN users u ON t.user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const queryParams = [...params, parseInt(limit, 10), offset];
    const teachersRes = await db.query(
      `SELECT 
        t.id, t.user_id, u.name, u.email, u.phone,
        t.bio, t.city, t.specialization, t.years_exp,
        t.profile_photo_url, t.hourly_rate, t.verification_status,
        t.rating_avg, t.review_count, t.created_at
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      queryParams
    );

    return successResponse(res, {
      teachers: teachersRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Teachers fetched successfully');
  } catch (error) {
    console.error('admin getTeachers error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * PUT /api/admin/teachers/:id/status
 * Approve or reject a teacher registration
 */
exports.updateTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return errorResponse(res, "Invalid status. Must be 'approved', 'rejected', or 'pending'", 400);
    }

    const result = await db.query(
      `UPDATE teachers
       SET verification_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, verification_status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    return successResponse(res, { teacher: result.rows[0] }, `Teacher application marked as ${status}`);
  } catch (error) {
    console.error('updateTeacherStatus error:', error);
    return errorResponse(res, error.message, 500);
  }
};
