'use strict';
require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const client = require('prom-client');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Redis client ──────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: times => Math.min(times * 50, 2000)
});

redis.on('error', err => logger.error('Redis error', err));

// ── Prometheus metrics ────────────────────────────────────────
client.collectDefaultMetrics({ prefix: 'gateway_' });
const httpRequestDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
const httpRequestTotal = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// ── Security middleware ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ── Request ID & tracing ──────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  req.correlationId = req.headers['x-correlation-id'] || req.requestId;
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// ── Access logging ────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) }
}));

// ── Metrics middleware ────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    end({ method: req.method, route, status_code: res.statusCode });
    httpRequestTotal.inc({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

// ── Global rate limit ─────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
}));

// ── Strict rate limit for auth endpoints ──────────────────────
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));

// ── JWT verification middleware (bypass auth routes) ──────────
const authMiddleware = async (req, res, next) => {
  const publicPaths = [
    '/api/auth/login', '/api/auth/register',
    '/api/auth/forgot-password', '/api/auth/reset-password',
    '/health', '/metrics'
  ];
  if (publicPaths.some(p => req.path.startsWith(p))) return next();

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    // Check token blacklist in Redis
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) return res.status(401).json({ success: false, message: 'Token revoked' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

app.use(authMiddleware);

// ── Service registry ──────────────────────────────────────────
const SERVICES = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://auth-service:3001',
  patient:      process.env.PATIENT_SERVICE_URL       || 'http://patient-service:3002',
  doctor:       process.env.DOCTOR_SERVICE_URL        || 'http://doctor-service:3003',
  appointment:  process.env.APPOINTMENT_SERVICE_URL   || 'http://appointment-service:3004',
  pharmacy:     process.env.PHARMACY_SERVICE_URL      || 'http://pharmacy-service:3005',
  billing:      process.env.BILLING_SERVICE_URL       || 'http://billing-service:3006',
  lab:          process.env.LAB_SERVICE_URL           || 'http://lab-service:3007',
  ambulance:    process.env.AMBULANCE_SERVICE_URL     || 'http://ambulance-service:3008',
  notification: process.env.NOTIFICATION_SERVICE_URL  || 'http://notification-service:3009',
  ai:           process.env.AI_SERVICE_URL            || 'http://ai-service:3010',
  analytics:    process.env.ANALYTICS_SERVICE_URL     || 'http://analytics-service:3011',
  inventory:    process.env.INVENTORY_SERVICE_URL     || 'http://inventory-service:3012'
};

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Request-ID', req.requestId);
      proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      proxyReq.setHeader('X-Forwarded-For', req.ip);
    },
    error: (err, req, res) => {
      logger.error(`Proxy error for ${req.path}:`, err.message);
      res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
    }
  }
});

// ── Route proxying ────────────────────────────────────────────
app.use('/api/auth',         createProxyMiddleware(proxyOptions(SERVICES.auth)));
app.use('/api/patients',     createProxyMiddleware(proxyOptions(SERVICES.patient)));
app.use('/api/doctors',      createProxyMiddleware(proxyOptions(SERVICES.doctor)));
app.use('/api/appointments', createProxyMiddleware(proxyOptions(SERVICES.appointment)));
app.use('/api/pharmacy',     createProxyMiddleware(proxyOptions(SERVICES.pharmacy)));
app.use('/api/billing',      createProxyMiddleware(proxyOptions(SERVICES.billing)));
app.use('/api/lab',          createProxyMiddleware(proxyOptions(SERVICES.lab)));
app.use('/api/ambulance',    createProxyMiddleware(proxyOptions(SERVICES.ambulance)));
app.use('/api/notifications',createProxyMiddleware(proxyOptions(SERVICES.notification)));
app.use('/api/ai',           createProxyMiddleware(proxyOptions(SERVICES.ai)));
app.use('/api/analytics',    createProxyMiddleware(proxyOptions(SERVICES.analytics)));
app.use('/api/inventory',    createProxyMiddleware(proxyOptions(SERVICES.inventory)));

// ── Health & metrics ──────────────────────────────────────────
app.get('/health', async (req, res) => {
  const redisStatus = await redis.ping().then(() => 'ok').catch(() => 'error');
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: { redis: redisStatus }
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
