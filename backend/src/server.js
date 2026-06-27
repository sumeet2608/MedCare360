'use strict';
require('dotenv').config();

// Prevent any unhandled error events from crashing the process (Redis/Kafka retry storms)
process.on('uncaughtException', err => {
  // Only swallow EventEmitter "no listener" errors from infrastructure clients
  if (err && err.code === 'ERR_UNHANDLED_ERROR') return;
  console.error('[uncaughtException]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { Server: SocketServer } = require('socket.io');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const client = require('prom-client');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// ── OpenTelemetry (Jaeger) ────────────────────────────────────
if (process.env.JAEGER_ENDPOINT) {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const sdk = new NodeSDK({
      traceExporter: new JaegerExporter({ endpoint: process.env.JAEGER_ENDPOINT }),
      instrumentations: [getNodeAutoInstrumentations()]
    });
    sdk.start();
    logger.info('OpenTelemetry SDK started');
  } catch (e) {
    logger.warn('OpenTelemetry failed to load — tracing disabled:', e.message);
  }
}

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000
});

// Track users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('authenticate', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    socket.emit('authenticated', { status: 'ok' });
  });

  socket.on('join-admin', () => socket.join('admin-room'));
  socket.on('join-queue', (deptId) => socket.join(`queue:${deptId}`));
  socket.on('track-ambulance', (id) => socket.join(`ambulance:${id}`));

  socket.on('disconnect', () => {
    connectedUsers.forEach((sockId, userId) => {
      if (sockId === socket.id) connectedUsers.delete(userId);
    });
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ── Redis ─────────────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: times => {
    if (times >= 10) {
      logger.warn('Redis unavailable — caching disabled. Start Redis to enable.');
      return null; // stop retrying
    }
    return Math.min(times * 200, 3000);
  },
  maxRetriesPerRequest: null,
  enableOfflineQueue: false
});
redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', () => {}); // errors are surfaced via retryStrategy warning
app.set('redis', redis);

// ── Kafka Producer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'medcare360-backend',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { initialRetryTime: 100, retries: 5 },
  logLevel: 0 // NOTHING — suppress internal KafkaJS logs; our catch block handles failures
});
const kafkaProducer = kafka.producer();

const initKafka = async () => {
  try {
    await kafkaProducer.connect();
    logger.info('Kafka producer connected');
    app.set('kafkaProducer', kafkaProducer);
  } catch (err) {
    logger.warn('Kafka unavailable — events disabled:', err.message);
  }
};

// ── Prometheus metrics ────────────────────────────────────────
client.collectDefaultMetrics({ prefix: 'medcare_' });
const httpDuration = new client.Histogram({
  name: 'medcare_http_request_duration_seconds',
  help: 'HTTP request durations',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode }));
  next();
});

// ── Security ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
}));
app.use(mongoSanitize({ allowDots: true, replaceWith: '_' }));

// ── XSS Protection (missing from previous implementation) ─────
try {
  const xss = require('xss-clean');
  app.use(xss());
} catch (e) { /* xss-clean optional */ }

// ── Rate limiting — tiered by endpoint sensitivity ─────────────
const makeLimit = (max, windowMs = 900000) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: () => process.env.NODE_ENV === 'test'
});
// Auth endpoints — tightest limits (prevent brute force)
app.use('/api/auth/login',          makeLimit(10,  900000));  // 10/15min
app.use('/api/auth/register',       makeLimit(5,   3600000)); // 5/hour
app.use('/api/auth/forgot-password',makeLimit(5,   3600000)); // 5/hour
// AI endpoints — expensive, moderate limits
app.use('/api/ai',                  makeLimit(30,  900000));  // 30/15min
app.use('/api/ai-analyzer',         makeLimit(50,  900000));  // 50/15min
// General API — generous for clinical workflows
app.use('/api/',                    makeLimit(parseInt(process.env.RATE_LIMIT_MAX) || 500, 900000));

// CORS
app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:4200').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use('/uploads', express.static('uploads'));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/patients',         require('./routes/patients'));
app.use('/api/doctors',          require('./routes/doctors'));
app.use('/api/appointments',     require('./routes/appointments'));
app.use('/api/pharmacy',         require('./routes/pharmacy'));
app.use('/api/billing',          require('./routes/billing'));
app.use('/api/ambulance',        require('./routes/ambulance'));
app.use('/api/lab',              require('./routes/lab'));
app.use('/api/inventory',        require('./routes/inventory'));
app.use('/api/staff',            require('./routes/staff'));
app.use('/api/ai',               require('./routes/ai'));
app.use('/api/analytics',        require('./routes/analytics'));
app.use('/api/search',           require('./routes/search'));
app.use('/api/notifications',    require('./routes/notifications'));
// Enterprise additions
app.use('/api/blood-bank',       require('./routes/bloodBank'));
app.use('/api/beds',             require('./routes/beds'));
app.use('/api/operation-theater',require('./routes/operationTheater'));
app.use('/api/telemedicine',     require('./routes/telemedicine'));
// Healthcare standards & AI enhancement
app.use('/fhir',                 require('./routes/fhir'));
app.use('/api/ai-analyzer',      require('./routes/aiAnalyzer'));
app.use('/api/hospitals',        require('./routes/hospitals'));
// EMR — Phase 3 Enterprise Features
app.use('/api/emr',              require('./routes/emr'));
// Admin reset & cleanup (discharge+archive patient, reset revenue, clear invoices)
app.use('/api/admin',            require('./routes/admin'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const redisStatus = await redis.ping().then(() => 'ok').catch(() => 'error');
  res.json({
    status: 'healthy',
    service: 'medcare360-backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    dependencies: {
      mongodb: mongoose.connection.readyState === 1 ? 'ok' : 'error',
      redis: redisStatus
    }
  });
});

// ── Prometheus metrics endpoint ───────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// ── 404 & error handlers ──────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

const connectDB = async () => {
  const isProd = process.env.NODE_ENV === 'production';
  // In production use MONGODB_URI_PROD; in dev use MONGODB_URI or localhost fallback
  const uri = isProd
    ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
    : (process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360');
  if (!uri) {
    logger.error('MONGODB_URI or MONGODB_URI_PROD is required in production');
    process.exit(1);
  }
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
};

const start = async () => {
  await connectDB();
  await initKafka();
  server.listen(PORT, () => {
    logger.info(`MedCare 360 v2.0 running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start().catch(err => { logger.error('Startup failed:', err); process.exit(1); });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await kafkaProducer.disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  await mongoose.disconnect();
  server.close(() => process.exit(0));
});

module.exports = { app, io };
