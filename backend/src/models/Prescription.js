const mongoose = require('mongoose');

const medicationItemSchema = new mongoose.Schema({
  medicineName:     { type: String, required: true },
  genericName:      String,
  strength:         String,
  dosageForm:       { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'patch', 'suppository', 'other'] },
  dose:             String,
  frequency:        String,
  route:            { type: String, enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'sublingual', 'rectal', 'other'], default: 'oral' },
  duration:         String,
  quantity:         Number,
  refills:          { type: Number, default: 0 },
  instructions:     String,
  startDate:        Date,
  endDate:          Date,
  isActive:         { type: Boolean, default: true },
  interactions:     [String],
  contraindications:[String]
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, unique: true },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctor:         { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointment:    { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  medicalRecord:  { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  medications:    { type: [medicationItemSchema], required: true },
  diagnosis:      String,
  icd10Code:      String,
  clinicalNotes:  String,
  allergyCheck:   { checked: { type: Boolean, default: false }, clearances: [String] },
  interactionCheck: { checked: { type: Boolean, default: false }, flags: [String] },
  status:         { type: String, enum: ['draft', 'active', 'dispensed', 'cancelled', 'expired'], default: 'active' },
  validUntil:     { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
  dispensedAt:    Date,
  dispensedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pharmacyNotes:  String,
  digitalSignature: String,
  qrCode:         String
}, { timestamps: true });

prescriptionSchema.pre('save', async function (next) {
  if (!this.prescriptionId) {
    const count = await mongoose.model('Prescription').countDocuments();
    this.prescriptionId = `RX${new Date().getFullYear()}${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
