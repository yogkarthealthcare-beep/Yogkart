const notificationModel = require('../models/fitnessNotification.model');

const buildReminderMessages = ({ steps = 0, dailyGoal = 10000 } = {}) => {
  const reminders = [
    {
      type: 'water_intake',
      title: 'Water Reminder',
      message: 'Drink a glass of water.',
    },
    {
      type: 'walking',
      title: 'Walking Reminder',
      message: steps >= dailyGoal
        ? 'You completed your step goal. A short relaxed walk can still help recovery.'
        : `Complete your ${dailyGoal} step goal.`,
    },
  ];

  if (steps < 1000) {
    reminders.push({
      type: 'inactivity_alert',
      title: 'Inactivity Alert',
      message: `You only walked ${steps} steps today.`,
    });
  }

  return reminders;
};

const scheduleFitnessReminders = async ({ userId, steps, dailyGoal }) => {
  const reminders = buildReminderMessages({ steps, dailyGoal });

  return Promise.all(reminders.map((reminder) => notificationModel.createFitnessNotification({
    userId,
    type: reminder.type,
    title: reminder.title,
    message: reminder.message,
  })));
};

module.exports = {
  buildReminderMessages,
  scheduleFitnessReminders,
};
