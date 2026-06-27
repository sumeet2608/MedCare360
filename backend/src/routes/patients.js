const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllPatients, getPatientById, createPatient,
  updatePatient, addVitals, addAllergy,
  admitPatient, dischargePatient, deletePatient
} = require('../controllers/patientController');

router.use(protect);
router.get('/', authorize('super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist'), getAllPatients);
router.get('/:id', getPatientById);
router.post('/', authorize('super_admin', 'hospital_admin', 'receptionist'), createPatient);
router.put('/:id', authorize('super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist'), updatePatient);
router.post('/:id/vitals', authorize('doctor', 'nurse'), addVitals);
router.post('/:id/allergies', authorize('doctor', 'nurse'), addAllergy);
router.put('/:id/admit', authorize('super_admin', 'hospital_admin', 'doctor', 'receptionist'), admitPatient);
router.put('/:id/discharge', authorize('super_admin', 'hospital_admin', 'doctor'), dischargePatient);
router.delete('/:id', authorize('super_admin', 'hospital_admin'), deletePatient);

module.exports = router;
