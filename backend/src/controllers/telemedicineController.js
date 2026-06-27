'use strict';
const { v4: uuidv4 } = require('uuid');
const Telemedicine = require('../models/Telemedicine');

exports.getSessions = async (req, res) => {
  const { status, doctorId, patientId, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctorId) filter.doctor = doctorId;
  if (patientId) filter.patient = patientId;

  const sessions = await Telemedicine.find(filter)
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'firstName lastName specialization')
    .sort({ scheduledAt: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));

  const total = await Telemedicine.countDocuments(filter);
  res.json({ success: true, data: sessions, total });
};

exports.createSession = async (req, res) => {
  const sessionId = uuidv4();
  const roomUrl = `${process.env.JITSI_URL || 'https://meet.jit.si'}/medcare-${sessionId}`;
  const session = await Telemedicine.create({ ...req.body, sessionId, roomUrl });
  res.status(201).json({ success: true, data: session });
};

exports.joinSession = async (req, res) => {
  const session = await Telemedicine.findOne({ sessionId: req.params.sessionId })
    .populate('patient', 'firstName lastName')
    .populate('doctor', 'firstName lastName specialization');

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status === 'cancelled') return res.status(400).json({ success: false, message: 'Session cancelled' });

  if (session.status === 'scheduled') {
    await Telemedicine.findByIdAndUpdate(session._id, { status: 'active', startedAt: new Date() });
  }

  res.json({ success: true, data: { session, roomUrl: session.roomUrl } });
};

exports.endSession = async (req, res) => {
  const { diagnosis, prescription, notes, followUp } = req.body;
  const session = await Telemedicine.findOneAndUpdate(
    { sessionId: req.params.sessionId },
    {
      status: 'completed',
      endedAt: new Date(),
      diagnosis, prescription, notes, followUp,
      duration: req.body.duration
    },
    { new: true }
  );

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, data: session });
};

exports.addRating = async (req, res) => {
  const { rating, feedback } = req.body;
  const session = await Telemedicine.findOneAndUpdate(
    { sessionId: req.params.sessionId },
    { patientRating: rating, patientFeedback: feedback },
    { new: true }
  );
  res.json({ success: true, data: session });
};

exports.getUpcomingSessions = async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const filter = { status: { $in: ['scheduled', 'waiting'] }, scheduledAt: { $gte: new Date() } };

  if (role === 'doctor') filter.doctor = userId;
  else if (role === 'patient') filter.patient = userId;

  const sessions = await Telemedicine.find(filter)
    .populate('patient doctor', 'firstName lastName')
    .sort({ scheduledAt: 1 })
    .limit(10);

  res.json({ success: true, data: sessions });
};
