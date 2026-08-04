const express = require('express');
const router = express.Router();
const courseCtrl = require('../controllers/course.controller');
const quizCtrl = require('../controllers/quiz.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// Public course browsing
router.get('/', optionalAuth, courseCtrl.listCourses);
router.get('/quizzes/:quizId', quizCtrl.getQuiz);
router.get('/:slug', optionalAuth, courseCtrl.getCourseDetail);

// Protected lesson progress & quiz evaluation
router.use(protect);
router.post('/lessons/:lessonId/progress', courseCtrl.markLessonProgress);
router.post('/quizzes/:quizId/submit', quizCtrl.submitAttempt);

module.exports = router;
