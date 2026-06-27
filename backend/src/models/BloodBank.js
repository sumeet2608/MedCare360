'use strict';
const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  age:         { type: Number, required: true },
  bloodGroup:  { type: String, required: true, enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'] },
  phone:       { type: String, required: true },
  email:       String,
  lastDonated: Date,
  nextEligible: Date,
  totalDonations: { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

const bloodUnitSchema = new mongoose.Schema({
  bloodGroup:    { type: String, required: true, enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'] },
  units:         { type: Number, default: 0, min: 0 },
  expiryDate:    Date,
  donorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  status:        { type: String, enum: ['available','reserved','used','expired'], default: 'available' },
  collectedDate: { type: Date, default: Date.now }
}, { timestamps: true });

const bloodRequestSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  bloodGroup:  { type: String, required: true },
  units:       { type: Number, required: true },
  urgency:     { type: String, enum: ['routine','urgent','emergency'], default: 'routine' },
  status:      { type: String, enum: ['pending','approved','fulfilled','cancelled'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:       String
}, { timestamps: true });

exports.Donor = mongoose.model('Donor', donorSchema);
exports.BloodUnit = mongoose.model('BloodUnit', bloodUnitSchema);
exports.BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
