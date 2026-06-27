'use strict';
const { OTBooking, OTRoom } = require('../models/OperationTheater');

exports.getRooms = async (req, res) => {
  const rooms = await OTRoom.find().sort({ roomNumber: 1 });
  res.json({ success: true, data: rooms });
};

exports.createRoom = async (req, res) => {
  const room = await OTRoom.create(req.body);
  res.status(201).json({ success: true, data: room });
};

exports.getBookings = async (req, res) => {
  const { date, status, surgeon } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (surgeon) filter.surgeon = surgeon;
  if (date) {
    const d = new Date(date);
    filter.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }

  const bookings = await OTBooking.find(filter)
    .populate({ path: 'patient', select: 'patientId', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'surgeon', select: 'specialization', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'anesthesiologist', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ scheduledDate: 1 });

  res.json({ success: true, data: bookings });
};

exports.createBooking = async (req, res) => {
  // Check OT room availability
  const conflict = await OTBooking.findOne({
    otRoom: req.body.otRoom,
    scheduledDate: new Date(req.body.scheduledDate),
    status: { $in: ['scheduled', 'in-progress'] }
  });
  if (conflict) return res.status(409).json({ success: false, message: 'OT room already booked for this time' });

  const booking = await OTBooking.create(req.body);
  await OTRoom.findOneAndUpdate({ roomNumber: booking.otRoom }, { status: 'in-use' });
  res.status(201).json({ success: true, data: booking });
};

exports.updateBooking = async (req, res) => {
  const booking = await OTBooking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  // Free OT room when completed/cancelled
  if (['completed', 'cancelled'].includes(booking.status)) {
    await OTRoom.findOneAndUpdate({ roomNumber: booking.otRoom }, { status: 'cleaning' });
  }
  res.json({ success: true, data: booking });
};

exports.getTodaySchedule = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const schedule = await OTBooking.find({
    scheduledDate: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  })
    .populate({ path: 'patient', select: 'patientId', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'surgeon', select: 'specialization', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'anesthesiologist', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ startTime: 1 });

  res.json({ success: true, data: schedule });
};
