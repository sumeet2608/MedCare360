const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect, authorize('super_admin', 'hospital_admin'));

router.get('/', asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.department) query.department = req.query.department;
  if (req.query.status) query.status = req.query.status;

  const staff = await Staff.find(query)
    .populate('user', 'firstName lastName email phone avatar role')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: staff.length, data: staff });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const member = await Staff.findById(req.params.id)
    .populate('user', 'firstName lastName email phone avatar role');
  if (!member) return res.status(404).json({ success: false, message: 'Staff member not found' });
  res.json({ success: true, data: member });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, role, ...staffData } = req.body;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName, lastName, email, phone,
      password: password || `Staff@${Date.now()}`,
      role: role || 'nurse'
    });
  }

  const member = await Staff.create({ ...staffData, user: user._id });
  await member.populate('user', 'firstName lastName email phone role');
  res.status(201).json({ success: true, data: member });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const member = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('user', 'firstName lastName email phone role');
  if (!member) return res.status(404).json({ success: false, message: 'Staff member not found' });
  res.json({ success: true, data: member });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Staff member removed' });
}));

module.exports = router;
