const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllAmbulances, getAmbulanceById, createAmbulance, updateAmbulance,
  dispatchAmbulance, completeDispatch, updateLocation, getAvailableAmbulances,
  deleteAmbulance
} = require('../controllers/ambulanceController');

router.use(protect);
router.get('/', getAllAmbulances);
router.get('/available', getAvailableAmbulances);
router.get('/:id', getAmbulanceById);
router.post('/', authorize('super_admin', 'hospital_admin'), createAmbulance);
router.put('/:id', authorize('super_admin', 'hospital_admin'), updateAmbulance);
router.patch('/:id/dispatch', authorize('super_admin', 'hospital_admin', 'receptionist'), dispatchAmbulance);
router.patch('/:id/complete', authorize('super_admin', 'hospital_admin', 'ambulance_staff'), completeDispatch);
router.patch('/:id/location', authorize('ambulance_staff'), updateLocation);
router.delete('/:id', authorize('super_admin', 'hospital_admin'), deleteAmbulance);

module.exports = router;
