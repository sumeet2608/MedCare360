const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Staff = require('../models/Staff');
const { asyncHandler } = require('../middleware/errorHandler');

// Public — used by the login page doctor-picker before any token exists.
// Returns only non-sensitive fields: name, email, specialization.
exports.getPublicDoctorList = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ status: { $ne: 'inactive' } })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  const data = doctors
    .filter(d => d.user)
    .map(d => ({
      name: `Dr. ${d.user.firstName} ${d.user.lastName}`.trim(),
      email: d.user.email,
      specialization: d.specialization || 'General Practice',
    }));

  res.json({ success: true, data });
});

exports.getAllDoctors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.specialization) query.specialization = { $regex: req.query.specialization, $options: 'i' };
  if (req.query.status) query.status = req.query.status;

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      .populate('user', 'firstName lastName email phone avatar')
      .populate({ path: 'assignedStaff', populate: { path: 'user', select: 'firstName lastName' } })
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Doctor.countDocuments(query)
  ]);

  res.json({ success: true, count: doctors.length, total, pages: Math.ceil(total / limit), currentPage: page, data: doctors });
});

// GET /api/doctors/:id/staff — get staff assigned to a doctor
exports.getDoctorStaff = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate({ path: 'assignedStaff', populate: { path: 'user', select: 'firstName lastName email phone' } });
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: doctor.assignedStaff || [] });
});

// POST /api/doctors/:id/staff — assign a staff member to a doctor
exports.assignStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  const [doctor, staff] = await Promise.all([
    Doctor.findById(req.params.id),
    Staff.findById(staffId)
  ]);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  if (!staff)  return res.status(404).json({ success: false, message: 'Staff member not found' });
  if (doctor.assignedStaff.includes(staffId))
    return res.status(400).json({ success: false, message: 'Staff already assigned to this doctor' });

  doctor.assignedStaff.push(staffId);
  await doctor.save();
  await doctor.populate({ path: 'assignedStaff', populate: { path: 'user', select: 'firstName lastName' } });
  res.json({ success: true, data: doctor.assignedStaff, message: 'Staff assigned successfully' });
});

// DELETE /api/doctors/:id/staff/:staffId — remove staff from doctor
exports.removeStaff = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  doctor.assignedStaff = doctor.assignedStaff.filter(s => s.toString() !== req.params.staffId);
  await doctor.save();
  res.json({ success: true, message: 'Staff removed from doctor' });
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('user', 'firstName lastName email phone avatar');
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: doctor });
});

exports.createDoctor = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, ...doctorData } = req.body;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName, lastName, email, phone,
      password: password || `Doctor@${Date.now()}`,
      role: 'doctor'
    });
  }

  const doctor = await Doctor.create({ ...doctorData, user: user._id });
  await doctor.populate('user', 'firstName lastName email phone');
  res.status(201).json({ success: true, data: doctor });
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true
  }).populate('user', 'firstName lastName email phone');
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: doctor });
});

exports.getDoctorSchedule = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).select('schedule');
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: doctor.schedule });
});

exports.updateSchedule = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id, { schedule: req.body.schedule }, { new: true }
  );
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: doctor.schedule });
});

exports.getDoctorAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const daySchedule = doctor.schedule.find(s => s.day === dayName && s.isAvailable);

  if (!daySchedule) {
    return res.json({ success: true, available: false, slots: [] });
  }

  const bookedAppointments = await Appointment.find({
    doctor: req.params.id,
    appointmentDate: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) },
    status: { $nin: ['cancelled', 'no_show'] }
  }).select('appointmentTime');

  const bookedTimes = bookedAppointments.map(a => a.appointmentTime);
  const slots = generateTimeSlots(daySchedule.startTime, daySchedule.endTime, 30);
  const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));

  res.json({ success: true, available: true, slots: availableSlots, bookedSlots: bookedTimes });
});

function generateTimeSlots(start, end, intervalMinutes) {
  const slots = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h < eh || (h === eh && m < em)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += intervalMinutes;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

exports.deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  await doctor.deleteOne();
  res.json({ success: true, message: 'Doctor record deleted' });
});
