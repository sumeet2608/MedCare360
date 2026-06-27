'use strict';
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action:    { type: String, required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  ip:        String,
  userAgent: String,
  details:   { type: mongoose.Schema.Types.Mixed, default: {} },
  resource:  String,
  resourceId: String,
  status:    { type: String, enum: ['success', 'failure'], default: 'success' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

// TTL index — keep audit logs for 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
