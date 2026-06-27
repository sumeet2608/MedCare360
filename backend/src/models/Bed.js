'use strict';
const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber:   { type: String, required: true, unique: true },
  ward:        { type: String, required: true },
  floor:       { type: Number, required: true },
  type:        { type: String, enum: ['general','icu','emergency','private','semi-private','ot','nicu','pediatric'], default: 'general' },
  status:      { type: String, enum: ['available','occupied','reserved','maintenance','cleaning'], default: 'available' },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  admittedAt:  Date,
  dischargeAt: Date,
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  assignedNurse:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dailyRate:   { type: Number, default: 0 },
  features:    [{ type: String }], // e.g. ['oxygen','cardiac-monitor','ventilator']
  notes:       String
}, { timestamps: true });

// Index for quick ward queries
bedSchema.index({ ward: 1, status: 1 });
bedSchema.index({ floor: 1, status: 1 });

module.exports = mongoose.model('Bed', bedSchema);
