const { body, param, query } = require('express-validator');
const { validate } = require('./validate.middleware');

const assertOwnUser = (req, res, next) => {
  const userId = req.body.userId || req.params.userId || req.query.userId;

  if (req.user?.role === 'admin') return next();
  if (String(req.user?.id) !== String(userId)) {
    return res.status(403).json({
      success: false,
      message: 'You can access only your own fitness data.',
    });
  }

  return next();
};

const updateStepsRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('steps').isInt({ min: 0 }).withMessage('steps must be a non-negative integer'),
  body('distance').isFloat({ min: 0 }).withMessage('distance must be a non-negative number'),
  body('calories').isFloat({ min: 0 }).withMessage('calories must be a non-negative number'),
  body('date').isISO8601().withMessage('date must be a valid ISO date, e.g. 2026-05-17'),
];

const userIdParamRules = [
  param('userId').notEmpty().withMessage('userId is required'),
];

const dateQueryRules = [
  query('date').optional().isISO8601().withMessage('date must be a valid ISO date'),
];

const weeklyQueryRules = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
];

const monthlyQueryRules = [
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('month must use YYYY-MM format'),
];

const caloriesQueryRules = [
  query('startDate').isISO8601().withMessage('startDate is required and must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('endDate is required and must be a valid ISO date'),
];

const createGoalRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('goalType').isIn(['daily_steps', 'weekly_steps', 'weight_loss']).withMessage('Invalid goalType'),
  body('targetValue').isFloat({ min: 0.1 }).withMessage('targetValue must be greater than 0'),
  body('unit').optional().isLength({ min: 1, max: 30 }).withMessage('unit must be 1-30 characters'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
];

module.exports = {
  assertOwnUser,
  validateUpdateSteps: [...updateStepsRules, validate],
  validateUserIdParam: [...userIdParamRules, validate],
  validateDailyAnalytics: [...userIdParamRules, ...dateQueryRules, validate],
  validateWeeklyAnalytics: [...userIdParamRules, ...weeklyQueryRules, validate],
  validateMonthlyAnalytics: [...userIdParamRules, ...monthlyQueryRules, validate],
  validateCaloriesReport: [...userIdParamRules, ...caloriesQueryRules, validate],
  validateCreateGoal: [...createGoalRules, validate],
};
