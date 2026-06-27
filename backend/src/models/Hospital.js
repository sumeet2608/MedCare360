'use strict';
const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:        { type: String, enum: ['general', 'specialty', 'teaching', 'clinic', 'diagnostic'], default: 'general' },
  address: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' }
  },
  contact: { phone: String, email: String, website: String },
  beds:        { total: { type: Number, default: 0 }, icu: { type: Number, default: 0 }, emergency: { type: Number, default: 0 } },
  departments: [{ name: String, head: String, extension: String }],
  accreditation: { body: String, number: String, validUntil: Date },
  settings: {
    timezone:   { type: String, default: 'Asia/Kolkata' },
    currency:   { type: String, default: 'INR' },
    logo:       String,
    primaryColor: { type: String, default: '#0891b2' }
  },
  active: { type: Boolean, default: true },
  parentGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

hospitalSchema.index({ code: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
