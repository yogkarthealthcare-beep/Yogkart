const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stepTracking.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  assertOwnUser,
  validateUpdateSteps,
  validateUserIdParam,
  validateDailyAnalytics,
  validateWeeklyAnalytics,
  validateMonthlyAnalytics,
  validateCaloriesReport,
  validateCreateGoal,
} = require('../middleware/stepTracking.middleware');

router.post('/update-steps', protect, validateUpdateSteps, assertOwnUser, ctrl.updateSteps);
router.get('/daily-steps/:userId', protect, validateDailyAnalytics, assertOwnUser, ctrl.getDailyAnalytics);
router.get('/weekly-steps/:userId', protect, validateWeeklyAnalytics, assertOwnUser, ctrl.getWeeklyAnalytics);
router.get('/monthly-steps/:userId', protect, validateMonthlyAnalytics, assertOwnUser, ctrl.getMonthlyAnalytics);
router.get('/calories-report/:userId', protect, validateCaloriesReport, assertOwnUser, ctrl.getCaloriesReport);
router.get('/activity-history/:userId', protect, validateUserIdParam, assertOwnUser, ctrl.getActivityHistory);
router.post('/goals', protect, validateCreateGoal, assertOwnUser, ctrl.createGoal);
router.get('/goals/:userId/progress', protect, validateDailyAnalytics, assertOwnUser, ctrl.getGoalProgress);
router.post('/fitness-reminders/:userId', protect, validateDailyAnalytics, assertOwnUser, ctrl.scheduleFitnessReminders);
router.get('/fitness-notifications/:userId', protect, validateUserIdParam, assertOwnUser, ctrl.getNotifications);

module.exports = router;
