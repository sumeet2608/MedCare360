'use strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { body, query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
client.collectDefaultMetrics({ prefix: 'doctor_service_' });
const httpDuration = new client.Histogram({
  name: 'doctor_service_http_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status']
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: t => Math.min(t * 50, 2000)
});

const kafka = new Kafka({ clientId: 'doctor-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();

// ── Doctor Schema ──────────────────────────────────────────
const doctorSchema = new mongoose.Schema({
  doctorId:       { type: String, unique: true, required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName:      { type: String, required: true, trim: true },
  lastName:       { type: String, required: true, trim: true },
  specialization: { type: String, required: true },
  subSpecialties: [String],
  qualifications: [{ degree: String, institution: String, year: Number }],
  experience:     { type: Number, default: 0 },
  registrationNumber: { type: String, unique: true, required: true },
  department:     { type: String, required: true },
  contact: { phone: String, email: String },
  availability: [{
    day:       { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
    startTime: String,
    endTime:   String,
    maxSlots:  { type: Number, default: 20 }
  }],
  consultationFee: { type: Number, default: 500 },
  rating:          { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:    { type: Number, default: 0 },
  profileImage:    String,
  bio:             String,
  isActive:        { type: Boolean, default: true },
  isOnLeave:       { type: Boolean, default: false },
  leaveUntil:      Date
}, { timestamps: true });

doctorSchema.index({ specialization: 1, isActive: 1 });
doctorSchema.index({ department: 1 });
doctorSchema.index({ lastName: 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);

app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json());
app.use(compression());
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode }));
  next();
});

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// GET /api/doctors
app.get('/api/doctors', protect, async (req, res) => {
  try {
    const { specialization, department, page = 1, limit = 20, search } = req.query;
    const filter = { isActive: true };
    if (specialization) filter.specialization = new RegExp(specialization, 'i');
    if (department) filter.department = new RegExp(department, 'i');
    if (search) filter.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') }
    ];
    const cacheKey = `doctors:${JSON.stringify(filter)}:${page}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const [doctors, total] = await Promise.all([
      Doctor.find(filter).select('-userId').skip((parseInt(page)-1)*parseInt(limit)).limit(parseInt(limit)).lean(),
      Doctor.countDocuments(filter)
    ]);
    const response = { success: true, data: doctors, pagination: { page: parseInt(page), limit: parseInt(limit), total } };
    await redis.setex(cacheKey, 60, JSON.stringify(response));
    res.json(response);
  } catch (err) {
    logger.error('Get doctors error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/doctors
app.post('/api/doctors', protect, [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('specialization').trim().notEmpty(),
  body('registrationNumber').trim().notEmpty(),
  body('department').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const doctorId = `DR${Date.now().toString(36).toUpperCase()}`;
    const doctor = await Doctor.create({ ...req.body, doctorId });
    await redis.del('doctors:*');
    res.status(201).json({ success: true, data: doctor });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Registration number already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctors/:id
app.get('/api/doctors/:id', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ $or: [{ doctorId: req.params.id }, { _id: req.params.id }] });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctors/:id/availability — check slot availability
app.get('/api/doctors/:id/availability', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const doctor = await Doctor.findOne({ $or: [{ doctorId: req.params.id }, { _id: req.params.id }] }).select('availability isOnLeave leaveUntil firstName lastName');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    if (doctor.isOnLeave && (!doctor.leaveUntil || new Date(date) <= doctor.leaveUntil)) {
      return res.json({ success: true, available: false, reason: 'Doctor on leave' });
    }
    res.json({ success: true, available: true, data: doctor.availability });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'doctor-service', version: '1.0.0',
  mongodb: mongoose.connection.readyState === 1 ? 'ok' : 'error'
}));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3003;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_doctors');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  app.listen(PORT, () => logger.info(`Doctor Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
