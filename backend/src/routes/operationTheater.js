'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/otController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/rooms',          ctrl.getRooms);
router.post('/rooms',         authorize('super_admin','hospital_admin'), ctrl.createRoom);
router.get('/bookings',       ctrl.getBookings);
router.post('/bookings',      authorize('super_admin','hospital_admin','doctor'), ctrl.createBooking);
router.patch('/bookings/:id', authorize('super_admin','hospital_admin','doctor'), ctrl.updateBooking);
router.get('/today',          ctrl.getTodaySchedule);

module.exports = router;
