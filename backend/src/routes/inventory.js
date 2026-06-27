const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.category) query.category = req.query.category;
  if (req.query.lowStock === 'true') query['$expr'] = { $lte: ['$quantity', '$minStockLevel'] };

  const items = await Inventory.find(query).sort({ name: 1 });
  res.json({ success: true, count: items.length, data: items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });
  res.json({ success: true, data: item });
}));

router.post('/', authorize('super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const item = await Inventory.create({ ...req.body, addedBy: req.user._id });
  res.status(201).json({ success: true, data: item });
}));

router.put('/:id', authorize('super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
}));

router.delete('/:id', authorize('super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Item deleted' });
}));

module.exports = router;
