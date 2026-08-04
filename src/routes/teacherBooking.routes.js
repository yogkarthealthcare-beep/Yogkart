const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/teacherBooking.controller');
const { protect } = require('../middleware/auth.middleware');

// Public slot availability check
router.get('/slots/:teacherId', bookingCtrl.getAvailableSlots);

// Protected booking actions
router.use(protect);
router.post('/', bookingCtrl.createBooking);
router.get('/my', bookingCtrl.getMyBookings);
router.post('/reviews', bookingCtrl.submitReview);

module.exports = router;
