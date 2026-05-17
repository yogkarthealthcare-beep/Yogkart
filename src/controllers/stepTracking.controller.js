const stepTrackingService = require('../services/stepTracking.service');
const fitnessReminderService = require('../services/fitnessReminder.service');
const notificationModel = require('../models/fitnessNotification.model');

const updateSteps = async (req, res, next) => {
  try {
    const data = await stepTrackingService.updateSteps({
      userId: req.body.userId,
      steps: Number(req.body.steps),
      distance: Number(req.body.distance),
      calories: Number(req.body.calories),
      date: req.body.date,
    });

    return res.status(200).json({
      success: true,
      message: 'Step data updated successfully.',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

const getDailyAnalytics = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getDailyAnalytics({
      userId: req.params.userId,
      date: req.query.date,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

const getWeeklyAnalytics = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getWeeklyAnalytics({
      userId: req.params.userId,
      startDate: req.query.startDate,
    });

    return res.status(200).json({
      success: true,
      weeklyData: data.weeklyData,
      summary: data.summary,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  } catch (err) {
    return next(err);
  }
};

const getMonthlyAnalytics = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getMonthlyAnalytics({
      userId: req.params.userId,
      month: req.query.month,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
};

const getCaloriesReport = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getCaloriesReport({
      userId: req.params.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
};

const createGoal = async (req, res, next) => {
  try {
    const goal = await stepTrackingService.createGoal({
      userId: req.body.userId,
      goalType: req.body.goalType,
      targetValue: Number(req.body.targetValue),
      unit: req.body.unit || (req.body.goalType === 'weight_loss' ? 'kg' : 'steps'),
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Goal created successfully.',
      goal,
    });
  } catch (err) {
    return next(err);
  }
};

const getGoalProgress = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getGoalProgress({
      userId: req.params.userId,
      date: req.query.date,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

const getActivityHistory = async (req, res, next) => {
  try {
    const data = await stepTrackingService.getActivityHistory({
      userId: req.params.userId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
};

const scheduleFitnessReminders = async (req, res, next) => {
  try {
    const progress = await stepTrackingService.getDailyAnalytics({
      userId: req.params.userId,
      date: req.query.date,
    });

    const notifications = await fitnessReminderService.scheduleFitnessReminders({
      userId: req.params.userId,
      steps: progress.steps,
      dailyGoal: progress.dailyGoal,
    });

    return res.status(201).json({
      success: true,
      message: 'Fitness reminders scheduled successfully.',
      notifications,
    });
  } catch (err) {
    return next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationModel.getFitnessNotifications({
      userId: req.params.userId,
      limit: Number(req.query.limit) || 20,
    });

    return res.status(200).json({ success: true, notifications });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  updateSteps,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getCaloriesReport,
  createGoal,
  getGoalProgress,
  getActivityHistory,
  scheduleFitnessReminders,
  getNotifications,
};
