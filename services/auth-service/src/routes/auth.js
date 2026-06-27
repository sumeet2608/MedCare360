'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────
const signTokens = (user) => {
  const payload = { id: user._id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
  });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  });
  return { accessToken, refreshToken };
};

const audit = async (req, action, userId, details = {}) => {
  try {
    await AuditLog.create({
      action, userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details,
      timestamp: new Date()
    });
  } catch (e) {
    logger.error('Audit log error', e);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password, totpCode } = req.body;
    const user = await User.findOne({ email }).select('+password +totpSecret +isActive');

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await audit(req, 'LOGIN_FAILED', user._id, { email });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!totpCode) return res.status(200).json({ success: true, requires2FA: true });
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1
      });
      if (!valid) {
        await audit(req, '2FA_FAILED', user._id, { email });
        return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
      }
    }

    const { accessToken, refreshToken } = signTokens(user);

    // Store refresh token in Redis (7d TTL)
    const redis = req.app.get('redis');
    await redis.set(`refresh:${user._id}`, refreshToken, 'EX', 7 * 24 * 3600);

    await audit(req, 'LOGIN_SUCCESS', user._id, { email });

    // Publish login event to Kafka
    try {
      const producer = req.app.get('kafkaProducer');
      await producer.send({
        topic: 'auth.events',
        messages: [{ key: user._id.toString(), value: JSON.stringify({ event: 'user.login', userId: user._id, email, timestamp: new Date() }) }]
      });
    } catch (e) { logger.warn('Kafka publish failed', e.message); }

    res.json({
      success: true,
      data: {
        user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const redis = req.app.get('redis');
    const stored = await redis.get(`refresh:${decoded.id}`);
    if (stored !== refreshToken)
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const tokens = signTokens(user);
    await redis.set(`refresh:${user._id}`, tokens.refreshToken, 'EX', 7 * 24 * 3600);

    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = req.headers['x-user-id'];
  if (token) {
    const redis = req.app.get('redis');
    await redis.set(`blacklist:${token}`, '1', 'EX', 900); // 15m = access token lifetime
    if (userId) await redis.del(`refresh:${userId}`);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── POST /api/auth/2fa/setup ──────────────────────────────────
router.post('/2fa/setup', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const secret = speakeasy.generateSecret({ name: `MedCare 360 (${user.email})` });
  user.totpSecret = secret.base32;
  await user.save();

  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ success: true, data: { secret: secret.base32, qrCode: qrDataUrl } });
});

// ── POST /api/auth/2fa/verify ─────────────────────────────────
router.post('/2fa/verify', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { code } = req.body;
  const user = await User.findById(userId).select('+totpSecret');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(400).json({ success: false, message: 'Invalid code' });

  user.twoFactorEnabled = true;
  await user.save();
  res.json({ success: true, message: '2FA enabled successfully' });
});

// ── GET /api/auth/audit-logs ──────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  const { page = 1, limit = 50, userId, action } = req.query;
  const filter = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;

  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: logs });
});

module.exports = router;
