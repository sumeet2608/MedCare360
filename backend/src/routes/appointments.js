const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllAppointments, getAppointmentById, createAppointment,
  updateAppointment, cancelAppointment, getTodayAppointments
} = require('../controllers/appointmentController');

router.use(protect);
router.get('/', getAllAppointments);
router.get('/today', getTodayAppointments);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);
router.put('/:id', authorize('super_admin', 'hospital_admin', 'doctor', 'receptionist'), updateAppointment);
router.put('/:id/cancel', cancelAppointment);

module.exports = router;
