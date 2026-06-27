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
client.collectDefaultMetrics({ prefix: 'billing_service_' });

const kafka = new Kafka({ clientId: 'billing-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'billing-service-group' });

// ── Schema ────────────────────────────────────────────────────
const invoiceSchema = new mongoose.Schema({
  invoiceId:   { type: String, unique: true, required: true },
  patientId:   { type: String, required: true },
  patientName: String,
  type:        { type: String, enum: ['consultation', 'pharmacy', 'lab', 'procedure', 'room', 'ambulance', 'misc'], required: true },
  items: [{
    description: { type: String, required: true },
    quantity:    { type: Number, default: 1 },
    unitPrice:   { type: Number, required: true },
    amount:      { type: Number, required: true },
    taxRate:     { type: Number, default: 0 }
  }],
  subtotal:    { type: Number, required: true },
  taxAmount:   { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount:  { type: Number, default: 0 },
  dueAmount:   { type: Number },
  status:      { type: String, enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'], default: 'pending' },
  paymentMethod:{ type: String, enum: ['cash', 'card', 'upi', 'insurance', 'online', 'pending'], default: 'pending' },
  insurance: {
    provider:      String,
    policyNumber:  String,
    claimId:       String,
    approvedAmount:Number,
    status:        { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'] }
  },
  dueDate:    Date,
  paidAt:     Date,
  notes:      String,
  referenceId:String
}, { timestamps: true });

invoiceSchema.pre('save', function(next) {
  this.dueAmount = this.totalAmount - this.paidAmount;
  if (this.dueAmount <= 0) { this.status = 'paid'; this.paidAt = new Date(); }
  else if (this.paidAmount > 0) { this.status = 'partial'; }
  next();
});

invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

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

// GET /api/billing/invoices
app.get('/api/billing/invoices', protect, async (req, res) => {
  try {
    const { patientId, status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip((parseInt(page)-1)*parseInt(limit)).limit(parseInt(limit)).lean(),
      Invoice.countDocuments(filter)
    ]);
    res.json({ success: true, data: invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/billing/invoices
app.post('/api/billing/invoices', protect, [
  body('patientId').notEmpty(),
  body('type').isIn(['consultation', 'pharmacy', 'lab', 'procedure', 'room', 'ambulance', 'misc']),
  body('items').isArray({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const items = req.body.items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice
    }));
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = items.reduce((s, i) => s + (i.amount * (i.taxRate || 0) / 100), 0);
    const discount = req.body.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const invoiceId = `INV${Date.now().toString(36).toUpperCase()}`;
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const invoice = await Invoice.create({ ...req.body, invoiceId, items, subtotal, taxAmount, discount, totalAmount, dueDate });
    try {
      await producer.send({ topic: 'billing.events', messages: [{ value: JSON.stringify({ type: 'invoice.created', invoiceId, patientId: req.body.patientId, totalAmount }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    logger.error('Create invoice error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/billing/invoices/:id/pay
app.post('/api/billing/invoices/:id/pay', protect, [
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['cash', 'card', 'upi', 'insurance', 'online'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const invoice = await Invoice.findOne({ $or: [{ invoiceId: req.params.id }, { _id: req.params.id }] });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(409).json({ success: false, message: 'Already paid' });
    invoice.paidAmount = Math.min(invoice.paidAmount + req.body.amount, invoice.totalAmount);
    invoice.paymentMethod = req.body.paymentMethod;
    await invoice.save();
    try {
      await producer.send({ topic: 'billing.events', messages: [{ value: JSON.stringify({ type: 'invoice.paid', invoiceId: invoice.invoiceId, amount: req.body.amount }) }] });
    } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/billing/analytics/revenue
app.get('/api/billing/analytics/revenue', protect, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stats = await Invoice.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $in: ['paid', 'partial'] } } },
      { $group: { _id: '$type', total: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: { $in: ['paid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' }, outstanding: { $sum: '$dueAmount' } } }
    ]);
    res.json({ success: true, data: { monthly: stats, overall: totalRevenue[0] || { total: 0, outstanding: 0 } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'billing-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3006;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_billing');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  await consumer.connect().catch(e => logger.warn('Kafka consumer unavailable:', e.message));
  await consumer.subscribe({ topics: ['prescription.events', 'appointment.events'], fromBeginning: false }).catch(() => {});
  consumer.run({ eachMessage: async ({ message }) => {
    try {
      const event = JSON.parse(message.value.toString());
      if (event.type === 'prescription.dispensed' && event.totalAmount > 0) {
        const invoiceId = `INV${Date.now().toString(36).toUpperCase()}`;
        await Invoice.create({
          invoiceId, patientId: event.patientId || 'unknown',
          type: 'pharmacy', items: [{ description: 'Medicines', quantity: 1, unitPrice: event.totalAmount, amount: event.totalAmount }],
          subtotal: event.totalAmount, totalAmount: event.totalAmount, dueDate: new Date(Date.now() + 7 * 86400000)
        });
      }
    } catch (e) { logger.warn('Consumer error:', e.message); }
  }}).catch(() => {});
  app.listen(PORT, () => logger.info(`Billing Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await consumer.disconnect().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
