const { query } = require('../config/database');

const upsertStepTracking = async ({ userId, date, steps, distance, calories }) => {
  const result = await query(
    `INSERT INTO step_tracking (user_id, tracking_date, total_steps, distance_km, calories)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, tracking_date)
     DO UPDATE SET
       total_steps = EXCLUDED.total_steps,
       distance_km = EXCLUDED.distance_km,
       calories = EXCLUDED.calories,
       updated_at = NOW()
     RETURNING *`,
    [userId, date, steps, distance, calories]
  );

  return result.rows[0];
};

const upsertDailyProgress = async ({ userId, date, steps, distance, calories, goalCompleted }) => {
  const result = await query(
    `INSERT INTO daily_progress (user_id, progress_date, total_steps, distance_km, calories, goal_completed)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, progress_date)
     DO UPDATE SET
       total_steps = EXCLUDED.total_steps,
       distance_km = EXCLUDED.distance_km,
       calories = EXCLUDED.calories,
       goal_completed = EXCLUDED.goal_completed,
       updated_at = NOW()
     RETURNING *`,
    [userId, date, steps, distance, calories, goalCompleted]
  );

  return result.rows[0];
};

const getStepByDate = async ({ userId, date }) => {
  const result = await query(
    `SELECT tracking_date AS date, total_steps AS steps, distance_km AS distance, calories
     FROM step_tracking
     WHERE user_id = $1 AND tracking_date = $2`,
    [userId, date]
  );

  return result.rows[0] || null;
};

const getStepsBetweenDates = async ({ userId, startDate, endDate }) => {
  const result = await query(
    `SELECT tracking_date AS date, total_steps AS steps, distance_km AS distance, calories
     FROM step_tracking
     WHERE user_id = $1 AND tracking_date BETWEEN $2 AND $3
     ORDER BY tracking_date ASC`,
    [userId, startDate, endDate]
  );

  return result.rows;
};

const getActivityHistory = async ({ userId, limit, offset }) => {
  const result = await query(
    `SELECT tracking_date AS date, total_steps AS steps, distance_km AS distance, calories, updated_at
     FROM step_tracking
     WHERE user_id = $1
     ORDER BY tracking_date DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
};

module.exports = {
  upsertStepTracking,
  upsertDailyProgress,
  getStepByDate,
  getStepsBetweenDates,
  getActivityHistory,
};
