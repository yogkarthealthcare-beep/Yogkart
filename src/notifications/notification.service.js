const createNotificationPayload = ({
  userId = null,
  channel = 'in_app',
  title,
  message,
  scheduledAt = null,
  metadata = {},
}) => ({
  userId,
  channel,
  title,
  message,
  scheduledAt,
  metadata,
  status: 'pending',
});

const queueReminderNotifications = async ({ userId = null, reminders = [] } = {}) => {
  return reminders.map((reminder) => createNotificationPayload({
    userId,
    title: 'Health Reminder',
    message: reminder.message,
    scheduledAt: reminder.time,
    metadata: {
      reminderType: reminder.type,
    },
  }));
};

module.exports = {
  createNotificationPayload,
  queueReminderNotifications,
};
