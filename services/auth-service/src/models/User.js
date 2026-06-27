'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:        { type: String, required: true, trim: true },
  lastName:         { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true },
  password:         { type: String, required: true, select: false, minlength: 8 },
  role:             { type: String, enum: ['super_admin','hospital_admin','doctor','nurse','receptionist','pharmacist','lab_technician','ambulance_staff','patient'], default: 'patient' },
  phone:            { type: String },
  isActive:         { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  totpSecret:       { type: String, select: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin:        Date,
  loginAttempts:    { type: Number, default: 0 },
  lockUntil:        Date,
  profileImage:     String,
  department:       String,
  permissions:      [String]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
