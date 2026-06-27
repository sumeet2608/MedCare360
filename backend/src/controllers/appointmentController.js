const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const { notify } = require('../services/notificationService');
const { createAutoBilling } = require('../services/billingService');
const { publish } = require('../utils/events');

exports.getAllAppointments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.date) {
    const d = new Date(req.query.date);
    query.appointmentDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }
  if (req.query.doctor) query.doctor = req.query.doctor;
  if (req.query.patient) query.patient = req.query.patient;

  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (doctor) query.doctor = doctor._id;
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    if (patient) query.patient = patient._id;
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .skip(skip).limit(limit).sort({ appointmentDate: 1, appointmentTime: 1 }),
    Appointment.countDocuments(query)
  ]);

  res.json({ success: true, count: appointments.length, total, pages: Math.ceil(total / limit), currentPage: page, data: appointments });
});

exports.getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } });
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
  res.json({ success: true, data: appointment });
});

exports.createAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.create({ ...req.body, createdBy: req.user._id });
  await appointment.populate([
    { path: 'patient', populate: { path: 'user', select: 'firstName lastName email' } },
    { path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } }
  ]);

  try {
    await emailService.sendAppointmentConfirmation(appointment);
  } catch (e) { /* non-blocking */ }

  try {
    await notify(req.app, {
      recipient: appointment.doctor?.user?._id,
      type: 'appointment',
      title: 'New appointment booked',
      message: `${appointment.patient?.user?.firstName || 'A patient'} booked an appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime}`,
      relatedId: appointment._id
    });
  } catch (e) { /* notification failure is non-blocking */ }

  // Auto-generate consultation billing
  try {
    const doctor = await Doctor.findById(appointment.doctor).populate('user', 'firstName lastName specialization');
    const fee = doctor?.consultationFee || 1296;
    const docName = doctor?.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : 'Doctor';
    const spec = doctor?.specialization || 'General';
    const patient = await Patient.findById(appointment.patient);
    if (patient) {
      await createAutoBilling({
        patientId: patient._id,
        appointmentId: appointment._id,
        generatedBy: req.user._id,
        items: [{
          description: `Consultation — ${docName} (${spec}) on ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN')}`,
          category: 'consultation',
          quantity: 1,
          unitPrice: fee
        }]
      });
    }
  } catch (e) { /* billing failure is non-blocking */ }

  // Publish Kafka event
  publish(req.app, 'appointments', 'appointment.created', {
    appointmentId: appointment.appointmentId,
    patientId: appointment.patient?._id,
    doctorId: appointment.doctor?._id,
    date: appointment.appointmentDate,
    type: appointment.type,
    status: appointment.status
  });

  res.status(201).json({ success: true, data: appointment });
});

exports.updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true
  });
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
  res.json({ success: true, data: appointment });
});

exports.cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled', cancelledBy: req.user._id, cancellationReason: req.body.reason },
    { new: true }
  ).populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } });
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  try {
    await notify(req.app, {
      recipient: appointment.patient?.user?._id,
      type: 'appointment',
      title: 'Appointment cancelled',
      message: `Your appointment ${appointment.appointmentId} was cancelled${req.body.reason ? ': ' + req.body.reason : ''}`,
      priority: 'high',
      relatedId: appointment._id
    });
  } catch (e) { /* non-blocking */ }

  publish(req.app, 'appointments', 'appointment.cancelled', {
    appointmentId: appointment.appointmentId,
    reason: req.body.reason,
    cancelledBy: req.user._id
  });

  res.json({ success: true, data: appointment, message: 'Appointment cancelled successfully' });
});

exports.getTodayAppointments = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const query = {
    appointmentDate: { $gte: today, $lt: tomorrow },
    status: { $nin: ['cancelled'] }
  };

  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (doctor) query.doctor = doctor._id;
  }

  const appointments = await Appointment.find(query)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ appointmentTime: 1 });

  res.json({ success: true, count: appointments.length, data: appointments });
});
