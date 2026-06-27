const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  qualification: [String],
  employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'], default: 'full_time' },
  joinDate: { type: Date, required: true },
  salary: Number,
  shift: { type: String, enum: ['morning', 'afternoon', 'night', 'rotating'] },
  schedule: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  leaveBalance: {
    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 15 },
    earned: { type: Number, default: 21 }
  },
  status: { type: String, enum: ['active', 'on_leave', 'resigned', 'terminated'], default: 'active' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

staffSchema.pre('save', async function (next) {
  if (!this.staffId) {
    const count = await mongoose.model('Staff').countDocuments();
    this.staffId = `STF${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Staff', staffSchema);
