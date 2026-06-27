const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // specific user, or null for role-broadcast
  recipientRole: { type: String }, // e.g. 'super_admin' — used when recipient is null (broadcast to a role)
  type: {
    type: String,
    enum: ['appointment', 'emergency', 'ambulance', 'medicine', 'inventory', 'billing', 'lab', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
