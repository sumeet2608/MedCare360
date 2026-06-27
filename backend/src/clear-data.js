require('dotenv').config();
const mongoose = require('mongoose');

const User        = require('./models/User');
const Patient     = require('./models/Patient');
const Appointment = require('./models/Appointment');
const Ambulance   = require('./models/Ambulance');

const KEEP_ROLES = ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'ambulance_staff'];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB Connected');

  // Remove all patient users (keep admins, doctors, staff)
  const { deletedCount: usersDel } = await User.deleteMany({ role: 'patient' });
  console.log(`🗑️  Deleted ${usersDel} patient user accounts`);

  const { deletedCount: patientsDel } = await Patient.deleteMany({});
  console.log(`🗑️  Deleted ${patientsDel} patient records`);

  const { deletedCount: apptDel } = await Appointment.deleteMany({});
  console.log(`🗑️  Deleted ${apptDel} appointments`);

  const { deletedCount: ambulanceDel } = await Ambulance.deleteMany({});
  console.log(`🗑️  Deleted ${ambulanceDel} ambulance records`);

  console.log('✅ Done — DB is clean. Patients, appointments, and ambulances cleared.');
  await mongoose.disconnect();
};

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
