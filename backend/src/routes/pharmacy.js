const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllMedicines, getMedicineById, createMedicine, updateMedicine,
  updateStock, getLowStockMedicines, getExpiringMedicines, deleteMedicine,
  searchExternalDrugs, enrichMedicine, compareMedicines
} = require('../controllers/pharmacyController');

router.use(protect);
router.get('/', getAllMedicines);
router.get('/low-stock', authorize('super_admin', 'hospital_admin', 'pharmacist'), getLowStockMedicines);
router.get('/expiring', authorize('super_admin', 'hospital_admin', 'pharmacist'), getExpiringMedicines);
router.get('/search-external', searchExternalDrugs);
router.get('/compare', compareMedicines);
router.get('/:id', getMedicineById);
router.get('/:id/enrich', enrichMedicine);
router.post('/', authorize('super_admin', 'hospital_admin', 'pharmacist'), createMedicine);
router.put('/:id', authorize('super_admin', 'hospital_admin', 'pharmacist'), updateMedicine);
router.patch('/:id/stock', authorize('super_admin', 'hospital_admin', 'pharmacist'), updateStock);
router.delete('/:id', authorize('super_admin', 'hospital_admin', 'pharmacist'), deleteMedicine);

module.exports = router;
