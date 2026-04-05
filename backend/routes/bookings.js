const express = require('express');
const { createBooking, getUserBookings, getAllActiveBookings, cancelBooking } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, createBooking);
router.get('/my', authMiddleware, getUserBookings);
router.get('/active', authMiddleware, getAllActiveBookings);
router.put('/:id/cancel', authMiddleware, cancelBooking);

module.exports = router;