'use strict';
const router = require('express').Router();
const Hospital = require('../models/Hospital');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Public: list active hospitals (for login hospital selector)
router.get('/public', asyncHandler(async (req, res) => {
  const hospitals = await Hospital.find({ active: true }).select('name code type address.city settings.logo').sort('name');
  res.json({ success: true, data: hospitals });
}));

router.use(protect);

// GET all hospitals (super_admin only)
router.get('/', authorize('super_admin'), asyncHandler(async (req, res) => {
  const hospitals = await Hospital.find().populate('parentGroup', 'name code').sort('name');
  res.json({ success: true, count: hospitals.length, data: hospitals });
}));

// GET single
router.get('/:id', asyncHandler(async (req, res) => {
  const h = await Hospital.findById(req.params.id).populate('parentGroup', 'name code');
  if (!h) return res.status(404).json({ success: false, message: 'Hospital not found' });
  res.json({ success: true, data: h });
}));

// POST create
router.post('/', authorize('super_admin'), asyncHandler(async (req, res) => {
  const hospital = await Hospital.create(req.body);
  res.status(201).json({ success: true, data: hospital });
}));

// PUT update
router.put('/:id', authorize('super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
  res.json({ success: true, data: hospital });
}));

// POST seed demo hospitals (super_admin only, dev convenience)
router.post('/seed', authorize('super_admin'), asyncHandler(async (req, res) => {
  const demos = [
    { name: 'MedCare 360 Main Campus', code: 'MC360-MAIN', type: 'teaching', address: { city: 'Pune', state: 'Maharashtra' }, beds: { total: 500, icu: 50, emergency: 30 } },
    { name: 'MedCare 360 City Centre', code: 'MC360-CITY', type: 'general',  address: { city: 'Mumbai', state: 'Maharashtra' }, beds: { total: 200, icu: 20, emergency: 15 } },
    { name: 'MedCare 360 Specialty Clinic', code: 'MC360-SPEC', type: 'specialty', address: { city: 'Nashik', state: 'Maharashtra' }, beds: { total: 80, icu: 10, emergency: 5 } }
  ];
  const results = await Promise.all(demos.map(d => Hospital.findOneAndUpdate({ code: d.code }, d, { upsert: true, new: true })));
  res.json({ success: true, message: `${results.length} hospitals seeded`, data: results });
}));

module.exports = router;
