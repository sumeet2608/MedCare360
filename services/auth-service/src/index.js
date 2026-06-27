'use strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Redis ─────────────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: t => Math.min(t * 50, 2000)
});
redis.on('error', err => logger.error('Redis error', err));
app.set('redis', redis);

// ── Kafka producer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();

const initKafka = async () => {
  try {
    await producer.connect();
    logger.info('Kafka producer connected');
  } catch (err) {
    logger.error('Kafka connection error:', err.message);
  }
};
app.set('kafkaProducer', producer);

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'auth-service', timestamp: new Date().toISOString()
}));

// ── MongoDB + Start ───────────────────────────────────────────
const start = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360_auth');
  await initKafka();
  app.listen(PORT, () => logger.info(`Auth Service on port ${PORT}`));
};

start().catch(err => { logger.error(err); process.exit(1); });
module.exports = app;
