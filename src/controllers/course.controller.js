const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/courses
 * Public course catalog listing
 */
exports.listCourses = async (req, res) => {
  try {
    const { category, level, is_free, search, page = 1, limit = 12 } = req.query;

    const conditions = ['is_published = TRUE'];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`category ILIKE $${idx++}`);
      params.push(`%${category}%`);
    }

    if (level) {
      conditions.push(`level ILIKE $${idx++}`);
      params.push(`%${level}%`);
    }

    if (is_free === 'true') {
      conditions.push('is_free = TRUE');
    }

    if (search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await db.query(`SELECT COUNT(*) FROM courses ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const queryParams = [...params, parseInt(limit, 10), offset];
    const coursesRes = await db.query(
      `SELECT id, title, slug, description, category, level, is_free, price, thumbnail_url, duration_hours, created_at
       FROM courses
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      queryParams
    );

    return successResponse(res, {
      courses: coursesRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Courses fetched successfully');
  } catch (error) {
    console.error('listCourses error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/courses/:slug
 * Fetch single course detail with syllabus lessons & quiz info
 */
exports.getCourseDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id || null;

    const courseRes = await db.query(
      'SELECT * FROM courses WHERE slug = $1 AND is_published = TRUE',
      [slug]
    );

    if (courseRes.rows.length === 0) {
      return errorResponse(res, 'Course not found', 404);
    }

    const course = courseRes.rows[0];

    // Fetch lessons in sequence order
    const lessonsRes = await db.query(
      `SELECT id, title, description, video_url, sequence_order, duration_sec, is_preview
       FROM lessons
       WHERE course_id = $1
       ORDER BY sequence_order ASC`,
      [course.id]
    );

    let progressMap = {};
    if (userId) {
      const progRes = await db.query(
        `SELECT lp.lesson_id, lp.is_completed, lp.watched_seconds
         FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         WHERE lp.user_id = $1 AND l.course_id = $2`,
        [userId, course.id]
      );
      progRes.rows.forEach(p => {
        progressMap[p.lesson_id] = p;
      });
    }

    const lessons = lessonsRes.rows.map(l => ({
      ...l,
      is_completed: progressMap[l.id]?.is_completed || false,
      watched_seconds: progressMap[l.id]?.watched_seconds || 0
    }));

    // Check quiz availability
    const quizRes = await db.query(
      'SELECT id, title, pass_percentage FROM quizzes WHERE course_id = $1',
      [course.id]
    );

    course.lessons = lessons;
    course.quiz = quizRes.rows[0] || null;

    // Check user certificate status if logged in
    let certificate = null;
    if (userId) {
      const certRes = await db.query(
        'SELECT certificate_uid, issue_date, pdf_url FROM certificates WHERE user_id = $1 AND course_id = $2',
        [userId, course.id]
      );
      certificate = certRes.rows[0] || null;
    }
    course.certificate = certificate;

    return successResponse(res, { course }, 'Course details fetched');
  } catch (error) {
    console.error('getCourseDetail error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/courses/lessons/:lessonId/progress
 * Update lesson watch progress for logged-in user
 */
exports.markLessonProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;
    const { is_completed = true, watched_seconds = 0 } = req.body;

    const result = await db.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, is_completed, watched_seconds, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET 
         is_completed = EXCLUDED.is_completed OR lesson_progress.is_completed,
         watched_seconds = GREATEST(lesson_progress.watched_seconds, EXCLUDED.watched_seconds),
         updated_at = NOW()
       RETURNING *`,
      [userId, lessonId, Boolean(is_completed), parseInt(watched_seconds, 10)]
    );

    return successResponse(res, { progress: result.rows[0] }, 'Lesson progress updated');
  } catch (error) {
    console.error('markLessonProgress error:', error);
    return errorResponse(res, error.message, 500);
  }
};
