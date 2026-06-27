'use strict';
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const telemedicineSchema = new mongoose.Schema({
  sessionId:   { type: String, default: () => uuidv4(), unique: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  status:      { type: String, enum: ['scheduled','waiting','active','completed','cancelled','no-show'], default: 'scheduled' },
  scheduledAt: { type: Date, required: true },
  startedAt:   Date,
  endedAt:     Date,
  duration:    Number, // seconds
  roomUrl:     String, // Video room URL (e.g. Jitsi/WebRTC)
  type:        { type: String, enum: ['video','audio','chat'], default: 'video' },
  chiefComplaint: String,
  symptoms:    [String],
  vitals:      {
    bloodPressure: String,
    heartRate: Number,
    temperature: String,
    oxygenSaturation: Number,
    weight: Number
  },
  diagnosis:   String,
  prescription:[{
    medicine:  String,
    dosage:    String,
    frequency: String,
    duration:  String
  }],
  followUp:    Date,
  notes:       String,
  patientRating: { type: Number, min: 1, max: 5 },
  patientFeedback: String,
  recordingUrl: String,
  chatLog:     [{ sender: String, message: String, timestamp: Date }]
}, { timestamps: true });

telemedicineSchema.index({ patient: 1, scheduledAt: -1 });
telemedicineSchema.index({ doctor: 1, scheduledAt: -1 });
telemedicineSchema.index({ status: 1 });

module.exports = mongoose.model('Telemedicine', telemedicineSchema);
