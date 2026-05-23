const { queueReminderNotifications } = require('../notifications/notification.service');

const buildDailyReminderJobs = async ({ userId = null, reminders = [] } = {}) => {
  return queueReminderNotifications({ userId, reminders });
};

module.exports = {
  buildDailyReminderJobs,
};
