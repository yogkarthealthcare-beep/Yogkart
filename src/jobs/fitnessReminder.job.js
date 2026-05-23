const stepTrackingService = require('../services/stepTracking.service');
const fitnessReminderService = require('../services/fitnessReminder.service');

let cron = null;
try {
  cron = require('node-cron');
} catch (_) {
  cron = null;
}

const runInactivityCheckForUser = async ({ userId, date }) => {
  const progress = await stepTrackingService.getGoalProgress({ userId, date });

  return fitnessReminderService.scheduleFitnessReminders({
    userId,
    steps: progress.daily.steps,
    dailyGoal: progress.daily.dailyGoal,
  });
};

const registerFitnessReminderJobs = ({ usersProvider }) => {
  if (!cron) {
    return {
      registered: false,
      reason: 'node-cron is not installed. Install node-cron to enable scheduled reminder jobs.',
    };
  }

  cron.schedule('0 18 * * *', async () => {
    const users = await usersProvider();
    await Promise.all(users.map((user) => runInactivityCheckForUser({ userId: user.id })));
  });

  return {
    registered: true,
  };
};

module.exports = {
  runInactivityCheckForUser,
  registerFitnessReminderJobs,
};
