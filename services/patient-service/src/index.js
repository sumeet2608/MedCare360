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

// ── Prometheus ────────────────────────────────────────────────
client.collectDefaultMetrics({ prefix: 'patient_service_' });
const httpDuration = new client.Histogram({
  name: 'patient_service_http_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});

// ── Redis ─────────────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: t => Math.min(t * 50, 2000)
});

// ── Kafka Producer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'patient-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { initialRetryTime: 100, retries: 5 }
});
const producer = kafka.producer();

// ── Patient Schema ────────────────────────────────────────────
const patientSchema = new mongoose.Schema({
  patientId:    { type: String, unique: true, required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  dateOfBirth:  { type: Date, required: true },
  gender:       { type: String, enum: ['male', 'female', 'other'], required: true },
  bloodGroup:   { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
  contact: {
    phone:   String,
    email:   String,
    address: String,
    city:    String,
    state:   String,
    pincode: String
  },
  emergencyContact: {
    name:         String,
    relationship: String,
    phone:        String
  },
  medicalHistory: [{
    condition:    String,
    diagnosedAt:  Date,
    status:       { type: String, enum: ['active', 'resolved', 'chronic'] },
    notes:        String
  }],
  allergies:    [{ allergen: String, severity: String, reaction: String }],
  currentMedications: [{ name: String, dosage: String, frequency: String }],
  insurance: {
    provider:     String,
    policyNumber: String,
    expiryDate:   Date,
    coverageType: String
  },
  vitalsHistory: [{
    recordedAt:   { type: Date, default: Date.now },
    weight:       Number,
    height:       Number,
    bloodPressure:String,
    heartRate:    Number,
    temperature:  Number,
    oxygenSat:    Number,
    bloodSugar:   Number
  }],
  isActive:     { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ 'contact.phone': 1 });
patientSchema.index({ patientId: 1 });

const Patient = mongoose.model('Patient', patientSchema);

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(compression());

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode }));
  next();
});

// JWT auth middleware
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ success: false, message: 'Token revoked' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Routes ────────────────────────────────────────────────────

// GET /api/patients — list with pagination, search
app.get('/api/patients', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { patientId: new RegExp(search, 'i') },
        { 'contact.phone': new RegExp(search, 'i') }
      ];
    }
    const [patients, total] = await Promise.all([
      Patient.find(filter).select('-vitalsHistory -medicalHistory').skip((page - 1) * limit).limit(limit).lean(),
      Patient.countDocuments(filter)
    ]);
    res.json({ success: true, data: patients, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error('Get patients error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/patients — register new patient
app.post('/api/patients', protect, [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('dateOfBirth').isISO8601(),
  body('gender').isIn(['male', 'female', 'other'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const patientId = `P${Date.now().toString(36).toUpperCase()}`;
    const patient = await Patient.create({ ...req.body, patientId });
    try {
      await producer.send({
        topic: 'patient.events',
        messages: [{ value: JSON.stringify({ type: 'patient.registered', patientId: patient.patientId, userId: req.user.id }) }]
      });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    logger.error('Create patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patients/:id
app.get('/api/patients/:id', protect, async (req, res) => {
  try {
    const cacheKey = `patient:${req.params.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });
    const patient = await Patient.findOne({ $or: [{ patientId: req.params.id }, { _id: req.params.id }] });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    await redis.setex(cacheKey, 300, JSON.stringify(patient));
    res.json({ success: true, data: patient });
  } catch (err) {
    logger.error('Get patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/patients/:id
app.patch('/api/patients/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { $or: [{ patientId: req.params.id }, { _id: req.params.id }] },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    await redis.del(`patient:${req.params.id}`);
    res.json({ success: true, data: patient });
  } catch (err) {
    logger.error('Update patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/patients/:id/vitals — record vitals
app.post('/api/patients/:id/vitals', protect, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { $or: [{ patientId: req.params.id }, { _id: req.params.id }] },
      { $push: { vitalsHistory: { $each: [{ ...req.body, recordedAt: new Date() }], $slice: -100 } } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    await redis.del(`patient:${req.params.id}`);
    res.json({ success: true, message: 'Vitals recorded', data: patient.vitalsHistory.slice(-1)[0] });
  } catch (err) {
    logger.error('Record vitals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Health & Metrics ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'patient-service', version: '1.0.0',
  uptime: process.uptime(), mongodb: mongoose.connection.readyState === 1 ? 'ok' : 'error'
}));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ── Startup ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3002;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_patients');
  logger.info('MongoDB connected');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  app.listen(PORT, () => logger.info(`Patient Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
