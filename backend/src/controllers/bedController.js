'use strict';
const Bed = require('../models/Bed');

exports.getBeds = async (req, res) => {
  const { ward, status, floor, type } = req.query;
  const filter = {};
  if (ward) filter.ward = ward;
  if (status) filter.status = status;
  if (floor) filter.floor = parseInt(floor);
  if (type) filter.type = type;

  const beds = await Bed.find(filter)
    .populate('patient', 'firstName lastName patientId')
    .populate('assignedDoctor', 'firstName lastName specialization')
    .sort({ ward: 1, bedNumber: 1 });

  const summary = await Bed.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.json({ success: true, data: beds, summary });
};

exports.createBed = async (req, res) => {
  const bed = await Bed.create(req.body);
  res.status(201).json({ success: true, data: bed });
};

exports.updateBedStatus = async (req, res) => {
  const { status, patientId, admittedAt, dischargeAt, assignedDoctor } = req.body;
  const bed = await Bed.findByIdAndUpdate(
    req.params.id,
    { status, patient: patientId, admittedAt, dischargeAt, assignedDoctor },
    { new: true, runValidators: true }
  ).populate('patient', 'firstName lastName');

  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  res.json({ success: true, data: bed });
};

exports.getOccupancyStats = async (req, res) => {
  const stats = await Bed.aggregate([
    { $group: { _id: { ward: '$ward', status: '$status' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.ward', statuses: { $push: { status: '$_id.status', count: '$count' } } } }
  ]);
  res.json({ success: true, data: stats });
};

exports.dischargePatient = async (req, res) => {
  const bed = await Bed.findByIdAndUpdate(
    req.params.id,
    { status: 'cleaning', patient: null, dischargeAt: new Date(), assignedDoctor: null },
    { new: true }
  );
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  res.json({ success: true, data: bed, message: 'Patient discharged, bed marked for cleaning' });
};
