const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  recordedAt: { type: Date, default: Date.now },
  bloodPressure: { systolic: Number, diastolic: Number },
  heartRate: Number, temperature: Number, respiratoryRate: Number,
  oxygenSaturation: Number, weight: Number, height: Number, bmi: Number,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const diagnosisSchema = new mongoose.Schema({
  icd10Code: { type: String, trim: true },
  icd10Description: { type: String, trim: true },
  diagnosisType: { type: String, enum: ['primary', 'secondary', 'differential', 'ruled-out'], default: 'primary' },
  onset: String,
  notes: String
}, { _id: false });

const procedureSchema = new mongoose.Schema({
  code: String, name: String, performedAt: Date,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { _id: false });

const medicalRecordSchema = new mongoose.Schema({
  recordId:       { type: String, unique: true },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  encounter: {
    type:         { type: String, enum: ['outpatient', 'inpatient', 'emergency', 'telemedicine', 'procedure', 'follow-up'], default: 'outpatient' },
    date:         { type: Date, default: Date.now },
    department:   String,
    facility:     String
  },
  attendingDoctor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  appointment:        { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  chiefComplaint:     String,
  historyOfPresentIllness: String,
  pastMedicalHistory: [String],
  familyHistory:      [String],
  socialHistory:      String,
  reviewOfSystems:    mongoose.Schema.Types.Mixed,
  vitals:             [vitalSchema],
  physicalExamination: String,
  diagnoses:          [diagnosisSchema],
  procedures:         [procedureSchema],
  labOrders:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabTest' }],
  imagingOrders:      [String],
  treatmentPlan:      String,
  followUpInstructions: String,
  followUpDate:       Date,
  disposition:        { type: String, enum: ['discharged', 'admitted', 'transferred', 'referred', 'deceased', 'follow-up'] },
  status:             { type: String, enum: ['draft', 'final', 'amended', 'addendum'], default: 'draft' },
  tags:               [String],
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

medicalRecordSchema.pre('save', async function (next) {
  if (!this.recordId) {
    const count = await mongoose.model('MedicalRecord').countDocuments();
    this.recordId = `MR${new Date().getFullYear()}${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

medicalRecordSchema.index({ patient: 1, 'encounter.date': -1 });
medicalRecordSchema.index({ 'diagnoses.icd10Code': 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
