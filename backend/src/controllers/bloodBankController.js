'use strict';
const { Donor, BloodUnit, BloodRequest } = require('../models/BloodBank');

exports.getInventory = async (req, res) => {
  const inventory = await BloodUnit.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: '$bloodGroup', units: { $sum: '$units' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, data: inventory });
};

exports.getDonors = async (req, res) => {
  const { bloodGroup, page = 1, limit = 20 } = req.query;
  const filter = bloodGroup ? { bloodGroup } : {};
  const donors = await Donor.find(filter).skip((page - 1) * limit).limit(parseInt(limit));
  const total = await Donor.countDocuments(filter);
  res.json({ success: true, data: donors, total });
};

exports.registerDonor = async (req, res) => {
  const donor = await Donor.create(req.body);
  res.status(201).json({ success: true, data: donor });
};

exports.addBloodUnits = async (req, res) => {
  const { bloodGroup, units, donorId, expiryDate } = req.body;
  const unit = await BloodUnit.create({ bloodGroup, units, donorId, expiryDate, collectedDate: new Date() });
  if (donorId) {
    await Donor.findByIdAndUpdate(donorId, {
      lastDonated: new Date(),
      nextEligible: new Date(Date.now() + 90 * 24 * 3600 * 1000), // 90 days
      $inc: { totalDonations: 1 }
    });
  }
  res.status(201).json({ success: true, data: unit });
};

exports.requestBlood = async (req, res) => {
  const request = await BloodRequest.create({ ...req.body, requestedBy: req.user._id });
  res.status(201).json({ success: true, data: request });
};

exports.approveRequest = async (req, res) => {
  const request = await BloodRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', approvedBy: req.user._id },
    { new: true }
  );
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  res.json({ success: true, data: request });
};

exports.getRequests = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const requests = await BloodRequest.find(filter)
    .populate('patientId', 'firstName lastName')
    .populate('requestedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: requests });
};
