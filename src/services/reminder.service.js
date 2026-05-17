const {
  defaultReminderSchedule,
  reminderScheduleByDisease,
} = require('../data/reminders.data');

const generateReminders = async ({ possibleDiseases = [], includeDefaults = true } = {}) => {
  const primaryDisease = possibleDiseases[0]?.disease;
  const diseaseReminders = reminderScheduleByDisease[primaryDisease] || [];
  const reminders = diseaseReminders.length ? diseaseReminders : defaultReminderSchedule;

  if (!includeDefaults || diseaseReminders.length === 0) return reminders;

  const byTypeAndTime = new Map();
  [...diseaseReminders, ...defaultReminderSchedule].forEach((reminder) => {
    byTypeAndTime.set(`${reminder.type}:${reminder.time}`, reminder);
  });

  return Array.from(byTypeAndTime.values());
};

const getDefaultReminders = async () => defaultReminderSchedule;

module.exports = {
  generateReminders,
  getDefaultReminders,
};
