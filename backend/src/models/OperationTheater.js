'use strict';
const mongoose = require('mongoose');

const otBookingSchema = new mongoose.Schema({
  otRoom:      { type: String, required: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  surgeon:     { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  anesthesiologist: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  assistants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  procedureName: { type: String, required: true },
  procedureType: { type: String, enum: ['elective','emergency','semi-emergency'], default: 'elective' },
  scheduledDate: { type: Date, required: true },
  startTime:   String,
  estimatedDuration: { type: Number, default: 60 }, // minutes
  actualStartTime: Date,
  actualEndTime: Date,
  status:      { type: String, enum: ['scheduled','in-progress','completed','cancelled','postponed'], default: 'scheduled' },
  anesthesiaType: { type: String, enum: ['general','local','regional','spinal','epidural'] },
  preOpNotes:  String,
  postOpNotes: String,
  complications: String,
  bloodLoss:   String,
  implants:    [String],
  diagnosis:   String
}, { timestamps: true });

const otRoomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  name:       String,
  type:       { type: String, enum: ['major','minor','emergency','hybrid'], default: 'major' },
  status:     { type: String, enum: ['available','in-use','cleaning','maintenance'], default: 'available' },
  equipment:  [String],
  capacity:   { type: Number, default: 1 }
}, { timestamps: true });

exports.OTBooking = mongoose.model('OTBooking', otBookingSchema);
exports.OTRoom = mongoose.model('OTRoom', otRoomSchema);
