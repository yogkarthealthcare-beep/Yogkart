const reminderService = require('../services/reminder.service');

const getDefaultReminders = async (req, res, next) => {
  try {
    const reminders = await reminderService.getDefaultReminders();

    return res.status(200).json({
      success: true,
      reminders,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDefaultReminders,
};
