'use strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
client.collectDefaultMetrics({ prefix: 'pharmacy_service_' });

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: t => Math.min(t * 50, 2000)
});

const kafka = new Kafka({ clientId: 'pharmacy-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'pharmacy-service-group' });

// ── Schemas ───────────────────────────────────────────────────
const medicineSchema = new mongoose.Schema({
  medicineId:     { type: String, unique: true, required: true },
  name:           { type: String, required: true },
  genericName:    String,
  manufacturer:   String,
  category:       { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch', 'other'] },
  dosageForm:     String,
  strength:       String,
  composition:    String,
  mrp:            { type: Number, required: true },
  sellingPrice:   { type: Number, required: true },
  hsnCode:        String,
  requiresPrescription: { type: Boolean, default: false },
  storageConditions: String,
  stockQuantity:  { type: Number, default: 0 },
  reorderLevel:   { type: Number, default: 10 },
  expiryDate:     Date,
  batchNumber:    String,
  isActive:       { type: Boolean, default: true }
}, { timestamps: true });

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, unique: true, required: true },
  patientId:      { type: String, required: true },
  doctorId:       { type: String, required: true },
  appointmentId:  String,
  medicines: [{
    medicineId:  { type: String, required: true },
    medicineName:String,
    dosage:      String,
    frequency:   String,
    duration:    String,
    quantity:    { type: Number, required: true },
    instructions:String,
    isDispensed: { type: Boolean, default: false }
  }],
  diagnosis:      String,
  notes:          String,
  status:         { type: String, enum: ['pending', 'dispensed', 'partial', 'cancelled'], default: 'pending' },
  totalAmount:    { type: Number, default: 0 },
  dispensedAt:    Date
}, { timestamps: true });

const Medicine = mongoose.model('Medicine', medicineSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);

app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json());
app.use(compression());

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

// GET /api/pharmacy/medicines
app.get('/api/pharmacy/medicines', protect, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { genericName: new RegExp(search, 'i') },
      { medicineId: new RegExp(search, 'i') }
    ];
    const [medicines, total] = await Promise.all([
      Medicine.find(filter).skip((parseInt(page)-1)*parseInt(limit)).limit(parseInt(limit)).lean(),
      Medicine.countDocuments(filter)
    ]);
    res.json({ success: true, data: medicines, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/prescriptions/:id/dispense
app.post('/api/pharmacy/prescriptions/:id/dispense', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ $or: [{ prescriptionId: req.params.id }, { _id: req.params.id }] });
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (prescription.status === 'dispensed') return res.status(409).json({ success: false, message: 'Already dispensed' });

    let totalAmount = 0;
    for (const med of prescription.medicines) {
      const medicine = await Medicine.findOne({ medicineId: med.medicineId });
      if (medicine && medicine.stockQuantity >= med.quantity) {
        await Medicine.findOneAndUpdate({ medicineId: med.medicineId }, { $inc: { stockQuantity: -med.quantity } });
        totalAmount += medicine.sellingPrice * med.quantity;
        med.isDispensed = true;
      }
    }
    prescription.status = prescription.medicines.every(m => m.isDispensed) ? 'dispensed' : 'partial';
    prescription.totalAmount = totalAmount;
    prescription.dispensedAt = new Date();
    await prescription.save();

    try {
      await producer.send({ topic: 'prescription.events', messages: [{ value: JSON.stringify({ type: 'prescription.dispensed', prescriptionId: prescription.prescriptionId, totalAmount }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.json({ success: true, data: prescription });
  } catch (err) {
    logger.error('Dispense error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/inventory/low-stock
app.get('/api/pharmacy/inventory/low-stock', protect, async (req, res) => {
  try {
    const lowStock = await Medicine.find({ $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }, isActive: true }).lean();
    res.json({ success: true, data: lowStock, count: lowStock.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'pharmacy-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3005;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_pharmacy');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));

  // Consume appointment.events to auto-register prescriptions
  await consumer.connect().catch(e => logger.warn('Kafka consumer unavailable:', e.message));
  await consumer.subscribe({ topics: ['appointment.events'], fromBeginning: false }).catch(() => {});
  consumer.run({ eachMessage: async ({ message }) => {
    try {
      const event = JSON.parse(message.value.toString());
      if (event.type === 'appointment.completed' && event.appointment?.prescription) {
        const prescriptionId = `RX${Date.now().toString(36).toUpperCase()}`;
        await Prescription.create({ prescriptionId, ...event.appointment });
      }
    } catch (e) { logger.warn('Consumer error:', e.message); }
  }}).catch(() => {});

  app.listen(PORT, () => logger.info(`Pharmacy Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await consumer.disconnect().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
