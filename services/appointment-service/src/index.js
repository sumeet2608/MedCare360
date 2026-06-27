'use strict';
require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const { Server: SocketServer } = require('socket.io');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
client.collectDefaultMetrics({ prefix: 'appointment_service_' });

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: t => Math.min(t * 50, 2000)
});

// Socket.io for queue updates
const io = new SocketServer(server, {
  cors: { origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }
});
io.on('connection', socket => {
  socket.on('join-queue', deptId => socket.join(`queue:${deptId}`));
  socket.on('join-room', userId => socket.join(`user:${userId}`));
});

const kafka = new Kafka({ clientId: 'appointment-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();

// ── Schema ─────────────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema({
  appointmentId:  { type: String, unique: true, required: true },
  patientId:      { type: String, required: true },
  patientName:    String,
  doctorId:       { type: String, required: true },
  doctorName:     String,
  department:     { type: String, required: true },
  appointmentDate:{ type: Date, required: true },
  timeSlot:       { type: String, required: true },
  type:           { type: String, enum: ['in-person', 'telemedicine', 'emergency', 'follow-up'], default: 'in-person' },
  status:         { type: String, enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
  priority:       { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
  symptoms:       [String],
  notes:          String,
  prescription:   String,
  diagnosis:      String,
  followUpDate:   Date,
  queueNumber:    Number,
  cancelReason:   String,
  fee:            { type: Number, default: 0 },
  isPaid:         { type: Boolean, default: false }
}, { timestamps: true });

appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ department: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json());
app.use(compression());
app.set('io', io);

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

// GET /api/appointments
app.get('/api/appointments', protect, async (req, res) => {
  try {
    const { patientId, doctorId, department, status, date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.appointmentDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort({ appointmentDate: 1 }).skip((parseInt(page)-1)*parseInt(limit)).limit(parseInt(limit)).lean(),
      Appointment.countDocuments(filter)
    ]);
    res.json({ success: true, data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error('Get appointments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/appointments
app.post('/api/appointments', protect, [
  body('patientId').notEmpty(),
  body('doctorId').notEmpty(),
  body('department').notEmpty(),
  body('appointmentDate').isISO8601(),
  body('timeSlot').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    // Check for scheduling conflict
    const conflict = await Appointment.findOne({
      doctorId: req.body.doctorId,
      appointmentDate: new Date(req.body.appointmentDate),
      timeSlot: req.body.timeSlot,
      status: { $in: ['scheduled', 'confirmed'] }
    });
    if (conflict) return res.status(409).json({ success: false, message: 'Time slot already booked' });

    const queueCount = await Appointment.countDocuments({
      department: req.body.department,
      appointmentDate: { $gte: new Date(new Date(req.body.appointmentDate).setHours(0,0,0,0)) },
      status: { $in: ['scheduled', 'confirmed'] }
    });
    const appointmentId = `APT${Date.now().toString(36).toUpperCase()}`;
    const appointment = await Appointment.create({ ...req.body, appointmentId, queueNumber: queueCount + 1 });

    // Emit queue update via Socket.io
    io.to(`queue:${req.body.department}`).emit('queue-update', {
      department: req.body.department, queueNumber: queueCount + 1, appointmentId
    });

    // Kafka event
    try {
      await producer.send({
        topic: 'appointment.events',
        messages: [{ value: JSON.stringify({ type: 'appointment.created', appointment }) }]
      });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    logger.error('Create appointment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/appointments/:id/status
app.patch('/api/appointments/:id/status', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { $or: [{ appointmentId: req.params.id }, { _id: req.params.id }] },
      { $set: { status: req.body.status, ...req.body } },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    io.to(`user:${appointment.patientId}`).emit('appointment-update', { appointmentId: appointment.appointmentId, status: appointment.status });
    try {
      await producer.send({ topic: 'appointment.events', messages: [{ value: JSON.stringify({ type: `appointment.${req.body.status}`, appointment }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/queue/:department
app.get('/api/appointments/queue/:department', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const queue = await Appointment.find({
      department: req.params.department,
      appointmentDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    }).sort({ queueNumber: 1 }).lean();
    res.json({ success: true, data: queue, count: queue.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'appointment-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3004;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_appointments');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  server.listen(PORT, () => logger.info(`Appointment Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  await mongoose.disconnect();
  server.close(() => process.exit(0));
});
