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
client.collectDefaultMetrics({ prefix: 'ambulance_service_' });

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: t => Math.min(t * 50, 2000)
});

const io = new SocketServer(server, {
  cors: { origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }
});

const connectedDrivers = new Map();
io.on('connection', socket => {
  socket.on('driver-connect', ambulanceId => {
    connectedDrivers.set(ambulanceId, socket.id);
    socket.join(`ambulance:${ambulanceId}`);
  });
  socket.on('location-update', async ({ ambulanceId, lat, lng, speed }) => {
    const locationData = { ambulanceId, lat, lng, speed, updatedAt: new Date() };
    await redis.setex(`ambulance:location:${ambulanceId}`, 30, JSON.stringify(locationData));
    io.to(`tracking:${ambulanceId}`).emit('position', locationData);
  });
  socket.on('track-ambulance', ambulanceId => socket.join(`tracking:${ambulanceId}`));
});

const kafka = new Kafka({ clientId: 'ambulance-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();

// ── Schemas ────────────────────────────────────────────────────
const ambulanceSchema = new mongoose.Schema({
  ambulanceId:    { type: String, unique: true, required: true },
  vehicleNumber:  { type: String, unique: true, required: true },
  type:           { type: String, enum: ['basic', 'advanced', 'icu', 'neonatal', 'mortuary'], required: true },
  status:         { type: String, enum: ['available', 'dispatched', 'returning', 'maintenance', 'offline'], default: 'available' },
  driver: {
    name:    String,
    phone:   String,
    license: String
  },
  paramedics:    [{ name: String, phone: String }],
  equipment:     [String],
  currentLocation: { lat: Number, lng: Number, address: String },
  lastServiceDate: Date,
  isActive:      { type: Boolean, default: true }
}, { timestamps: true });

const dispatchSchema = new mongoose.Schema({
  dispatchId:     { type: String, unique: true, required: true },
  ambulanceId:    { type: String, required: true },
  patientName:    String,
  patientPhone:   String,
  pickupLocation: { lat: Number, lng: Number, address: { type: String, required: true } },
  dropLocation:   { lat: { type: Number }, lng: { type: Number }, address: String },
  priority:       { type: String, enum: ['normal', 'urgent', 'critical'], default: 'urgent' },
  status:         { type: String, enum: ['dispatched', 'en-route', 'arrived', 'transporting', 'completed', 'cancelled'], default: 'dispatched' },
  requestedBy:    mongoose.Schema.Types.ObjectId,
  notes:          String,
  dispatchedAt:   { type: Date, default: Date.now },
  arrivedAt:      Date,
  completedAt:    Date,
  estimatedArrival: Date
}, { timestamps: true });

const Ambulance = mongoose.model('Ambulance', ambulanceSchema);
const Dispatch = mongoose.model('Dispatch', dispatchSchema);

app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json());
app.use(compression());

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

// GET /api/ambulance — list all
app.get('/api/ambulance', protect, async (req, res) => {
  try {
    const ambulances = await Ambulance.find({ isActive: true }).lean();
    // Attach real-time location from Redis
    const withLocations = await Promise.all(ambulances.map(async a => {
      const loc = await redis.get(`ambulance:location:${a.ambulanceId}`);
      return { ...a, liveLocation: loc ? JSON.parse(loc) : null };
    }));
    res.json({ success: true, data: withLocations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/ambulance/dispatch — emergency dispatch
app.post('/api/ambulance/dispatch', protect, [
  body('pickupLocation.address').notEmpty().withMessage('Pickup address required'),
  body('priority').isIn(['normal', 'urgent', 'critical'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const available = await Ambulance.findOne({ status: 'available', isActive: true, type: req.body.ambulanceType || 'advanced' });
    if (!available) {
      const anyAvailable = await Ambulance.findOne({ status: 'available', isActive: true });
      if (!anyAvailable) return res.status(503).json({ success: false, message: 'No ambulances available' });
    }
    const ambulance = available || await Ambulance.findOne({ status: 'available', isActive: true });
    await Ambulance.findByIdAndUpdate(ambulance._id, { status: 'dispatched' });
    const dispatchId = `DSP${Date.now().toString(36).toUpperCase()}`;
    const eta = new Date(Date.now() + 15 * 60 * 1000);
    const dispatch = await Dispatch.create({
      ...req.body, dispatchId, ambulanceId: ambulance.ambulanceId,
      requestedBy: req.user.id, estimatedArrival: eta
    });
    // Notify driver via Socket.io
    const driverSocket = connectedDrivers.get(ambulance.ambulanceId);
    if (driverSocket) {
      io.to(driverSocket).emit('dispatch-order', { dispatch, priority: req.body.priority });
    }
    // Kafka event
    try {
      await producer.send({ topic: 'ambulance.events', messages: [{ value: JSON.stringify({ type: 'ambulance.dispatched', dispatch }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.status(201).json({ success: true, data: { dispatch, ambulance: { id: ambulance.ambulanceId, vehicleNumber: ambulance.vehicleNumber, driver: ambulance.driver }, estimatedArrival: eta } });
  } catch (err) {
    logger.error('Dispatch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/ambulance/dispatch/:id/status
app.patch('/api/ambulance/dispatch/:id/status', protect, async (req, res) => {
  try {
    const dispatch = await Dispatch.findOneAndUpdate(
      { $or: [{ dispatchId: req.params.id }, { _id: req.params.id }] },
      { $set: { status: req.body.status, ...(req.body.status === 'arrived' ? { arrivedAt: new Date() } : {}), ...(req.body.status === 'completed' ? { completedAt: new Date() } : {}) } },
      { new: true }
    );
    if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch not found' });
    if (dispatch.status === 'completed' || dispatch.status === 'cancelled') {
      await Ambulance.findOneAndUpdate({ ambulanceId: dispatch.ambulanceId }, { status: 'available' });
    }
    res.json({ success: true, data: dispatch });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/ambulance/track/:ambulanceId — real-time location
app.get('/api/ambulance/track/:ambulanceId', protect, async (req, res) => {
  try {
    const loc = await redis.get(`ambulance:location:${req.params.ambulanceId}`);
    res.json({ success: true, data: loc ? JSON.parse(loc) : null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ambulance-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3008;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_ambulance');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  server.listen(PORT, () => logger.info(`Ambulance Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  await mongoose.disconnect();
  server.close(() => process.exit(0));
});
