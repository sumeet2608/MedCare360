'use strict';
const router = require('express').Router();
const MedicalRecord = require('../models/MedicalRecord');
const SOAPNote      = require('../models/SOAPNote');
const Prescription  = require('../models/Prescription');
const ClinicalAuditLog = require('../models/ClinicalAuditLog');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

const auditLog = (req, action, resourceType, resourceId, description, extra = {}) => {
  ClinicalAuditLog.log({
    user: req.user._id, userRole: req.user.role, action, resourceType, resourceId,
    patientId: extra.patientId, description,
    ipAddress: req.ip, userAgent: req.get('user-agent'),
    metadata: extra
  });
};

// ── Medical Records ───────────────────────────────────────────────────────────

// GET /api/emr/records?patient=xxx&limit=20&page=1
router.get('/records', asyncHandler(async (req, res) => {
  const { patient, limit = 20, page = 1 } = req.query;
  const filter = patient ? { patient } : {};
  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .populate('patient', 'patientId user')
      .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('attendingDoctor')
      .populate({ path: 'attendingDoctor', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ 'encounter.date': -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    MedicalRecord.countDocuments(filter)
  ]);
  res.json({ success: true, data: records, total, page: Number(page), pages: Math.ceil(total / limit) });
}));

// GET /api/emr/records/:id
router.get('/records/:id', asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone dateOfBirth gender bloodGroup' } })
    .populate({ path: 'attendingDoctor', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('createdBy', 'firstName lastName role');
  if (!record) return res.status(404).json({ success: false, message: 'Medical record not found' });
  auditLog(req, 'READ', 'MedicalRecord', record._id, `Viewed medical record ${record.recordId}`, { patientId: record.patient._id });
  res.json({ success: true, data: record });
}));

// POST /api/emr/records
router.post('/records', authorize('doctor', 'nurse', 'super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const record = await MedicalRecord.create({ ...req.body, createdBy: req.user._id, lastModifiedBy: req.user._id });
  auditLog(req, 'CREATE', 'MedicalRecord', record._id, `Created medical record ${record.recordId}`, { patientId: record.patient });
  res.status(201).json({ success: true, data: record });
}));

// PUT /api/emr/records/:id
router.put('/records/:id', authorize('doctor', 'nurse', 'super_admin'), asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findByIdAndUpdate(
    req.params.id, { ...req.body, lastModifiedBy: req.user._id }, { new: true, runValidators: true }
  );
  if (!record) return res.status(404).json({ success: false, message: 'Medical record not found' });
  auditLog(req, 'UPDATE', 'MedicalRecord', record._id, `Updated medical record ${record.recordId}`, { patientId: record.patient });
  res.json({ success: true, data: record });
}));

// GET /api/emr/timeline/:patientId — full clinical timeline
router.get('/timeline/:patientId', asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const [records, notes, prescriptions] = await Promise.all([
    MedicalRecord.find({ patient: patientId })
      .populate({ path: 'attendingDoctor', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ 'encounter.date': -1 }).limit(50),
    SOAPNote.find({ patient: patientId })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ encounterDate: -1 }).limit(50),
    Prescription.find({ patient: patientId })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ createdAt: -1 }).limit(50)
  ]);

  const timeline = [
    ...records.map(r => ({ type: 'medical_record', date: r.encounter?.date || r.createdAt, data: r, id: r._id })),
    ...notes.map(n => ({ type: 'soap_note', date: n.encounterDate || n.createdAt, data: n, id: n._id })),
    ...prescriptions.map(p => ({ type: 'prescription', date: p.createdAt, data: p, id: p._id }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  auditLog(req, 'READ', 'Patient', patientId, `Viewed clinical timeline for patient ${patientId}`, { patientId });
  res.json({ success: true, data: timeline, total: timeline.length });
}));

// ── SOAP Notes ────────────────────────────────────────────────────────────────

// GET /api/emr/soap?patient=xxx
router.get('/soap', asyncHandler(async (req, res) => {
  const filter = req.query.patient ? { patient: req.query.patient } : {};
  const notes = await SOAPNote.find(filter)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ encounterDate: -1 }).limit(Number(req.query.limit) || 20);
  res.json({ success: true, data: notes, total: notes.length });
}));

// GET /api/emr/soap/:id
router.get('/soap/:id', asyncHandler(async (req, res) => {
  const note = await SOAPNote.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('signedBy', 'firstName lastName');
  if (!note) return res.status(404).json({ success: false, message: 'SOAP note not found' });
  auditLog(req, 'READ', 'SOAPNote', note._id, `Viewed SOAP note ${note.noteId}`, { patientId: note.patient });
  res.json({ success: true, data: note });
}));

// POST /api/emr/soap
router.post('/soap', authorize('doctor', 'super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const note = await SOAPNote.create(req.body);
  auditLog(req, 'CREATE', 'SOAPNote', note._id, `Created SOAP note ${note.noteId}`, { patientId: note.patient });
  res.status(201).json({ success: true, data: note });
}));

// PUT /api/emr/soap/:id
router.put('/soap/:id', authorize('doctor', 'super_admin'), asyncHandler(async (req, res) => {
  const note = await SOAPNote.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!note) return res.status(404).json({ success: false, message: 'SOAP note not found' });
  res.json({ success: true, data: note });
}));

// PATCH /api/emr/soap/:id/sign
router.patch('/soap/:id/sign', authorize('doctor', 'super_admin'), asyncHandler(async (req, res) => {
  const note = await SOAPNote.findByIdAndUpdate(
    req.params.id, { status: 'signed', signedAt: new Date(), signedBy: req.user._id }, { new: true }
  );
  if (!note) return res.status(404).json({ success: false, message: 'SOAP note not found' });
  auditLog(req, 'SIGN', 'SOAPNote', note._id, `Signed SOAP note ${note.noteId}`, { patientId: note.patient });
  res.json({ success: true, data: note });
}));

// ── Prescriptions ─────────────────────────────────────────────────────────────

// GET /api/emr/prescriptions?patient=xxx
router.get('/prescriptions', asyncHandler(async (req, res) => {
  const filter = req.query.patient ? { patient: req.query.patient } : {};
  if (req.query.status) filter.status = req.query.status;
  const rxList = await Prescription.find(filter)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ createdAt: -1 }).limit(Number(req.query.limit) || 30);
  res.json({ success: true, data: rxList, total: rxList.length });
}));

// GET /api/emr/prescriptions/:id
router.get('/prescriptions/:id', asyncHandler(async (req, res) => {
  const rx = await Prescription.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName dateOfBirth' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } });
  if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
  auditLog(req, 'READ', 'Prescription', rx._id, `Viewed prescription ${rx.prescriptionId}`, { patientId: rx.patient });
  res.json({ success: true, data: rx });
}));

// POST /api/emr/prescriptions
router.post('/prescriptions', authorize('doctor', 'super_admin'), asyncHandler(async (req, res) => {
  const rx = await Prescription.create(req.body);
  auditLog(req, 'PRESCRIBE', 'Prescription', rx._id, `Created prescription ${rx.prescriptionId} with ${rx.medications.length} medication(s)`, { patientId: rx.patient });
  res.status(201).json({ success: true, data: rx });
}));

// PATCH /api/emr/prescriptions/:id/dispense
router.patch('/prescriptions/:id/dispense', authorize('pharmacist', 'super_admin'), asyncHandler(async (req, res) => {
  const rx = await Prescription.findByIdAndUpdate(
    req.params.id, { status: 'dispensed', dispensedAt: new Date(), dispensedBy: req.user._id, pharmacyNotes: req.body.notes },
    { new: true }
  );
  if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
  auditLog(req, 'UPDATE', 'Prescription', rx._id, `Dispensed prescription ${rx.prescriptionId}`, { patientId: rx.patient });
  res.json({ success: true, data: rx });
}));

// ── ICD-10 Search ─────────────────────────────────────────────────────────────
// Built-in common ICD-10 codes — no external API needed
const ICD10_CODES = [
  { code: 'J00', description: 'Acute nasopharyngitis [common cold]', category: 'Respiratory' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Respiratory' },
  { code: 'J45.9', description: 'Asthma, unspecified', category: 'Respiratory' },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
  { code: 'I25.9', description: 'Chronic ischemic heart disease, unspecified', category: 'Cardiovascular' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', category: 'Cardiovascular' },
  { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Cardiovascular' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified', category: 'Cardiovascular' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Endocrine' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrine' },
  { code: 'E05.9', description: 'Thyrotoxicosis, unspecified', category: 'Endocrine' },
  { code: 'E06.3', description: 'Autoimmune thyroiditis (Hashimoto)', category: 'Endocrine' },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', category: 'Gastrointestinal' },
  { code: 'K29.7', description: 'Gastritis, unspecified', category: 'Gastrointestinal' },
  { code: 'K80.2', description: 'Calculus of gallbladder without cholecystitis', category: 'Gastrointestinal' },
  { code: 'K70.3', description: 'Alcoholic cirrhosis of liver', category: 'Gastrointestinal' },
  { code: 'K74.6', description: 'Other and unspecified cirrhosis of liver', category: 'Gastrointestinal' },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', category: 'Renal' },
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3', category: 'Renal' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Renal' },
  { code: 'M79.3', description: 'Panniculitis, unspecified', category: 'Musculoskeletal' },
  { code: 'M10.9', description: 'Gout, unspecified', category: 'Musculoskeletal' },
  { code: 'M05.9', description: 'Rheumatoid arthritis with rheumatoid factor, unspecified', category: 'Musculoskeletal' },
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified', category: 'Hematology' },
  { code: 'D51.9', description: 'Vitamin B12 deficiency anemia, unspecified', category: 'Hematology' },
  { code: 'D64.9', description: 'Anemia, unspecified', category: 'Hematology' },
  { code: 'D69.3', description: 'Immune thrombocytopenic purpura (ITP)', category: 'Hematology' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', category: 'Infectious' },
  { code: 'B24', description: 'Human immunodeficiency virus [HIV] disease', category: 'Infectious' },
  { code: 'A15.0', description: 'Tuberculosis of lung', category: 'Infectious' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Mental Health' },
  { code: 'G43.9', description: 'Migraine, unspecified', category: 'Neurological' },
  { code: 'G40.9', description: 'Epilepsy, unspecified', category: 'Neurological' },
  { code: 'Z00.00', description: 'Encounter for general adult medical examination', category: 'Preventive' },
  { code: 'Z23', description: 'Encounter for immunization', category: 'Preventive' }
];

router.get('/icd10/search', asyncHandler(async (req, res) => {
  const { q = '', category } = req.query;
  const query = q.toLowerCase();
  let results = ICD10_CODES.filter(c =>
    c.code.toLowerCase().includes(query) ||
    c.description.toLowerCase().includes(query)
  );
  if (category) results = results.filter(c => c.category === category);
  res.json({ success: true, data: results.slice(0, 20), total: results.length });
}));

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', authorize('super_admin', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { patient, user, action, limit = 50, page = 1 } = req.query;
  const filter = {};
  if (patient) filter.patientId = patient;
  if (user) filter.user = user;
  if (action) filter.action = action;
  const [logs, total] = await Promise.all([
    ClinicalAuditLog.find(filter).populate('user', 'firstName lastName role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    ClinicalAuditLog.countDocuments(filter)
  ]);
  res.json({ success: true, data: logs, total, page: Number(page) });
}));

module.exports = router;
