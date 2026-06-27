const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllDoctors, getDoctorById, createDoctor, updateDoctor,
  getDoctorSchedule, updateSchedule, getDoctorAvailability, deleteDoctor,
  getPublicDoctorList, getDoctorStaff, assignStaff, removeStaff
} = require('../controllers/doctorController');

// Public — no auth required (used by login page doctor picker)
router.get('/public-list', getPublicDoctorList);

router.use(protect);
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/schedule', getDoctorSchedule);
router.get('/:id/availability', getDoctorAvailability);

// Staff assignment routes
router.get('/:id/staff',             getDoctorStaff);
router.post('/:id/staff',            authorize('super_admin', 'hospital_admin'), assignStaff);
router.delete('/:id/staff/:staffId', authorize('super_admin', 'hospital_admin'), removeStaff);

router.post('/',    authorize('super_admin', 'hospital_admin'), createDoctor);
router.put('/:id',  authorize('super_admin', 'hospital_admin', 'doctor'), updateDoctor);
router.put('/:id/schedule', authorize('super_admin', 'hospital_admin', 'doctor'), updateSchedule);
router.delete('/:id', authorize('super_admin', 'hospital_admin'), deleteDoctor);

module.exports = router;
