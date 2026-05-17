const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');

router.get('/reminders/defaults', reminderController.getDefaultReminders);

module.exports = router;
