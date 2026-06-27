'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/bloodBankController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/inventory',            ctrl.getInventory);
router.get('/donors',               authorize('super_admin','hospital_admin','nurse','lab_technician'), ctrl.getDonors);
router.post('/donors',              authorize('super_admin','hospital_admin','nurse'), ctrl.registerDonor);
router.post('/units',               authorize('super_admin','hospital_admin','nurse','lab_technician'), ctrl.addBloodUnits);
router.post('/requests',            ctrl.requestBlood);
router.get('/requests',             authorize('super_admin','hospital_admin','doctor','nurse'), ctrl.getRequests);
router.patch('/requests/:id/approve', authorize('super_admin','hospital_admin'), ctrl.approveRequest);

module.exports = router;
