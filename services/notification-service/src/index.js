'use strict';
require('dotenv').config();
const express = require('express');
const { Kafka } = require('kafkajs');
const { Server: SocketServer } = require('socket.io');
const http = require('http');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3009;

// ── Redis ─────────────────────────────────────────────────────
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: 6379 });

// ── Socket.io ─────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Track connected users: userId → socket.id
const userSockets = new Map();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('authenticate', (userId) => {
    userSockets.set(userId, socket.id);
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} authenticated on socket`);
  });

  socket.on('join-queue', (data) => {
    socket.join(`queue:${data.departmentId}`);
  });

  socket.on('ambulance-track', (ambulanceId) => {
    socket.join(`ambulance:${ambulanceId}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) userSockets.delete(userId);
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible
app.set('io', io);

// ── Email transporter ─────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// ── Kafka consumer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

const TOPICS = [
  'appointment.events', 'billing.events', 'prescription.events',
  'ambulance.events', 'inventory.events', 'auth.events'
];

const handleEvent = async (topic, event) => {
  logger.info(`Processing event: ${topic} - ${event.type}`);

  switch (event.type) {
    case 'appointment.booked':
      await sendEmail(event.patientEmail, 'Appointment Confirmed', appointmentConfirmTemplate(event));
      io.to(`user:${event.patientId}`).emit('notification', {
        type: 'appointment_booked', message: `Appointment booked for ${event.date} at ${event.time}`, timestamp: new Date()
      });
      break;

    case 'appointment.reminder':
      await sendEmail(event.patientEmail, 'Appointment Reminder', appointmentReminderTemplate(event));
      io.to(`user:${event.patientId}`).emit('notification', {
        type: 'appointment_reminder', message: `Reminder: Your appointment is in 1 hour`, timestamp: new Date()
      });
      break;

    case 'billing.generated':
      await sendEmail(event.patientEmail, 'Invoice Generated', invoiceTemplate(event));
      io.to(`user:${event.patientId}`).emit('notification', {
        type: 'invoice_generated', message: `Invoice #${event.invoiceId} for ₹${event.amount}`, timestamp: new Date()
      });
      break;

    case 'ambulance.dispatched':
      io.to(`user:${event.requestedBy}`).emit('notification', {
        type: 'ambulance_dispatched', message: `Ambulance dispatched — ETA ${event.eta} minutes`, timestamp: new Date()
      });
      io.to(`ambulance:${event.ambulanceId}`).emit('ambulance-update', event);
      break;

    case 'inventory.low-stock':
      io.to('admin-room').emit('notification', {
        type: 'low_stock_alert', message: `Low stock: ${event.itemName} — only ${event.quantity} remaining`, timestamp: new Date(), severity: 'warning'
      });
      break;

    case 'queue.update':
      io.to(`queue:${event.departmentId}`).emit('queue-update', {
        position: event.position, waitTime: event.waitTime, total: event.total
      });
      break;
  }
};

const sendEmail = async (to, subject, html) => {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: `"MedCare 360" <${process.env.FROM_EMAIL || 'noreply@medcare360.com'}>`,
      to, subject, html
    });
    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error(`Email error to ${to}:`, err.message);
  }
};

// ── Email templates ───────────────────────────────────────────
const appointmentConfirmTemplate = (e) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0891b2;color:white;padding:20px;text-align:center">
    <h1>MedCare 360</h1><p>Appointment Confirmed</p>
  </div>
  <div style="padding:20px">
    <p>Dear ${e.patientName},</p>
    <p>Your appointment has been confirmed.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Doctor</strong></td><td style="padding:8px;border:1px solid #ddd">Dr. ${e.doctorName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Date</strong></td><td style="padding:8px;border:1px solid #ddd">${e.date}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Time</strong></td><td style="padding:8px;border:1px solid #ddd">${e.time}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Type</strong></td><td style="padding:8px;border:1px solid #ddd">${e.type}</td></tr>
    </table>
  </div>
</div>`;

const appointmentReminderTemplate = (e) => `
<div style="font-family:Arial,sans-serif;max-width:600px">
  <h2 style="color:#0891b2">Appointment Reminder</h2>
  <p>You have an appointment with Dr. ${e.doctorName} in 1 hour at ${e.time}.</p>
</div>`;

const invoiceTemplate = (e) => `
<div style="font-family:Arial,sans-serif;max-width:600px">
  <h2 style="color:#0891b2">Invoice #${e.invoiceId}</h2>
  <p>Total Amount: <strong>₹${e.amount}</strong></p>
  <p>Due Date: ${e.dueDate}</p>
</div>`;

// ── Start Kafka consumer ──────────────────────────────────────
const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: TOPICS, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await handleEvent(topic, event);
      } catch (err) {
        logger.error(`Error processing message from ${topic}:`, err);
      }
    }
  });
  logger.info('Kafka consumer started for topics:', TOPICS.join(', '));
};

app.use(express.json());

// ── REST API for push notifications ──────────────────────────
app.post('/api/notifications/push', async (req, res) => {
  const { userId, message, type } = req.body;
  io.to(`user:${userId}`).emit('notification', { type, message, timestamp: new Date() });

  // Store in Redis for offline users (24hr TTL)
  const key = `notifications:${userId}`;
  await redis.lpush(key, JSON.stringify({ type, message, timestamp: new Date(), read: false }));
  await redis.ltrim(key, 0, 49); // keep last 50
  await redis.expire(key, 86400);

  res.json({ success: true });
});

app.get('/api/notifications/:userId', async (req, res) => {
  const notifications = await redis.lrange(`notifications:${req.params.userId}`, 0, 49);
  res.json({ success: true, data: notifications.map(n => JSON.parse(n)) });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'notification-service' }));

// ── Start ─────────────────────────────────────────────────────
const start = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcare360');
  await startConsumer();
  server.listen(PORT, () => logger.info(`Notification Service on port ${PORT}`));
};

start().catch(err => { logger.error(err); process.exit(1); });
