'use strict';
/**
 * FHIR R4 Compatible Endpoints
 * Wraps existing MedCare360 data in HL7 FHIR R4 format.
 * Spec: https://hl7.org/fhir/R4/
 */
const router = require('express').Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');

const fhirMeta = (resourceType) => ({
  resourceType,
  meta: { versionId: '1', lastUpdated: new Date().toISOString(), profile: [`http://hl7.org/fhir/R4/StructureDefinition/${resourceType}`] }
});

// FHIR CapabilityStatement (no auth needed)
router.get('/metadata', (req, res) => {
  res.json({
    ...fhirMeta('CapabilityStatement'),
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'MedCare360 FHIR Gateway', version: '1.0.0' },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Appointment', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Practitioner', interaction: [{ code: 'read' }, { code: 'search-type' }] }
      ]
    }]
  });
});

router.use(protect);

// FHIR Patient resource
router.get('/Patient', async (req, res) => {
  try {
    const { _count = 20, name, birthdate } = req.query;
    const filter = {};
    if (name) filter.$or = [{ firstName: new RegExp(name, 'i') }, { lastName: new RegExp(name, 'i') }];
    if (birthdate) filter.dateOfBirth = new Date(birthdate);

    const patients = await Patient.find(filter).limit(parseInt(_count));
    const bundle = {
      ...fhirMeta('Bundle'),
      type: 'searchset',
      total: patients.length,
      entry: patients.map(p => ({
        fullUrl: `${req.protocol}://${req.get('host')}/fhir/Patient/${p._id}`,
        resource: patientToFhir(p)
      }))
    };
    res.set('Content-Type', 'application/fhir+json').json(bundle);
  } catch (err) {
    logger.error('FHIR Patient search error:', err.message);
    res.status(500).json(fhirOperationOutcome('error', err.message));
  }
});

router.get('/Patient/:id', async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json(fhirOperationOutcome('error', 'Patient not found'));
    res.set('Content-Type', 'application/fhir+json').json(patientToFhir(p));
  } catch (err) {
    res.status(500).json(fhirOperationOutcome('error', err.message));
  }
});

// FHIR Appointment resource
router.get('/Appointment', async (req, res) => {
  try {
    const { _count = 20, date, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) { const d = new Date(date); filter.appointmentDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) }; }

    const appts = await Appointment.find(filter).limit(parseInt(_count)).populate('patient', 'firstName lastName').populate('doctor', 'firstName lastName specialization');
    const bundle = {
      ...fhirMeta('Bundle'),
      type: 'searchset',
      total: appts.length,
      entry: appts.map(a => ({ fullUrl: `${req.protocol}://${req.get('host')}/fhir/Appointment/${a._id}`, resource: appointmentToFhir(a) }))
    };
    res.set('Content-Type', 'application/fhir+json').json(bundle);
  } catch (err) {
    res.status(500).json(fhirOperationOutcome('error', err.message));
  }
});

// ── Mappers ───────────────────────────────────────────────────
function patientToFhir(p) {
  return {
    resourceType: 'Patient',
    id: p._id.toString(),
    meta: { lastUpdated: p.updatedAt?.toISOString() },
    identifier: [{ system: 'https://medcare360.com/patient-id', value: p.patientId || p._id.toString() }],
    active: p.status !== 'inactive',
    name: [{ use: 'official', family: p.lastName, given: [p.firstName] }],
    telecom: [
      ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'mobile' }] : []),
      ...(p.email ? [{ system: 'email', value: p.email }] : [])
    ],
    gender: p.gender === 'male' ? 'male' : p.gender === 'female' ? 'female' : 'unknown',
    birthDate: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : undefined,
    address: p.address ? [{ text: [p.address.street, p.address.city, p.address.state].filter(Boolean).join(', '), city: p.address.city, state: p.address.state }] : [],
    maritalStatus: p.maritalStatus ? { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus', code: p.maritalStatus.toUpperCase()[0] }] } : undefined,
    extension: [
      { url: 'http://medcare360.com/fhir/StructureDefinition/blood-group', valueString: p.bloodGroup },
      { url: 'http://medcare360.com/fhir/StructureDefinition/patient-status', valueString: p.status }
    ]
  };
}

function appointmentToFhir(a) {
  const statusMap = { scheduled: 'booked', confirmed: 'booked', completed: 'fulfilled', cancelled: 'cancelled', 'no-show': 'noshow' };
  return {
    resourceType: 'Appointment',
    id: a._id.toString(),
    status: statusMap[a.status] || 'pending',
    serviceType: [{ coding: [{ code: a.type, display: a.type }] }],
    start: a.appointmentDate ? new Date(a.appointmentDate).toISOString() : undefined,
    participant: [
      ...(a.patient ? [{ actor: { reference: `Patient/${a.patient._id}`, display: `${a.patient.firstName} ${a.patient.lastName}` }, status: 'accepted' }] : []),
      ...(a.doctor ? [{ actor: { reference: `Practitioner/${a.doctor._id}`, display: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` }, status: 'accepted' }] : [])
    ],
    comment: a.reason
  };
}

function fhirOperationOutcome(severity, message) {
  return { resourceType: 'OperationOutcome', issue: [{ severity, code: 'processing', diagnostics: message }] };
}

module.exports = router;
