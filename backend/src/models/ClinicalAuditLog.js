const mongoose = require('mongoose');

const clinicalAuditLogSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userRole:    String,
  action:      { type: String, enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'SHARE', 'PRESCRIBE', 'SIGN'], required: true },
  resourceType:{ type: String, enum: ['Patient', 'MedicalRecord', 'Prescription', 'SOAPNote', 'LabTest', 'Billing', 'Appointment', 'Doctor', 'User', 'System'], required: true },
  resourceId:  mongoose.Schema.Types.ObjectId,
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  description: { type: String, required: true },
  changes:     mongoose.Schema.Types.Mixed,
  ipAddress:   String,
  userAgent:   String,
  sessionId:   String,
  outcome:     { type: String, enum: ['success', 'failure', 'partial'], default: 'success' },
  errorMessage:String,
  metadata:    mongoose.Schema.Types.Mixed
}, { timestamps: true });

clinicalAuditLogSchema.index({ createdAt: -1 });
clinicalAuditLogSchema.index({ user: 1, createdAt: -1 });
clinicalAuditLogSchema.index({ patientId: 1, createdAt: -1 });
clinicalAuditLogSchema.index({ action: 1, resourceType: 1 });

// Static helper to create a log entry
clinicalAuditLogSchema.statics.log = function(data) {
  return this.create(data).catch(err => console.error('Audit log error:', err.message));
};

module.exports = mongoose.model('ClinicalAuditLog', clinicalAuditLogSchema);
