const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  testId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  testName: { type: String, required: true },
  testCode: String,
  category: { type: String, enum: ['hematology', 'biochemistry', 'microbiology', 'radiology', 'pathology', 'cardiology', 'urology', 'immunology', 'other'], required: true },
  status: { type: String, enum: ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'], default: 'ordered' },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  sampleType: String,
  sampleCollectedAt: Date,
  sampleCollectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  results: [{
    parameter: String,
    value: String,
    unit: String,
    referenceRange: String,
    status: { type: String, enum: ['normal', 'low', 'high', 'critical'] }
  }],
  interpretation: String,
  reportFile: String,
  reportUploadedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  price: Number,
  isPaid: { type: Boolean, default: false },
  notes: String
}, { timestamps: true });

labTestSchema.pre('save', async function (next) {
  if (!this.testId) {
    const count = await mongoose.model('LabTest').countDocuments();
    this.testId = `LAB${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('LabTest', labTestSchema);
