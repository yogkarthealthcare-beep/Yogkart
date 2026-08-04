const crypto = require('crypto');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/courses/quizzes/:quizId
 * Fetch quiz questions for taking the test
 */
exports.getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizRes = await db.query(
      'SELECT id, course_id, title, pass_percentage FROM quizzes WHERE id = $1',
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      return errorResponse(res, 'Quiz not found', 404);
    }

    const quiz = quizRes.rows[0];

    // Fetch questions without revealing correct answer index
    const qRes = await db.query(
      'SELECT id, question_text, options FROM quiz_questions WHERE quiz_id = $1 ORDER BY created_at ASC',
      [quizId]
    );

    quiz.questions = qRes.rows;

    return successResponse(res, { quiz }, 'Quiz questions fetched');
  } catch (error) {
    console.error('getQuiz error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/courses/quizzes/:quizId/submit
 * Evaluate quiz attempt 100% SERVER-SIDE
 */
exports.submitAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const { answers = [] } = req.body; // [{ question_id, selected_option_index }]

    const quizRes = await db.query(
      `SELECT q.id, q.course_id, q.title, q.pass_percentage, c.title as course_name
       FROM quizzes q
       JOIN courses c ON q.course_id = c.id
       WHERE q.id = $1`,
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      return errorResponse(res, 'Quiz not found', 404);
    }

    const quiz = quizRes.rows[0];

    // Fetch correct options from DB
    const qRes = await db.query(
      'SELECT id, correct_option_index FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );

    const correctMap = {};
    qRes.rows.forEach(q => {
      correctMap[q.id] = q.correct_option_index;
    });

    const totalQuestions = qRes.rows.length;
    let correctCount = 0;

    if (Array.isArray(answers)) {
      answers.forEach(ans => {
        if (ans.question_id && correctMap[ans.question_id] !== undefined) {
          if (parseInt(ans.selected_option_index, 10) === correctMap[ans.question_id]) {
            correctCount++;
          }
        }
      });
    }

    const scorePercentage = Math.round((correctCount / (totalQuestions || 1)) * 100);
    const passed = scorePercentage >= quiz.pass_percentage;

    // Record attempt
    await db.query(
      `INSERT INTO quiz_attempts (user_id, quiz_id, score_percentage, passed)
       VALUES ($1, $2, $3, $4)`,
      [userId, quizId, scorePercentage, passed]
    );

    let certificate = null;

    // If passed, auto-issue certificate if not already issued
    if (passed) {
      const existingCert = await db.query(
        'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
        [userId, quiz.course_id]
      );

      if (existingCert.rows.length > 0) {
        certificate = existingCert.rows[0];
      } else {
        const certUid = `CERT-YK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const newCert = await db.query(
          `INSERT INTO certificates (certificate_uid, user_id, course_id, user_name, course_name)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [certUid, userId, quiz.course_id, req.user.name, quiz.course_name]
        );
        certificate = newCert.rows[0];
      }
    }

    return successResponse(res, {
      score_percentage: scorePercentage,
      passed,
      pass_percentage: quiz.pass_percentage,
      correct_count: correctCount,
      total_questions: totalQuestions,
      certificate
    }, passed ? 'Congratulations! You passed the quiz and earned a certificate.' : 'Quiz completed. Keep practicing to pass!');
  } catch (error) {
    console.error('submitAttempt error:', error);
    return errorResponse(res, error.message, 500);
  }
};
