const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats, getRevenueChart, getAppointmentStats, getPatientDemographics,
  getBedOccupancy, getMedicineStockAnalytics, getInventoryTrends, getAmbulanceAnalytics, getDepartmentPerformance
} = require('../controllers/analyticsController');

router.use(protect, authorize('super_admin', 'hospital_admin', 'doctor'));
router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueChart);
router.get('/appointments', getAppointmentStats);
router.get('/patients/demographics', getPatientDemographics);
router.get('/beds/occupancy', getBedOccupancy);
router.get('/medicines/stock', getMedicineStockAnalytics);
router.get('/inventory/trends', getInventoryTrends);
router.get('/ambulances', getAmbulanceAnalytics);
router.get('/departments/performance', getDepartmentPerformance);

module.exports = router;
