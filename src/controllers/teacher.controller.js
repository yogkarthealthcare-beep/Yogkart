const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/teachers
 * Public endpoint to search and filter verified teachers
 */
exports.listTeachers = async (req, res) => {
  try {
    const {
      city, specialization, search,
      page = 1, limit = 12, sort = 'rating'
    } = req.query;

    const conditions = ["t.verification_status = 'approved'"];
    const params = [];
    let idx = 1;

    if (city) {
      conditions.push(`t.city ILIKE $${idx++}`);
      params.push(`%${city}%`);
    }

    if (specialization) {
      conditions.push(`$${idx++} = ANY(t.specialization)`);
      params.push(specialization);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR t.bio ILIKE $${idx} OR t.city ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 't.rating_avg DESC';
    if (sort === 'experience') orderBy = 't.years_exp DESC';
    if (sort === 'price_low') orderBy = 't.hourly_rate ASC';
    if (sort === 'price_high') orderBy = 't.hourly_rate DESC';

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
        t.profile_photo_url, t.hourly_rate, t.rating_avg, t.review_count,
        t.verification_status, t.created_at
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY ${orderBy}
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
    console.error('listTeachers error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/teachers/:id
 * Public endpoint to fetch full teacher profile
 */
exports.getTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const teacherRes = await db.query(
      `SELECT 
        t.id, t.user_id, u.name, u.email, u.phone,
        t.bio, t.city, t.specialization, t.years_exp,
        t.profile_photo_url, t.hourly_rate, t.rating_avg, t.review_count,
        t.verification_status, t.created_at
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (teacherRes.rows.length === 0) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    const teacher = teacherRes.rows[0];

    // Qualifications
    const qualRes = await db.query(
      'SELECT id, title, institute, year FROM teacher_qualifications WHERE teacher_id = $1 ORDER BY year DESC',
      [id]
    );

    // Active slots
    const slotsRes = await db.query(
      'SELECT id, day_of_week, start_time, end_time FROM teacher_slots WHERE teacher_id = $1 AND is_active = TRUE ORDER BY day_of_week, start_time',
      [id]
    );

    // Recent reviews
    const reviewsRes = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name as student_name
       FROM teacher_reviews r
       JOIN users u ON r.student_id = u.id
       WHERE r.teacher_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    teacher.qualifications = qualRes.rows;
    teacher.slots = slotsRes.rows;
    teacher.reviews = reviewsRes.rows;

    return successResponse(res, { teacher }, 'Teacher profile fetched');
  } catch (error) {
    console.error('getTeacherProfile error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/teachers/register
 * Apply as a teacher
 */
exports.registerTeacher = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bio, city, specialization = [], years_exp = 0,
      hourly_rate = 0, profile_photo_url = '', qualifications = []
    } = req.body;

    if (!city) {
      return errorResponse(res, 'City is required', 400);
    }

    // Check if already registered as teacher
    const existing = await db.query('SELECT id, verification_status FROM teachers WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return errorResponse(res, `Already registered as a teacher (Status: ${existing.rows[0].verification_status})`, 400);
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const teacherRes = await client.query(
        `INSERT INTO teachers (user_id, bio, city, specialization, years_exp, hourly_rate, profile_photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, bio || '', city, specialization, parseInt(years_exp, 10), parseFloat(hourly_rate), profile_photo_url || null]
      );

      const teacher = teacherRes.rows[0];

      if (Array.isArray(qualifications) && qualifications.length > 0) {
        for (const q of qualifications) {
          if (q.title && q.institute) {
            await client.query(
              `INSERT INTO teacher_qualifications (teacher_id, title, institute, year)
               VALUES ($1, $2, $3, $4)`,
              [teacher.id, q.title, q.institute, q.year ? parseInt(q.year, 10) : null]
            );
          }
        }
      }

      await client.query('COMMIT');

      return successResponse(res, { teacher }, 'Teacher application submitted for approval', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('registerTeacher error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * PUT /api/teachers/me
 * Update logged in teacher's profile & slots
 */
exports.updateMyTeacherProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, city, specialization, years_exp, hourly_rate, profile_photo_url, slots } = req.body;

    const teacherRes = await db.query('SELECT id FROM teachers WHERE user_id = $1', [userId]);
    if (teacherRes.rows.length === 0) {
      return errorResponse(res, 'Teacher profile not found for user', 404);
    }

    const teacherId = teacherRes.rows[0].id;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE teachers
         SET bio = COALESCE($1, bio),
             city = COALESCE($2, city),
             specialization = COALESCE($3, specialization),
             years_exp = COALESCE($4, years_exp),
             hourly_rate = COALESCE($5, hourly_rate),
             profile_photo_url = COALESCE($6, profile_photo_url),
             updated_at = NOW()
         WHERE id = $7`,
        [bio, city, specialization, years_exp !== undefined ? parseInt(years_exp, 10) : null, hourly_rate !== undefined ? parseFloat(hourly_rate) : null, profile_photo_url, teacherId]
      );

      // Manage slots if provided
      if (Array.isArray(slots)) {
        await client.query('DELETE FROM teacher_slots WHERE teacher_id = $1', [teacherId]);
        for (const slot of slots) {
          if (slot.day_of_week !== undefined && slot.start_time && slot.end_time) {
            await client.query(
              `INSERT INTO teacher_slots (teacher_id, day_of_week, start_time, end_time)
               VALUES ($1, $2, $3, $4)`,
              [teacherId, parseInt(slot.day_of_week, 10), slot.start_time, slot.end_time]
            );
          }
        }
      }

      await client.query('COMMIT');
      return exports.getTeacherProfile({ params: { id: teacherId } }, res);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('updateMyTeacherProfile error:', error);
    return errorResponse(res, error.message, 500);
  }
};
