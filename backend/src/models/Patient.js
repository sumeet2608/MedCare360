const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema({
  allergen: { type: String, required: true },
  reaction: String,
  severity: { type: String, enum: ['mild', 'moderate', 'severe'] }
});

const vitalSchema = new mongoose.Schema({
  bloodPressure: String,
  heartRate: Number,
  temperature: Number,
  weight: Number,
  height: Number,
  oxygenSaturation: Number,
  bloodSugar: Number,
  recordedAt: { type: Date, default: Date.now },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expiryDate: Date
  },
  allergies: [allergySchema],
  chronicConditions: [String],
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date
  }],
  vitals: [vitalSchema],
  isAdmitted: { type: Boolean, default: false },
  admissionDate: Date,
  dischargeDate: Date,
  ward: String,
  bedNumber: String,
  attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Admin archive — patient fully discharged, cleared from active lists
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archiveReason: String
}, { timestamps: true });

patientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    const count = await mongoose.model('Patient').countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
