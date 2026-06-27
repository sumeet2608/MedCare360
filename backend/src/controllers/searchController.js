const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Medicine = require('../models/Medicine');
const Appointment = require('../models/Appointment');
const Inventory = require('../models/Inventory');
const LabTest = require('../models/LabTest');
const Ambulance = require('../models/Ambulance');
const Staff = require('../models/Staff');
const { asyncHandler } = require('../middleware/errorHandler');

exports.globalSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: {} });

  const rx = { $regex: q, $options: 'i' };

  const [patients, doctors, medicines, appointments, inventory, labTests, ambulances, staff] = await Promise.all([
    Patient.find({ patientId: rx }).populate('user', 'firstName lastName email').limit(6),
    Doctor.find({ $or: [{ specialization: rx }, { doctorId: rx }] }).populate('user', 'firstName lastName email').limit(6),
    Medicine.find({ isActive: true, $or: [{ name: rx }, { genericName: rx }, { brand: rx }] }).limit(6),
    Appointment.find({ appointmentId: rx }).populate('patient', 'patientId').populate('doctor', 'specialization').limit(6),
    Inventory.find({ isActive: true, name: rx }).limit(6),
    LabTest.find({ $or: [{ testName: rx }, { testId: rx }] }).limit(6),
    Ambulance.find({ vehicleNumber: rx }).limit(6),
    Staff.find({ $or: [{ staffId: rx }, { department: rx }, { designation: rx }] }).populate('user', 'firstName lastName').limit(6)
  ]);

  // Patient/doctor names live on the linked User doc, so also search by name and merge (dedup by _id).
  const [patientsByName, doctorsByName, staffByName] = await Promise.all([
    Patient.find().populate({ path: 'user', match: { $or: [{ firstName: rx }, { lastName: rx }] }, select: 'firstName lastName email' }).limit(20).then(rows => rows.filter(r => r.user)),
    Doctor.find().populate({ path: 'user', match: { $or: [{ firstName: rx }, { lastName: rx }] }, select: 'firstName lastName email' }).limit(20).then(rows => rows.filter(r => r.user)),
    Staff.find().populate({ path: 'user', match: { $or: [{ firstName: rx }, { lastName: rx }] }, select: 'firstName lastName' }).limit(20).then(rows => rows.filter(r => r.user))
  ]);

  const dedup = (a, b) => {
    const seen = new Set(a.map(x => String(x._id)));
    return [...a, ...b.filter(x => !seen.has(String(x._id)))].slice(0, 6);
  };

  res.json({
    success: true,
    data: {
      patients: dedup(patients, patientsByName).map(p => ({ id: p._id, label: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(), sub: p.patientId, route: ['/patients', p._id] })),
      doctors: dedup(doctors, doctorsByName).map(d => ({ id: d._id, label: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim(), sub: d.specialization, route: ['/doctors', d._id] })),
      medicines: medicines.map(m => ({ id: m._id, label: m.name, sub: m.genericName, route: ['/pharmacy', m._id] })),
      appointments: appointments.map(a => ({ id: a._id, label: a.appointmentId, sub: a.doctor?.specialization || '', route: ['/appointments'] })),
      inventory: inventory.map(i => ({ id: i._id, label: i.name, sub: i.category, route: ['/inventory'] })),
      labTests: labTests.map(t => ({ id: t._id, label: t.testName, sub: t.testId, route: ['/lab'] })),
      ambulances: ambulances.map(a => ({ id: a._id, label: a.vehicleNumber, sub: a.status, route: ['/ambulance'] })),
      staff: dedup(staff, staffByName).map(s => ({ id: s._id, label: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(), sub: s.designation, route: ['/staff'] }))
    }
  });
});
