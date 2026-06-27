'use strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
client.collectDefaultMetrics({ prefix: 'lab_service_' });

const kafka = new Kafka({ clientId: 'lab-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();

// ── Schemas ───────────────────────────────────────────────────
const testCatalogSchema = new mongoose.Schema({
  testCode:    { type: String, unique: true, required: true },
  testName:    { type: String, required: true },
  category:    { type: String, enum: ['hematology', 'biochemistry', 'microbiology', 'serology', 'pathology', 'radiology', 'cardiology', 'other'] },
  sampleType:  { type: String, enum: ['blood', 'urine', 'stool', 'sputum', 'swab', 'tissue', 'csf', 'other'] },
  turnaroundTime: { type: Number, default: 24 },
  price:       { type: Number, required: true },
  normalRange: String,
  unit:        String,
  isActive:    { type: Boolean, default: true },
  requiresFasting: { type: Boolean, default: false }
}, { timestamps: true });

const labReportSchema = new mongoose.Schema({
  reportId:    { type: String, unique: true, required: true },
  patientId:   { type: String, required: true },
  patientName: String,
  doctorId:    String,
  orderedTests:[{
    testCode:    String,
    testName:    String,
    sampleType:  String,
    status:      { type: String, enum: ['ordered', 'sample-collected', 'processing', 'completed', 'cancelled'], default: 'ordered' },
    result:      String,
    unit:        String,
    normalRange: String,
    isAbnormal:  Boolean,
    remarks:     String,
    completedAt: Date
  }],
  sampleCollectedAt: Date,
  priority:    { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  status:      { type: String, enum: ['pending', 'in-progress', 'completed', 'partial'], default: 'pending' },
  totalAmount: Number,
  reportUrl:   String,
  notes:       String
}, { timestamps: true });

const TestCatalog = mongoose.model('TestCatalog', testCatalogSchema);
const LabReport = mongoose.model('LabReport', labReportSchema);

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

// GET /api/lab/catalog
app.get('/api/lab/catalog', protect, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$or = [{ testName: new RegExp(search, 'i') }, { testCode: new RegExp(search, 'i') }];
    const tests = await TestCatalog.find(filter).lean();
    res.json({ success: true, data: tests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/lab/reports — order lab tests
app.post('/api/lab/reports', protect, [
  body('patientId').notEmpty(),
  body('orderedTests').isArray({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const reportId = `LAB${Date.now().toString(36).toUpperCase()}`;
    let totalAmount = 0;
    const tests = [];
    for (const t of req.body.orderedTests) {
      const catalog = await TestCatalog.findOne({ testCode: t.testCode });
      if (catalog) { totalAmount += catalog.price; tests.push({ ...t, testName: catalog.testName, sampleType: catalog.sampleType }); }
      else tests.push(t);
    }
    const report = await LabReport.create({ ...req.body, reportId, orderedTests: tests, totalAmount });
    try {
      await producer.send({ topic: 'billing.events', messages: [{ value: JSON.stringify({ type: 'lab.ordered', reportId, patientId: req.body.patientId, totalAmount }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    logger.error('Create lab report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/lab/reports/:id/results — upload results
app.patch('/api/lab/reports/:id/results', protect, async (req, res) => {
  try {
    const report = await LabReport.findOne({ $or: [{ reportId: req.params.id }, { _id: req.params.id }] });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (req.body.results) {
      req.body.results.forEach(result => {
        const test = report.orderedTests.find(t => t.testCode === result.testCode);
        if (test) {
          Object.assign(test, result, { status: 'completed', completedAt: new Date() });
        }
      });
    }
    report.status = report.orderedTests.every(t => t.status === 'completed') ? 'completed' : 'partial';
    await report.save();
    try {
      await producer.send({ topic: 'billing.events', messages: [{ value: JSON.stringify({ type: 'lab.completed', reportId: report.reportId }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/lab/reports/patient/:patientId
app.get('/api/lab/reports/patient/:patientId', protect, async (req, res) => {
  try {
    const reports = await LabReport.find({ patientId: req.params.patientId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'lab-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3007;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_lab');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  app.listen(PORT, () => logger.info(`Lab Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
