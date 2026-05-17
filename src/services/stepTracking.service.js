const stepModel = require('../models/stepTracking.model');
const goalModel = require('../models/goal.model');
const notificationModel = require('../models/fitnessNotification.model');
const { getWeekRange, getMonthRange, toISODate } = require('../utils/dateRange');

const summarizeRows = (rows = []) => {
  const totals = rows.reduce((summary, row) => ({
    steps: summary.steps + Number(row.steps || 0),
    distance: summary.distance + Number(row.distance || 0),
    calories: summary.calories + Number(row.calories || 0),
  }), { steps: 0, distance: 0, calories: 0 });

  return {
    totalSteps: totals.steps,
    totalDistance: Number(totals.distance.toFixed(2)),
    totalCalories: Number(totals.calories.toFixed(2)),
    activeDays: rows.length,
    averageSteps: rows.length ? Math.round(totals.steps / rows.length) : 0,
  };
};

const generateProgressMessage = ({ steps, dailyGoal }) => {
  if (steps >= dailyGoal) return `Great job. You completed your ${dailyGoal} step goal.`;
  if (steps < 1000) return `You only walked ${steps} steps today.`;
  return `Complete your ${dailyGoal} step goal.`;
};

const updateSteps = async ({ userId, steps, distance, calories, date }) => {
  const trackingDate = toISODate(date);
  const dailyGoal = await goalModel.getDailyStepGoal(userId);
  const goalCompleted = steps >= dailyGoal;

  const saved = await stepModel.upsertStepTracking({
    userId,
    date: trackingDate,
    steps,
    distance,
    calories,
  });

  await stepModel.upsertDailyProgress({
    userId,
    date: trackingDate,
    steps,
    distance,
    calories,
    goalCompleted,
  });

  const message = generateProgressMessage({ steps, dailyGoal });
  if (!goalCompleted) {
    await notificationModel.createFitnessNotification({
      userId,
      type: 'goal_progress',
      title: 'Step Goal Reminder',
      message,
    });
  }

  return {
    todaySteps: Number(saved.total_steps),
    distance: Number(saved.distance_km),
    calories: Number(saved.calories),
    dailyGoal,
    goalCompleted,
    progressPercent: Math.min(100, Math.round((steps / dailyGoal) * 100)),
    progressMessage: message,
  };
};

const getDailyAnalytics = async ({ userId, date }) => {
  const trackingDate = toISODate(date || new Date());
  const dailyGoal = await goalModel.getDailyStepGoal(userId);
  const row = await stepModel.getStepByDate({ userId, date: trackingDate });
  const steps = Number(row?.steps || 0);

  return {
    date: trackingDate,
    steps,
    distance: Number(row?.distance || 0),
    calories: Number(row?.calories || 0),
    dailyGoal,
    goalCompleted: steps >= dailyGoal,
    progressPercent: dailyGoal ? Math.min(100, Math.round((steps / dailyGoal) * 100)) : 0,
  };
};

const getWeeklyAnalytics = async ({ userId, startDate }) => {
  const range = getWeekRange(startDate || new Date());
  const rows = await stepModel.getStepsBetweenDates({ userId, ...range });

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    weeklyData: rows.map((row) => ({
      date: toISODate(row.date),
      steps: Number(row.steps),
      distance: Number(row.distance),
      calories: Number(row.calories),
    })),
    summary: summarizeRows(rows),
  };
};

const getMonthlyAnalytics = async ({ userId, month }) => {
  const range = getMonthRange(month);
  const rows = await stepModel.getStepsBetweenDates({ userId, ...range });

  return {
    month: month || toISODate().slice(0, 7),
    startDate: range.startDate,
    endDate: range.endDate,
    monthlyData: rows.map((row) => ({
      date: toISODate(row.date),
      steps: Number(row.steps),
      distance: Number(row.distance),
      calories: Number(row.calories),
    })),
    summary: summarizeRows(rows),
  };
};

const getCaloriesReport = async ({ userId, startDate, endDate }) => {
  const rows = await stepModel.getStepsBetweenDates({ userId, startDate, endDate });

  return {
    startDate,
    endDate,
    caloriesData: rows.map((row) => ({
      date: toISODate(row.date),
      calories: Number(row.calories),
      steps: Number(row.steps),
    })),
    totalCalories: Number(rows.reduce((total, row) => total + Number(row.calories || 0), 0).toFixed(2)),
  };
};

const getGoalProgress = async ({ userId, date }) => {
  const [daily, goals] = await Promise.all([
    getDailyAnalytics({ userId, date }),
    goalModel.getActiveGoals(userId),
  ]);

  return {
    daily,
    goals,
  };
};

const createGoal = async (payload) => goalModel.createGoal(payload);

const getActivityHistory = async ({ userId, page = 1, limit = 20 }) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const rows = await stepModel.getActivityHistory({ userId, limit: safeLimit, offset });

  return {
    page: safePage,
    limit: safeLimit,
    history: rows.map((row) => ({
      date: toISODate(row.date),
      steps: Number(row.steps),
      distance: Number(row.distance),
      calories: Number(row.calories),
      updatedAt: row.updated_at,
    })),
  };
};

module.exports = {
  updateSteps,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getCaloriesReport,
  getGoalProgress,
  createGoal,
  getActivityHistory,
};
