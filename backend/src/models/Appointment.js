const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  type: { type: String, enum: ['consultation', 'follow_up', 'emergency', 'routine', 'specialist'], default: 'consultation' },
  status: { type: String, enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  symptoms: [String],
  reason: String,
  notes: String,
  diagnosis: String,
  prescription: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
  followUpDate: Date,
  duration: { type: Number, default: 30 },
  queueNumber: Number,
  consultationFee: Number,
  isPaid: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

appointmentSchema.pre('save', async function (next) {
  if (!this.appointmentId) {
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentId = `APT${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
