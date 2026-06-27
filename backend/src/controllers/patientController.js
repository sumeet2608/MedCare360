const Patient = require('../models/Patient');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { createAutoBilling } = require('../services/billingService');
const { publish } = require('../utils/events');
const { withCache } = require('../utils/cache');

exports.getAllPatients = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const query = { isArchived: { $ne: true } }; // archived patients hidden from active lists
  if (req.query.search) {
    query['$or'] = [{ patientId: { $regex: req.query.search, $options: 'i' } }];
  }
  if (req.query.isAdmitted !== undefined) {
    query.isAdmitted = req.query.isAdmitted === 'true';
  }
  if (req.query.includeArchived === 'true') delete query.isArchived;

  // Cache list (no search filter, page 1) for 60 seconds
  const cacheKey = `patients:list:p${page}:l${limit}`;
  const shouldCache = !req.query.search && !req.query.isAdmitted;

  if (shouldCache) {
    return withCache(req, res, cacheKey, 60, async () => {
      const [patients, total] = await Promise.all([
        Patient.find(query).populate('user', 'firstName lastName email phone avatar').populate('attendingDoctor').skip(skip).limit(limit).sort({ createdAt: -1 }),
        Patient.countDocuments(query)
      ]);
      return { success: true, count: patients.length, total, pages: Math.ceil(total / limit), currentPage: page, data: patients };
    });
  }

  const [patients, total] = await Promise.all([
    Patient.find(query).populate('user', 'firstName lastName email phone avatar').populate('attendingDoctor').skip(skip).limit(limit).sort({ createdAt: -1 }),
    Patient.countDocuments(query)
  ]);
  res.json({ success: true, count: patients.length, total, pages: Math.ceil(total / limit), currentPage: page, data: patients });
});

exports.getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('attendingDoctor')
    .populate('registeredBy', 'firstName lastName');

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.json({ success: true, data: patient });
});

exports.createPatient = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, ...patientData } = req.body;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName, lastName, email, phone,
      password: password || `Medcare@${Date.now()}`,
      role: 'patient'
    });
  }

  const patient = await Patient.create({
    ...patientData,
    user: user._id,
    registeredBy: req.user._id
  });

  await patient.populate('user', 'firstName lastName email phone');

  // Invalidate patient list cache after new registration
  try {
    const redis = req.app?.get('redis');
    if (redis) await redis.del('patients:list:p1:l20');
  } catch (_) {}

  // Auto-generate registration fee billing
  try {
    const name = `${patient.user?.firstName || ''} ${patient.user?.lastName || ''}`.trim();
    await createAutoBilling({
      patientId: patient._id,
      generatedBy: req.user._id,
      items: [{
        description: `Patient Registration Fee — ${name}`,
        category: 'other',
        quantity: 1,
        unitPrice: 500
      }]
    });
  } catch (e) { /* billing failure is non-blocking */ }

  // Publish Kafka event
  publish(req.app, 'patients', 'patient.registered', {
    patientId: patient.patientId,
    userId: patient.user._id,
    name: `${patient.user.firstName} ${patient.user.lastName}`,
    registeredBy: req.user._id
  });

  res.status(201).json({ success: true, data: patient });
});

exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('user', 'firstName lastName email phone');

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.json({ success: true, data: patient });
});

exports.addVitals = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  patient.vitals.push({ ...req.body, recordedBy: req.user._id });
  await patient.save();
  res.json({ success: true, data: patient.vitals });
});

exports.addAllergy = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  patient.allergies.push(req.body);
  await patient.save();
  res.json({ success: true, data: patient.allergies });
});

exports.admitPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { isAdmitted: true, admissionDate: new Date(), ...req.body },
    { new: true }
  );
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.json({ success: true, data: patient, message: 'Patient admitted successfully' });
});

exports.dischargePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { isAdmitted: false, dischargeDate: new Date(), ward: null, bedNumber: null },
    { new: true }
  );
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.json({ success: true, data: patient, message: 'Patient discharged successfully' });
});

exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  await patient.deleteOne();
  res.json({ success: true, message: 'Patient record deleted' });
});
