const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/teacher-bookings/slots/:teacherId
 * Fetch available time slots for a teacher on a specific booking_date
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      return errorResponse(res, 'date query parameter is required (YYYY-MM-DD)', 400);
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return errorResponse(res, 'Invalid date format', 400);
    }

    const dayOfWeek = bookingDate.getDay(); // 0=Sunday

    // Get teacher weekly slots for this day of week
    const slotsRes = await db.query(
      `SELECT id, start_time, end_time
       FROM teacher_slots
       WHERE teacher_id = $1 AND day_of_week = $2 AND is_active = TRUE
       ORDER BY start_time`,
      [teacherId, dayOfWeek]
    );

    // Get already booked slots for this teacher on this date
    const bookedRes = await db.query(
      `SELECT slot_id
       FROM teacher_bookings
       WHERE teacher_id = $1 AND booking_date = $2 AND status != 'cancelled'`,
      [teacherId, date]
    );

    const bookedSlotIds = new Set(bookedRes.rows.map(b => b.slot_id));

    const slots = slotsRes.rows.map(slot => ({
      ...slot,
      is_available: !bookedSlotIds.has(slot.id)
    }));

    return successResponse(res, { slots, date, day_of_week: dayOfWeek }, 'Available slots fetched');
  } catch (error) {
    console.error('getAvailableSlots error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/teacher-bookings
 * Create a new slot booking
 */
exports.createBooking = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { teacher_id, slot_id, booking_date, notes } = req.body;

    if (!teacher_id || !slot_id || !booking_date) {
      return errorResponse(res, 'teacher_id, slot_id, and booking_date are required', 400);
    }

    // Verify slot is not already booked
    const existing = await db.query(
      `SELECT id FROM teacher_bookings
       WHERE teacher_id = $1 AND slot_id = $2 AND booking_date = $3 AND status != 'cancelled'`,
      [teacher_id, slot_id, booking_date]
    );

    if (existing.rows.length > 0) {
      return errorResponse(res, 'This slot is already booked for the selected date', 400);
    }

    const bookingRes = await db.query(
      `INSERT INTO teacher_bookings (student_id, teacher_id, slot_id, booking_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, teacher_id, slot_id, booking_date, notes || null]
    );

    return successResponse(res, { booking: bookingRes.rows[0] }, 'Booking created successfully', 201);
  } catch (error) {
    console.error('createBooking error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/teacher-bookings/my
 * Get list of bookings for current user (either as student or teacher)
 */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is a teacher
    const teacherRes = await db.query('SELECT id FROM teachers WHERE user_id = $1', [userId]);
    const teacherId = teacherRes.rows[0]?.id;

    let queryStr = `
      SELECT 
        tb.id, tb.booking_date, tb.status, tb.notes, tb.created_at,
        ts.start_time, ts.end_time,
        t.id as teacher_id, u_t.name as teacher_name, t.city as teacher_city,
        u_s.name as student_name, u_s.email as student_email, u_s.phone as student_phone,
        tr.rating as review_rating, tr.comment as review_comment
      FROM teacher_bookings tb
      JOIN teachers t ON tb.teacher_id = t.id
      JOIN users u_t ON t.user_id = u_t.id
      JOIN users u_s ON tb.student_id = u_s.id
      LEFT JOIN teacher_slots ts ON tb.slot_id = ts.id
      LEFT JOIN teacher_reviews tr ON tr.booking_id = tb.id
      WHERE tb.student_id = $1 ${teacherId ? 'OR tb.teacher_id = $2' : ''}
      ORDER BY tb.booking_date DESC, ts.start_time ASC
    `;

    const params = teacherId ? [userId, teacherId] : [userId];
    const result = await db.query(queryStr, params);

    return successResponse(res, { bookings: result.rows }, 'Bookings fetched');
  } catch (error) {
    console.error('getMyBookings error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/teacher-bookings/reviews
 * Submit a review & rating for a completed booking
 */
exports.submitReview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { booking_id, teacher_id, rating, comment } = req.body;

    const rateVal = parseInt(rating, 10);
    if (isNaN(rateVal) || rateVal < 1 || rateVal > 5) {
      return errorResponse(res, 'Rating must be an integer between 1 and 5', 400);
    }

    if (!teacher_id) {
      return errorResponse(res, 'teacher_id is required', 400);
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const reviewRes = await client.query(
        `INSERT INTO teacher_reviews (booking_id, student_id, teacher_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [booking_id || null, studentId, teacher_id, rateVal, comment || '']
      );

      // Recalculate teacher average rating and review count
      const statsRes = await client.query(
        `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*)::int as count
         FROM teacher_reviews
         WHERE teacher_id = $1`,
        [teacher_id]
      );

      const { avg_rating, count } = statsRes.rows[0];

      await client.query(
        `UPDATE teachers
         SET rating_avg = $1, review_count = $2, updated_at = NOW()
         WHERE id = $3`,
        [avg_rating || rateVal, count || 1, teacher_id]
      );

      await client.query('COMMIT');

      return successResponse(res, { review: reviewRes.rows[0] }, 'Review submitted successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('submitReview error:', error);
    return errorResponse(res, error.message, 500);
  }
};
