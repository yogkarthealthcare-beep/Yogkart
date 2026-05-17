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

router.use(protect);

router.post('/update-steps', validateUpdateSteps, assertOwnUser, ctrl.updateSteps);
router.get('/daily-steps/:userId', validateDailyAnalytics, assertOwnUser, ctrl.getDailyAnalytics);
router.get('/weekly-steps/:userId', validateWeeklyAnalytics, assertOwnUser, ctrl.getWeeklyAnalytics);
router.get('/monthly-steps/:userId', validateMonthlyAnalytics, assertOwnUser, ctrl.getMonthlyAnalytics);
router.get('/calories-report/:userId', validateCaloriesReport, assertOwnUser, ctrl.getCaloriesReport);
router.get('/activity-history/:userId', validateUserIdParam, assertOwnUser, ctrl.getActivityHistory);
router.post('/goals', validateCreateGoal, assertOwnUser, ctrl.createGoal);
router.get('/goals/:userId/progress', validateDailyAnalytics, assertOwnUser, ctrl.getGoalProgress);
router.post('/fitness-reminders/:userId', validateDailyAnalytics, assertOwnUser, ctrl.scheduleFitnessReminders);
router.get('/fitness-notifications/:userId', validateUserIdParam, assertOwnUser, ctrl.getNotifications);

module.exports = router;
