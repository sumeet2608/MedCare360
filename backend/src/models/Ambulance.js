const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['basic', 'advanced', 'neonatal', 'air'], required: true },
  status: { type: String, enum: ['available', 'dispatched', 'maintenance', 'offline'], default: 'available' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  medicalStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  equipment: [String],
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: { type: Date, default: Date.now }
  },
  currentDispatch: {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    pickupAddress: String,
    destinationAddress: String,
    dispatchTime: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    completedAt: Date,
    emergency: String,
    notes: String
  },
  dispatchHistory: [{
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    dispatchTime: Date,
    completedAt: Date,
    pickupAddress: String,
    destinationAddress: String
  }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
