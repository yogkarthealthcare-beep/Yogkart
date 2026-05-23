const { query } = require('../config/database');

const DEFAULT_DAILY_STEP_GOAL = 10000;

const getActiveGoals = async (userId) => {
  const result = await query(
    `SELECT id, user_id AS "userId", goal_type AS "goalType", target_value AS "targetValue",
            unit, start_date AS "startDate", end_date AS "endDate", is_active AS "isActive"
     FROM goals
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getDailyStepGoal = async (userId) => {
  const result = await query(
    `SELECT target_value
     FROM goals
     WHERE user_id = $1 AND goal_type = 'daily_steps' AND is_active = TRUE
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return Number(result.rows[0]?.target_value || DEFAULT_DAILY_STEP_GOAL);
};

const createGoal = async ({ userId, goalType, targetValue, unit, startDate, endDate }) => {
  const result = await query(
    `INSERT INTO goals (user_id, goal_type, target_value, unit, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id AS "userId", goal_type AS "goalType", target_value AS "targetValue",
               unit, start_date AS "startDate", end_date AS "endDate", is_active AS "isActive"`,
    [userId, goalType, targetValue, unit, startDate, endDate]
  );

  return result.rows[0];
};

module.exports = {
  DEFAULT_DAILY_STEP_GOAL,
  getActiveGoals,
  getDailyStepGoal,
  createGoal,
};
