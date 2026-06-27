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
const cron = require('node-cron');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
client.collectDefaultMetrics({ prefix: 'inventory_service_' });

const kafka = new Kafka({ clientId: 'inventory-service', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'inventory-service-group' });

// ── Schema ────────────────────────────────────────────────────
const inventorySchema = new mongoose.Schema({
  itemId:      { type: String, unique: true, required: true },
  name:        { type: String, required: true },
  category:    { type: String, enum: ['medical-equipment', 'disposables', 'surgical', 'medicines', 'ppe', 'linen', 'furniture', 'it', 'other'], required: true },
  sku:         { type: String, unique: true },
  description: String,
  unit:        { type: String, default: 'pcs' },
  currentStock:{ type: Number, default: 0, min: 0 },
  minimumStock:{ type: Number, default: 5 },
  reorderQuantity: { type: Number, default: 50 },
  location:    String,
  supplier: {
    name:    String,
    contact: String,
    email:   String
  },
  costPrice:   Number,
  sellingPrice:Number,
  lastRestocked: Date,
  expiryDate:  Date,
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

const purchaseOrderSchema = new mongoose.Schema({
  poId:        { type: String, unique: true, required: true },
  items: [{
    itemId:        String,
    itemName:      String,
    quantity:      Number,
    unitPrice:     Number,
    totalPrice:    Number
  }],
  supplier:    String,
  totalAmount: Number,
  status:      { type: String, enum: ['draft', 'ordered', 'partial', 'received', 'cancelled'], default: 'draft' },
  orderedAt:   Date,
  expectedAt:  Date,
  receivedAt:  Date,
  notes:       String
}, { timestamps: true });

inventorySchema.index({ category: 1 });
inventorySchema.index({ currentStock: 1, minimumStock: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

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

// GET /api/inventory
app.get('/api/inventory', protect, async (req, res) => {
  try {
    const { category, lowStock, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
    if (search) filter.name = new RegExp(search, 'i');
    const [items, total] = await Promise.all([
      Inventory.find(filter).skip((parseInt(page)-1)*parseInt(limit)).limit(parseInt(limit)).lean(),
      Inventory.countDocuments(filter)
    ]);
    res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/inventory
app.post('/api/inventory', protect, [
  body('name').trim().notEmpty(),
  body('category').notEmpty(),
  body('currentStock').optional().isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const itemId = `INV${Date.now().toString(36).toUpperCase()}`;
    const sku = `SKU-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const item = await Inventory.create({ ...req.body, itemId, sku });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Item already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/inventory/:id/stock — update stock
app.patch('/api/inventory/:id/stock', protect, [
  body('quantity').isInt({ min: 1 }),
  body('operation').isIn(['add', 'subtract'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const inc = req.body.operation === 'add' ? req.body.quantity : -req.body.quantity;
    const item = await Inventory.findOneAndUpdate(
      { $or: [{ itemId: req.params.id }, { _id: req.params.id }] },
      { $inc: { currentStock: inc }, ...(inc > 0 ? { $set: { lastRestocked: new Date() } } : {}) },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.currentStock <= item.minimumStock) {
      try {
        await producer.send({ topic: 'inventory.events', messages: [{ value: JSON.stringify({ type: 'inventory.low-stock', itemId: item.itemId, currentStock: item.currentStock, minimumStock: item.minimumStock }) }] });
      } catch (e) { logger.warn('Kafka publish failed:', e.message); }
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/inventory/alerts — low stock items
app.get('/api/inventory/alerts', protect, async (req, res) => {
  try {
    const lowStock = await Inventory.find({ $expr: { $lte: ['$currentStock', '$minimumStock'] }, isActive: true }).lean();
    const expiringSoon = await Inventory.find({
      expiryDate: { $lte: new Date(Date.now() + 30 * 86400000), $gte: new Date() },
      isActive: true
    }).lean();
    res.json({ success: true, data: { lowStock, expiringSoon, totalAlerts: lowStock.length + expiringSoon.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/inventory/purchase-orders
app.post('/api/inventory/purchase-orders', protect, async (req, res) => {
  try {
    const poId = `PO${Date.now().toString(36).toUpperCase()}`;
    const items = req.body.items.map(i => ({ ...i, totalPrice: i.quantity * i.unitPrice }));
    const totalAmount = items.reduce((s, i) => s + i.totalPrice, 0);
    const po = await PurchaseOrder.create({ ...req.body, poId, items, totalAmount, orderedAt: new Date() });
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Daily check for low-stock alerts
cron.schedule('0 8 * * *', async () => {
  try {
    const lowStock = await Inventory.find({ $expr: { $lte: ['$currentStock', '$minimumStock'] }, isActive: true }).lean();
    if (lowStock.length > 0) {
      await producer.send({ topic: 'inventory.events', messages: [{ value: JSON.stringify({ type: 'inventory.daily-alert', count: lowStock.length, items: lowStock.map(i => i.name) }) }] }).catch(() => {});
    }
    logger.info(`Daily inventory check: ${lowStock.length} low-stock items`);
  } catch (err) {
    logger.error('Cron job error:', err);
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'inventory-service', version: '1.0.0' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = parseInt(process.env.PORT) || 3012;
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_inventory');
  await producer.connect().catch(e => logger.warn('Kafka unavailable:', e.message));
  await consumer.connect().catch(e => logger.warn('Kafka consumer unavailable:', e.message));
  app.listen(PORT, () => logger.info(`Inventory Service on :${PORT}`));
})().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

process.on('SIGTERM', async () => {
  await producer.disconnect().catch(() => {});
  await consumer.disconnect().catch(() => {});
  await mongoose.disconnect();
  process.exit(0);
});
