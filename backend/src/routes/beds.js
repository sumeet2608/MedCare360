'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/bedController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/',            ctrl.getBeds);
router.post('/',           authorize('super_admin','hospital_admin'), ctrl.createBed);
router.patch('/:id/status', authorize('super_admin','hospital_admin','nurse','receptionist'), ctrl.updateBedStatus);
router.patch('/:id/discharge', authorize('super_admin','hospital_admin','nurse','doctor'), ctrl.dischargePatient);
router.get('/stats',       ctrl.getOccupancyStats);

module.exports = router;
