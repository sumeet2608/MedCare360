const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllBillings, getBillingById, createBilling, updateBilling, recordPayment, getBillingStats
} = require('../controllers/billingController');

router.use(protect);
router.get('/stats', authorize('super_admin', 'hospital_admin'), getBillingStats);
router.get('/', getAllBillings);
router.get('/:id', getBillingById);
router.post('/', authorize('super_admin', 'hospital_admin', 'receptionist'), createBilling);
router.put('/:id', authorize('super_admin', 'hospital_admin', 'receptionist'), updateBilling);
router.patch('/:id/payment', authorize('super_admin', 'hospital_admin', 'receptionist'), recordPayment);

module.exports = router;
