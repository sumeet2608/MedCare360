const mongoose = require('mongoose');

const soapNoteSchema = new mongoose.Schema({
  noteId:         { type: String, unique: true },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctor:         { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointment:    { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  medicalRecord:  { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  encounterDate:  { type: Date, default: Date.now },
  // SOAP Structure
  subjective: {
    chiefComplaint:   { type: String, required: true },
    hpi:              String, // History of Present Illness
    symptoms:         [String],
    duration:         String,
    severity:         { type: String, enum: ['mild', 'moderate', 'severe'] },
    associatedSymptoms: [String],
    pertinentHistory: String,
    medicationHistory: String,
    allergies:        [String]
  },
  objective: {
    vitals: {
      bp: String, hr: Number, temp: Number,
      rr: Number, spo2: Number, weight: Number, height: Number
    },
    physicalExam:     String,
    generalAppearance: String,
    systemsReview:    mongoose.Schema.Types.Mixed,
    labResults:       String,
    imagingFindings:  String
  },
  assessment: {
    primaryDiagnosis:   String,
    icd10Code:          String,
    icd10Description:   String,
    secondaryDiagnoses: [{ diagnosis: String, icd10Code: String }],
    differentials:      [String],
    clinicalReasoning:  String,
    prognosis:          String
  },
  plan: {
    medications:        [String],
    investigations:     [String],
    procedures:         [String],
    referrals:          [String],
    patientEducation:   String,
    followUp:           String,
    restrictions:       String,
    goals:              [String]
  },
  status:     { type: String, enum: ['draft', 'signed', 'addendum'], default: 'draft' },
  signedAt:   Date,
  signedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addenda:    [{ text: String, addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, addedAt: Date }],
  isConfidential: { type: Boolean, default: false },
  tags:       [String]
}, { timestamps: true });

soapNoteSchema.pre('save', async function (next) {
  if (!this.noteId) {
    const count = await mongoose.model('SOAPNote').countDocuments();
    this.noteId = `SN${new Date().getFullYear()}${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

soapNoteSchema.index({ patient: 1, encounterDate: -1 });

module.exports = mongoose.model('SOAPNote', soapNoteSchema);
