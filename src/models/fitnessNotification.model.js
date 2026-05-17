const { query } = require('../config/database');

const createFitnessNotification = async ({ userId, type, title, message, scheduledAt = null }) => {
  const result = await query(
    `INSERT INTO fitness_notifications (user_id, notification_type, title, message, scheduled_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id AS "userId", notification_type AS "type", title, message,
               status, scheduled_at AS "scheduledAt", created_at AS "createdAt"`,
    [userId, type, title, message, scheduledAt]
  );

  return result.rows[0];
};

const getFitnessNotifications = async ({ userId, limit = 20 }) => {
  const result = await query(
    `SELECT id, notification_type AS "type", title, message, status,
            scheduled_at AS "scheduledAt", created_at AS "createdAt"
     FROM fitness_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
};

module.exports = {
  createFitnessNotification,
  getFitnessNotifications,
};
