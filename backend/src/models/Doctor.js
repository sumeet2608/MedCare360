const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  startTime: String,
  endTime: String,
  maxPatients: { type: Number, default: 20 },
  isAvailable: { type: Boolean, default: true }
});

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  subSpecialization: String,
  photo: { type: String, default: '' },
  qualification: [String],
  licenseNumber: { type: String, required: true, unique: true },
  experience: { type: Number, default: 0 },
  department: String,
  consultationFee: { type: Number, default: 0 },
  schedule: [scheduleSlotSchema],
  bio: String,
  languages: [String],
  awards: [String],
  publications: [String],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  isAvailableForEmergency: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'on_leave', 'inactive'], default: 'active' },
  assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }]
}, { timestamps: true });

doctorSchema.pre('save', async function (next) {
  if (!this.doctorId) {
    const count = await mongoose.model('Doctor').countDocuments();
    this.doctorId = `DOC${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
