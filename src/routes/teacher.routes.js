const express = require('express');
const router = express.Router();
const teacherCtrl = require('../controllers/teacher.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// Public routes
router.get('/', optionalAuth, teacherCtrl.listTeachers);
router.get('/:id', optionalAuth, teacherCtrl.getTeacherProfile);

// Protected routes (User registration & profile update)
router.post('/register', protect, teacherCtrl.registerTeacher);
router.put('/me', protect, teacherCtrl.updateMyTeacherProfile);

module.exports = router;
