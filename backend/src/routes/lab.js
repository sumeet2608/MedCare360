const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const LabTest = require('../models/LabTest');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.patient) query.patient = req.query.patient;

  const [tests, total] = await Promise.all([
    LabTest.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    LabTest.countDocuments(query)
  ]);
  res.json({ success: true, count: tests.length, total, data: tests });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const test = await LabTest.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } });
  if (!test) return res.status(404).json({ success: false, message: 'Lab test not found' });
  res.json({ success: true, data: test });
}));

router.post('/', authorize('super_admin', 'hospital_admin', 'doctor', 'lab_technician'), asyncHandler(async (req, res) => {
  const test = await LabTest.create(req.body);
  res.status(201).json({ success: true, data: test });
}));

router.put('/:id', authorize('super_admin', 'hospital_admin', 'doctor', 'lab_technician'), asyncHandler(async (req, res) => {
  const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } });
  if (!test) return res.status(404).json({ success: false, message: 'Lab test not found' });

  if (req.body.status === 'completed') {
    try {
      await notify(req.app, {
        recipient: test.patient?.user?._id,
        type: 'lab',
        title: 'Lab result ready',
        message: `Your ${test.testName} report is now available`,
        relatedId: test._id
      });
    } catch (e) { /* non-blocking */ }
  }

  res.json({ success: true, data: test });
}));

router.patch('/:id/results', authorize('lab_technician', 'doctor'), asyncHandler(async (req, res) => {
  const test = await LabTest.findByIdAndUpdate(
    req.params.id,
    { results: req.body.results, interpretation: req.body.interpretation, status: 'completed', completedAt: new Date(), processedBy: req.user._id },
    { new: true }
  );
  if (!test) return res.status(404).json({ success: false, message: 'Lab test not found' });
  res.json({ success: true, data: test });
}));

module.exports = router;
