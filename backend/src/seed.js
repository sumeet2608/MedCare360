require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Staff = require('./models/Staff');
const Medicine = require('./models/Medicine');
const Inventory = require('./models/Inventory');
const Appointment = require('./models/Appointment');
const LabTest = require('./models/LabTest');
const Ambulance = require('./models/Ambulance');
const Hospital = require('./models/Hospital');
const Bed = require('./models/Bed');
const Billing = require('./models/Billing');
const { Donor, BloodUnit, BloodRequest } = require('./models/BloodBank');
const { OTRoom, OTBooking } = require('./models/OperationTheater');

const {
  maleFirstNames, femaleFirstNames, lastNames, citiesIndia, streetNames,
  specializations, languagesPool, manufacturers, baseMedicines, equipmentTemplates,
  labTestCatalog, chronicConditionsList, allergensList, bloodGroups
} = require('./seed/fixtures');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB Connected');
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (daysFromNow) => new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
const padId = (prefix, n, width) => `${prefix}${String(n).padStart(width, '0')}`;

let personCounter = 0;
function makePerson(role, password) {
  personCounter++;
  const isFemale = Math.random() < 0.5;
  const first = pick(isFemale ? femaleFirstNames : maleFirstNames);
  const last = pick(lastNames);
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${personCounter}@medcare360.com`;
  const phone = `9${String(100000000 + personCounter).padStart(9, '0').slice(0, 9)}`;
  return {
    gender: isFemale ? 'female' : 'male',
    first, last,
    userObj: { firstName: first, lastName: last, email, password, role, phone }
  };
}

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}), Patient.deleteMany({}), Doctor.deleteMany({}), Staff.deleteMany({}),
    Medicine.deleteMany({}), Inventory.deleteMany({}), Appointment.deleteMany({}), LabTest.deleteMany({}),
    Ambulance.deleteMany({}), Hospital.deleteMany({}), Bed.deleteMany({}),
    Donor.deleteMany({}), BloodUnit.deleteMany({}), BloodRequest.deleteMany({}),
    OTRoom.deleteMany({}), OTBooking.deleteMany({}), Billing.deleteMany({})
  ]);
  console.log('🗑️  Cleared existing data');

  // ─── HOSPITAL + 15 DEPARTMENTS ──────────────────────────────────────────
  const hospital = await Hospital.create({
    name: 'MedCare 360 Multi-Specialty Hospital',
    code: 'MC360',
    type: 'general',
    address: { street: '1 Healthway Boulevard', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' },
    contact: { phone: '02212345678', email: 'contact@medcare360.com', website: 'https://medcare360.com' },
    beds: { total: 200, icu: 30, emergency: 20 },
    departments: specializations.map(s => ({ name: s.name, head: 'TBD', extension: String(randInt(100, 999)) })),
    accreditation: { body: 'NABH', number: 'NABH-2024-0451', validUntil: new Date('2027-12-31') }
  });
  console.log('✅ Created hospital with 15 departments');

  // ─── USERS ───────────────────────────────────────────────────────────────
  const HASH_ROUNDS = 10;
  const hash = (pw) => bcrypt.hashSync(pw, HASH_ROUNDS);

  const explicitUsers = [
    { firstName: 'Super', lastName: 'Admin', email: 'admin@medcare360.com', password: hash('Admin@1234'), role: 'super_admin', phone: '9000000001' },
    { firstName: 'Hospital', lastName: 'Admin', email: 'hospitaladmin@medcare360.com', password: hash('Admin@1234'), role: 'hospital_admin', phone: '9000000002' },
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'doctor@medcare360.com', password: hash('Doctor@1234'), role: 'doctor', phone: '9000000003' },
    { firstName: 'Priya', lastName: 'Sharma', email: 'doctor2@medcare360.com', password: hash('Doctor@1234'), role: 'doctor', phone: '9000000004' },
    { firstName: 'Arun', lastName: 'Mehta', email: 'doctor3@medcare360.com', password: hash('Doctor@1234'), role: 'doctor', phone: '9000000005' },
    { firstName: 'Sunita', lastName: 'Patel', email: 'nurse@medcare360.com', password: hash('Nurse@1234'), role: 'nurse', phone: '9000000006' },
    { firstName: 'Kavitha', lastName: 'Rao', email: 'nurse2@medcare360.com', password: hash('Nurse@1234'), role: 'nurse', phone: '9000000007' },
    { firstName: 'Anita', lastName: 'Joshi', email: 'receptionist@medcare360.com', password: hash('Reception@1234'), role: 'receptionist', phone: '9000000008' },
    { firstName: 'Vikram', lastName: 'Singh', email: 'pharmacist@medcare360.com', password: hash('Pharma@1234'), role: 'pharmacist', phone: '9000000009' },
    { firstName: 'Deepa', lastName: 'Nair', email: 'lab@medcare360.com', password: hash('Lab@1234'), role: 'lab_technician', phone: '9000000010' },
    { firstName: 'Ravi', lastName: 'Verma', email: 'ambulance@medcare360.com', password: hash('Ambu@1234'), role: 'ambulance_staff', phone: '9000000011' },
    { firstName: 'Amit', lastName: 'Shah', email: 'patient@medcare360.com', password: hash('Patient@1234'), role: 'patient', phone: '9000000012' },
    { firstName: 'Meena', lastName: 'Gupta', email: 'patient2@medcare360.com', password: hash('Patient@1234'), role: 'patient', phone: '9000000013' },
    { firstName: 'Suresh', lastName: 'Pillai', email: 'patient3@medcare360.com', password: hash('Patient@1234'), role: 'patient', phone: '9000000014' },
  ];

  const bulkDoctorPeople = Array.from({ length: 47 }, () => makePerson('doctor', hash('Doctor@1234')));
  const staffRoleCycle = ['nurse', 'nurse', 'nurse', 'nurse', 'nurse', 'receptionist', 'receptionist', 'receptionist', 'pharmacist', 'pharmacist', 'lab_technician', 'lab_technician', 'ambulance_staff', 'ambulance_staff'];
  const bulkStaffPeople = staffRoleCycle.map(role => makePerson(role, hash('Staff@1234')));
  const bulkPatientPeople = Array.from({ length: 497 }, () => makePerson('patient', hash('Patient@1234')));

  const allUserDocs = [
    ...explicitUsers,
    ...bulkDoctorPeople.map(p => p.userObj),
    ...bulkStaffPeople.map(p => p.userObj),
    ...bulkPatientPeople.map(p => p.userObj)
  ];

  const createdUsers = await User.insertMany(allUserDocs);
  console.log(`✅ Created ${createdUsers.length} users`);

  let offset = 0;
  const explicitCreated = createdUsers.slice(offset, offset += explicitUsers.length);
  const bulkDoctorCreated = createdUsers.slice(offset, offset += bulkDoctorPeople.length);
  const bulkStaffCreated = createdUsers.slice(offset, offset += bulkStaffPeople.length);
  const bulkPatientCreated = createdUsers.slice(offset, offset += bulkPatientPeople.length);

  const doctorUsers = [...explicitCreated.slice(2, 5), ...bulkDoctorCreated];           // 50
  const staffUsers = [...explicitCreated.slice(5, 11), ...bulkStaffCreated];            // 20
  const patientUsers = [...explicitCreated.slice(11, 14), ...bulkPatientCreated];       // 500
  const ambulanceStaffUsers = staffUsers.filter((u, i) =>
    (i < 6 ? explicitUsers[5 + i]?.role === 'ambulance_staff' : staffRoleCycle[i - 6] === 'ambulance_staff')
  );

  // ─── DOCTORS (50 across 15 specializations) ────────────────────────────
  const explicitDoctorSpecs = [
    { specialization: 'Cardiology', qualification: ['MBBS', 'MD (Cardiology)'], experience: 12, licenseNumber: 'MCI-2012-00001', fee: 800, bio: 'Experienced cardiologist specializing in interventional cardiology and heart failure management.', languages: ['English', 'Hindi', 'Marathi'] },
    { specialization: 'Pediatrics', qualification: ['MBBS', 'MD (Pediatrics)'], experience: 8, licenseNumber: 'MCI-2016-00002', fee: 600, bio: 'Dedicated pediatrician with expertise in child health and development.', languages: ['English', 'Hindi', 'Telugu'] },
    { specialization: 'Orthopedics', qualification: ['MBBS', 'MS (Orthopedics)'], experience: 15, licenseNumber: 'MCI-2009-00003', fee: 1000, bio: 'Expert orthopedic surgeon specializing in joint replacement and sports injuries.', languages: ['English', 'Hindi', 'Gujarati'] },
  ];

  const doctorDocs = explicitDoctorSpecs.map((d, i) => ({
    doctorId: padId('DOC', i + 1, 5),
    user: doctorUsers[i]._id,
    specialization: d.specialization,
    photo: `https://i.pravatar.cc/300?img=${i + 11}`,
    qualification: d.qualification,
    licenseNumber: d.licenseNumber,
    experience: d.experience,
    department: d.specialization,
    consultationFee: d.fee,
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '13:00', maxPatients: 15 },
      { day: 'Wednesday', startTime: '09:00', endTime: '13:00', maxPatients: 15 },
      { day: 'Friday', startTime: '14:00', endTime: '18:00', maxPatients: 15 },
    ],
    bio: d.bio,
    languages: d.languages,
    rating: 4.6,
    totalRatings: randInt(80, 400),
    isAvailableForEmergency: i === 0,
    hospitalId: hospital._id,
    status: 'active'
  }));

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 3; i < 50; i++) {
    const spec = specializations[i % specializations.length];
    const experience = randInt(3, 28);
    const days = pickN(dayOptions, randInt(2, 3)).sort();
    doctorDocs.push({
      doctorId: padId('DOC', i + 1, 5),
      user: doctorUsers[i]._id,
      specialization: spec.name,
      photo: `https://i.pravatar.cc/300?img=${(i % 70) + 1}`,
      qualification: [spec.qualification],
      licenseNumber: `MCI-${2000 + randInt(0, 23)}-${padId('', i + 1, 5)}`,
      experience,
      department: spec.name,
      consultationFee: randInt(spec.feeRange[0], spec.feeRange[1]),
      schedule: days.map(day => ({ day, startTime: pick(['09:00', '10:00', '14:00']), endTime: pick(['13:00', '17:00', '18:00']), maxPatients: randInt(10, 20) })),
      bio: `Experienced ${spec.name.toLowerCase()} specialist with ${experience} years of clinical practice.`,
      languages: pickN(languagesPool, randInt(2, 4)),
      rating: Number((Math.random() * 1.5 + 3.5).toFixed(1)),
      totalRatings: randInt(15, 480),
      isAvailableForEmergency: Math.random() < 0.25,
      hospitalId: hospital._id,
      status: 'active'
    });
  }

  const createdDoctors = await Doctor.insertMany(doctorDocs);
  console.log(`✅ Created ${createdDoctors.length} doctors across ${specializations.length} specializations`);

  // ─── PATIENTS (500) ──────────────────────────────────────────────────────
  const explicitPatientSpecs = [
    { dateOfBirth: new Date('1990-05-15'), gender: 'male', bloodGroup: 'O+', city: { city: 'Mumbai', state: 'Maharashtra', pincodePrefix: '4000' }, street: '123 MG Road' },
    { dateOfBirth: new Date('1985-08-22'), gender: 'female', bloodGroup: 'B+', city: { city: 'Delhi', state: 'Delhi', pincodePrefix: '1100' }, street: '45 Park Street' },
    { dateOfBirth: new Date('1975-12-10'), gender: 'male', bloodGroup: 'A+', city: { city: 'Chennai', state: 'Tamil Nadu', pincodePrefix: '6000' }, street: '78 Anna Nagar' },
  ];

  const patientDocs = explicitPatientSpecs.map((p, i) => ({
    patientId: padId('PAT', i + 1, 6),
    user: patientUsers[i]._id,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    address: { street: p.street, city: p.city.city, state: p.city.state, zipCode: `${p.city.pincodePrefix}01`, country: 'India' },
    emergencyContact: { name: `${pick(lastNames)} Relative`, relationship: pick(['Spouse', 'Parent', 'Sibling']), phone: `91111111${i + 10}` },
    allergies: [{ allergen: pick(allergensList), reaction: 'Rash', severity: pick(['mild', 'moderate']) }],
    chronicConditions: pickN(chronicConditionsList, randInt(0, 1)),
    vitals: [{ bloodPressure: `${randInt(110, 140)}/${randInt(70, 90)}`, heartRate: randInt(65, 95), temperature: 98.4, weight: randInt(55, 90), height: randInt(155, 185), oxygenSaturation: randInt(95, 99), recordedAt: new Date() }],
    insurance: { provider: 'Star Health', policyNumber: `SH2024${padId('', i + 1, 3)}`, expiryDate: new Date('2026-12-31') },
    attendingDoctor: createdDoctors[i % createdDoctors.length]._id
  }));

  for (let i = 3; i < 500; i++) {
    const person = patientUsers[i];
    const meta = bulkPatientPeople[i - 3];
    const loc = pick(citiesIndia);
    const dob = new Date(randInt(1945, 2018), randInt(0, 11), randInt(1, 28));
    patientDocs.push({
      patientId: padId('PAT', i + 1, 6),
      user: person._id,
      dateOfBirth: dob,
      gender: meta.gender,
      bloodGroup: pick(bloodGroups),
      address: { street: `${randInt(1, 200)} ${pick(streetNames)}`, city: loc.city, state: loc.state, zipCode: `${loc.pincodePrefix}${randInt(10, 99)}`, country: 'India' },
      emergencyContact: { name: `${pick(meta.gender === 'female' ? maleFirstNames : femaleFirstNames)} ${meta.last}`, relationship: pick(['Spouse', 'Parent', 'Sibling', 'Child']), phone: `9${randInt(100000000, 999999999)}` },
      insurance: Math.random() < 0.7 ? { provider: pick(['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Niva Bupa', 'Care Health']), policyNumber: `POL${randInt(100000, 999999)}`, expiryDate: randomDate(randInt(60, 700)) } : undefined,
      allergies: pickN(allergensList, randInt(0, 2)).map(a => ({ allergen: a, reaction: pick(['Rash', 'Swelling', 'Itching', 'Breathing difficulty']), severity: pick(['mild', 'moderate', 'severe']) })),
      chronicConditions: pickN(chronicConditionsList, randInt(0, 2)),
      vitals: [{ bloodPressure: `${randInt(105, 150)}/${randInt(65, 95)}`, heartRate: randInt(60, 100), temperature: Number((97.5 + Math.random() * 1.8).toFixed(1)), weight: randInt(45, 100), height: randInt(150, 190), oxygenSaturation: randInt(94, 100), bloodSugar: randInt(80, 160), recordedAt: randomDate(-randInt(0, 30)) }],
      isAdmitted: false,
      attendingDoctor: pick(createdDoctors)._id
    });
  }

  const createdPatients = await Patient.insertMany(patientDocs);
  console.log(`✅ Created ${createdPatients.length} patients`);

  // ─── STAFF (20) ──────────────────────────────────────────────────────────
  const explicitStaffSpecs = [
    { department: 'Cardiology', designation: 'Senior Nurse', shift: 'morning', salary: 35000, joinDate: new Date('2020-01-15') },
    { department: 'Pediatrics', designation: 'Staff Nurse', shift: 'afternoon', salary: 30000, joinDate: new Date('2021-06-01') },
    { department: 'Front Desk', designation: 'Senior Receptionist', shift: 'morning', salary: 28000, joinDate: new Date('2019-03-10') },
    { department: 'Pharmacy', designation: 'Chief Pharmacist', shift: 'morning', salary: 45000, joinDate: new Date('2018-07-20') },
    { department: 'Laboratory', designation: 'Senior Lab Technician', shift: 'morning', salary: 32000, joinDate: new Date('2020-09-05') },
    { department: 'Emergency', designation: 'Ambulance Driver & EMT', shift: 'rotating', salary: 30000, joinDate: new Date('2021-01-10') },
  ];

  const designationByRole = {
    nurse: ['Staff Nurse', 'Senior Nurse', 'ICU Nurse', 'Ward Nurse'],
    receptionist: ['Receptionist', 'Front Desk Executive'],
    pharmacist: ['Pharmacist', 'Senior Pharmacist'],
    lab_technician: ['Lab Technician', 'Senior Lab Technician'],
    ambulance_staff: ['Ambulance Driver & EMT', 'Paramedic']
  };
  const deptByRole = {
    nurse: ['General Medicine', 'ICU', 'Pediatrics', 'Cardiology', 'Orthopedics'],
    receptionist: ['Front Desk'],
    pharmacist: ['Pharmacy'],
    lab_technician: ['Laboratory'],
    ambulance_staff: ['Emergency']
  };

  const staffDocs = explicitStaffSpecs.map((s, i) => ({
    staffId: padId('STF', i + 1, 5),
    user: staffUsers[i]._id,
    department: s.department,
    designation: s.designation,
    qualification: ['Diploma/Certification as applicable'],
    employmentType: 'full_time',
    joinDate: s.joinDate,
    salary: s.salary,
    shift: s.shift,
    hospitalId: hospital._id
  }));

  for (let i = 6; i < 20; i++) {
    const userDoc = staffUsers[i];
    const role = userDoc.role;
    staffDocs.push({
      staffId: padId('STF', i + 1, 5),
      user: userDoc._id,
      department: pick(deptByRole[role] || ['General Medicine']),
      designation: pick(designationByRole[role] || ['Staff Member']),
      qualification: ['Diploma/Certification as applicable'],
      employmentType: pick(['full_time', 'full_time', 'part_time']),
      joinDate: randomDate(-randInt(60, 1800)),
      salary: randInt(25000, 50000),
      shift: pick(['morning', 'afternoon', 'night', 'rotating']),
      hospitalId: hospital._id
    });
  }

  const createdStaff = await Staff.insertMany(staffDocs);
  console.log(`✅ Created ${createdStaff.length} staff members`);

  // ─── MEDICINES (500) ───────────────────────────────────────────────────
  const medicineDocs = [];
  let medCounter = 0;
  for (let b = 0; b < baseMedicines.length; b++) {
    const base = baseMedicines[b];
    for (let v = 0; v < 5; v++) {
      medCounter++;
      const manufacturer = manufacturers[(b + v) % manufacturers.length];
      const expiryMonths = randInt(6, 30);
      medicineDocs.push({
        medicineId: padId('MED', medCounter, 6),
        name: base.name,
        genericName: base.genericName,
        brand: `${manufacturer.split(' ')[0]}${base.genericName.replace(/[^a-zA-Z]/g, '').slice(0, 4)}`,
        category: base.category,
        type: base.type,
        manufacturer,
        batchNumber: `B${2024 + (v % 2)}${padId('', medCounter, 4)}`,
        expiryDate: randomDate(expiryMonths * 30),
        manufacturingDate: randomDate(-(24 - expiryMonths) * 30),
        quantity: randInt(20, 600),
        minStockLevel: randInt(10, 60),
        purchasePrice: Number((Math.random() * 50 + 1).toFixed(2)),
        sellingPrice: Number((Math.random() * 80 + 2).toFixed(2)),
        dosageInstructions: 'As directed by physician',
        sideEffects: base.sideEffects,
        contraindications: base.contraindications,
        activeIngredients: [base.genericName],
        storageInstructions: base.type === 'injection' ? 'Store in refrigerator (2-8°C)' : 'Store in a cool, dry place below 25°C',
        requiresPrescription: ['analgesic', 'antihistamine', 'vitamin_supplement'].includes(base.category) ? Math.random() < 0.3 : true,
        location: `Shelf ${pick(['A', 'B', 'C', 'D', 'E'])}${randInt(1, 9)}`,
        isActive: true
      });
    }
  }
  const createdMedicines = await Medicine.insertMany(medicineDocs);
  console.log(`✅ Created ${createdMedicines.length} medicines`);

  // ─── INVENTORY (100) ─────────────────────────────────────────────────────
  const wardLocations = ['Ward A', 'Ward B', 'ICU', 'OPD', 'Emergency', 'OT Store', 'Store Room', 'Nurse Station', 'Radiology', 'Front Desk'];
  const inventoryDocs = [];
  for (let i = 0; i < 100; i++) {
    const t = equipmentTemplates[i % equipmentTemplates.length];
    inventoryDocs.push({
      itemId: padId('INV', i + 1, 6),
      name: t.name,
      category: t.category,
      manufacturer: pick(manufacturers),
      serialNumber: `SN${randInt(100000, 999999)}`,
      quantity: randInt(2, 60),
      minStockLevel: randInt(2, 15),
      location: pick(wardLocations),
      purchaseDate: randomDate(-randInt(30, 1200)),
      purchasePrice: t.unitCost,
      warrantyExpiry: randomDate(randInt(180, 1100)),
      condition: pick(['new', 'good', 'good', 'fair']),
      isActive: true
    });
  }
  const createdInventory = await Inventory.insertMany(inventoryDocs);
  console.log(`✅ Created ${createdInventory.length} inventory items`);

  // ─── LAB TESTS (50) ──────────────────────────────────────────────────────
  const labDocs = [];
  for (let i = 0; i < 50; i++) {
    const template = pick(labTestCatalog);
    const patient = pick(createdPatients);
    const doctor = pick(createdDoctors);
    const isPast = Math.random() < 0.7;
    const status = isPast ? 'completed' : pick(['ordered', 'sample_collected', 'processing']);
    labDocs.push({
      testId: padId('LAB', i + 1, 6),
      patient: patient._id,
      doctor: doctor._id,
      testName: template.testName,
      testCode: template.testCode,
      category: template.category,
      status,
      priority: pick(['routine', 'routine', 'urgent']),
      sampleType: template.sampleType,
      sampleCollectedAt: isPast ? randomDate(-randInt(1, 20)) : undefined,
      results: status === 'completed' ? [{ parameter: template.testName, value: String(randInt(50, 150)), unit: 'mg/dL', referenceRange: '70-110', status: pick(['normal', 'normal', 'normal', 'high', 'low']) }] : [],
      completedAt: status === 'completed' ? randomDate(-randInt(0, 15)) : undefined,
      price: template.price,
      isPaid: status === 'completed',
      notes: ''
    });
  }
  const createdLabTests = await LabTest.insertMany(labDocs);
  console.log(`✅ Created ${createdLabTests.length} lab reports`);

  // ─── AMBULANCES (20) ─────────────────────────────────────────────────────
  const stateCodes = ['MH', 'DL', 'TN', 'KA', 'TS', 'WB', 'GJ', 'RJ', 'UP', 'KL'];
  const ambulanceDocs = [];
  for (let i = 0; i < 20; i++) {
    const driver = pick(ambulanceStaffUsers.length ? ambulanceStaffUsers : staffUsers);
    ambulanceDocs.push({
      vehicleNumber: `${stateCodes[i % stateCodes.length]}-${randInt(10, 99)}-AB-${1000 + i}`,
      type: pick(['basic', 'basic', 'advanced', 'advanced', 'neonatal', 'air']),
      status: pick(['available', 'available', 'available', 'dispatched', 'maintenance']),
      driver: driver._id,
      equipment: pickN(['Oxygen Cylinder', 'Defibrillator', 'Stretcher', 'First Aid Kit', 'Ventilator', 'IV Stand', 'Cardiac Monitor'], randInt(3, 6)),
      lastMaintenanceDate: randomDate(-randInt(10, 90)),
      nextMaintenanceDate: randomDate(randInt(10, 90)),
      location: { latitude: 19.076 + (Math.random() - 0.5) * 0.3, longitude: 72.877 + (Math.random() - 0.5) * 0.3, address: `${pick(citiesIndia).city} Zone ${randInt(1, 9)}`, lastUpdated: new Date() },
      hospitalId: hospital._id
    });
  }
  const createdAmbulances = await Ambulance.insertMany(ambulanceDocs);
  console.log(`✅ Created ${createdAmbulances.length} ambulances`);

  // ─── BLOOD BANK (30 donors + units + requests) ─────────────────────────
  const donorDocs = Array.from({ length: 30 }, (_, i) => {
    const isFemale = Math.random() < 0.5;
    return {
      name: `${pick(isFemale ? femaleFirstNames : maleFirstNames)} ${pick(lastNames)}`,
      age: randInt(18, 60),
      bloodGroup: pick(bloodGroups),
      phone: `9${randInt(100000000, 999999999)}`,
      lastDonated: randomDate(-randInt(10, 300)),
      nextEligible: randomDate(randInt(1, 80)),
      totalDonations: randInt(1, 18),
      isActive: true
    };
  });
  const createdDonors = await Donor.insertMany(donorDocs);

  const bloodUnitDocs = [];
  for (const bg of bloodGroups) {
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      bloodUnitDocs.push({
        bloodGroup: bg,
        units: randInt(1, 4),
        expiryDate: randomDate(randInt(20, 90)),
        donorId: pick(createdDonors)._id,
        status: pick(['available', 'available', 'reserved']),
        collectedDate: randomDate(-randInt(1, 40))
      });
    }
  }
  await BloodUnit.insertMany(bloodUnitDocs);

  const bloodRequestDocs = Array.from({ length: 10 }, () => ({
    patientId: pick(createdPatients)._id,
    bloodGroup: pick(bloodGroups),
    units: randInt(1, 4),
    urgency: pick(['routine', 'urgent', 'emergency']),
    status: pick(['pending', 'approved', 'fulfilled'])
  }));
  await BloodRequest.insertMany(bloodRequestDocs);
  console.log(`✅ Created ${createdDonors.length} blood donors + ${bloodUnitDocs.length} blood units + 10 blood requests`);

  // ─── BEDS (200) ──────────────────────────────────────────────────────────
  const wardDefs = [
    { ward: 'General Ward A', type: 'general', rate: 1500 },
    { ward: 'General Ward B', type: 'general', rate: 1500 },
    { ward: 'ICU', type: 'icu', rate: 8000 },
    { ward: 'Emergency', type: 'emergency', rate: 3000 },
    { ward: 'Private Ward', type: 'private', rate: 6000 },
    { ward: 'Semi-Private Ward', type: 'semi-private', rate: 3500 },
    { ward: 'Pediatric Ward', type: 'pediatric', rate: 2000 },
    { ward: 'NICU', type: 'nicu', rate: 9000 },
  ];
  const bedDocs = [];
  for (let i = 0; i < 200; i++) {
    const w = wardDefs[i % wardDefs.length];
    const floor = (i % 6) + 1;
    const statusRoll = Math.random();
    const status = statusRoll < 0.45 ? 'occupied' : statusRoll < 0.85 ? 'available' : statusRoll < 0.93 ? 'reserved' : statusRoll < 0.97 ? 'cleaning' : 'maintenance';
    const occupied = status === 'occupied';
    bedDocs.push({
      bedNumber: `${w.ward.split(' ').map(x => x[0]).join('')}${floor}${padId('', i + 1, 3)}`,
      ward: w.ward,
      floor,
      type: w.type,
      status,
      patient: occupied ? pick(createdPatients)._id : undefined,
      admittedAt: occupied ? randomDate(-randInt(0, 10)) : undefined,
      assignedDoctor: occupied ? pick(createdDoctors)._id : undefined,
      dailyRate: w.rate,
      features: w.type === 'icu' || w.type === 'nicu' ? ['oxygen', 'cardiac-monitor', 'ventilator'] : w.type === 'emergency' ? ['oxygen', 'cardiac-monitor'] : ['oxygen']
    });
  }
  const createdBeds = await Bed.insertMany(bedDocs);
  console.log(`✅ Created ${createdBeds.length} bed records`);

  // ─── OPERATION THEATERS (10 rooms + ~30 bookings) ───────────────────────
  const otRoomDocs = Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `OT-${i + 1}`,
    name: `Operation Theater ${i + 1}`,
    type: pick(['major', 'major', 'minor', 'emergency', 'hybrid']),
    status: pick(['available', 'available', 'available', 'in-use', 'cleaning']),
    equipment: pickN(['Anesthesia Machine', 'Surgical Lights', 'Electrocautery', 'C-Arm', 'Ventilator', 'Patient Monitor'], randInt(3, 5)),
    capacity: 1
  }));
  const createdOTRooms = await OTRoom.insertMany(otRoomDocs);

  const procedures = ['Appendectomy', 'Cholecystectomy', 'Total Knee Replacement', 'Cataract Surgery', 'Cesarean Section', 'Tonsillectomy', 'Inguinal Hernia Repair', 'Coronary Angioplasty', 'Hysterectomy', 'Upper GI Endoscopy'];
  const otBookingDocs = Array.from({ length: 30 }, (_, i) => {
    const dayOffset = randInt(-30, 30);
    const status = dayOffset < 0 ? pick(['completed', 'completed', 'cancelled']) : pick(['scheduled', 'scheduled', 'scheduled', 'postponed']);
    return {
      otRoom: pick(createdOTRooms).roomNumber,
      patient: pick(createdPatients)._id,
      surgeon: pick(createdDoctors)._id,
      anesthesiologist: pick(createdDoctors)._id,
      procedureName: pick(procedures),
      procedureType: pick(['elective', 'elective', 'emergency']),
      scheduledDate: randomDate(dayOffset),
      startTime: pick(['08:00', '10:00', '13:00', '15:00']),
      estimatedDuration: randInt(45, 240),
      status,
      anesthesiaType: pick(['general', 'local', 'regional', 'spinal']),
      diagnosis: `Indicated for ${pick(procedures).toLowerCase()}`
    };
  });
  await OTBooking.insertMany(otBookingDocs);
  console.log(`✅ Created ${createdOTRooms.length} operation theaters + ${otBookingDocs.length} OT bookings`);

  // ─── APPOINTMENTS (1000) ─────────────────────────────────────────────────
  const symptomsPool = ['Fever', 'Headache', 'Cough', 'Fatigue', 'Body ache', 'Nausea', 'Dizziness', 'Chest pain', 'Joint pain', 'Shortness of breath', 'Abdominal pain', 'Skin rash'];
  const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];
  const appointmentDocs = [];
  for (let i = 0; i < 1000; i++) {
    const dayOffset = randInt(-60, 30);
    const isPast = dayOffset < 0;
    const isToday = dayOffset === 0;
    const doctor = pick(createdDoctors);
    let status;
    if (isPast) status = pick(['completed', 'completed', 'completed', 'cancelled', 'no_show']);
    else if (isToday) status = pick(['confirmed', 'in_progress', 'scheduled']);
    else status = pick(['scheduled', 'confirmed']);

    appointmentDocs.push({
      appointmentId: padId('APT', i + 1, 7),
      patient: pick(createdPatients)._id,
      doctor: doctor._id,
      appointmentDate: randomDate(dayOffset),
      appointmentTime: pick(timeSlots),
      type: pick(['consultation', 'consultation', 'follow_up', 'routine', 'specialist']),
      status,
      symptoms: pickN(symptomsPool, randInt(1, 3)),
      reason: 'Routine consultation',
      diagnosis: status === 'completed' ? 'Reviewed; advised medication and follow-up as needed' : undefined,
      duration: 30,
      queueNumber: isToday ? randInt(1, 40) : undefined,
      consultationFee: doctor.consultationFee,
      isPaid: status === 'completed'
    });
  }
  const createdAppointments = await Appointment.insertMany(appointmentDocs);
  console.log(`✅ Created ${createdAppointments.length} appointments`);

  // ─── BILLING (invoices for completed appointments) ─────────────────────
  const billingDocs = [];
  let invoiceCounter = 0;
  const completedAppointments = createdAppointments.filter(a => a.status === 'completed');
  for (const appt of completedAppointments) {
    invoiceCounter++;
    const consultFee = appt.consultationFee || 500;
    const labFee = Math.random() < 0.3 ? randInt(200, 1500) : 0;
    const medFee = Math.random() < 0.4 ? randInt(100, 800) : 0;
    const items = [{ description: 'Doctor Consultation', category: 'consultation', quantity: 1, unitPrice: consultFee, total: consultFee }];
    if (labFee) items.push({ description: 'Lab Tests', category: 'lab_test', quantity: 1, unitPrice: labFee, total: labFee });
    if (medFee) items.push({ description: 'Medicines Dispensed', category: 'medicine', quantity: 1, unitPrice: medFee, total: medFee });

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + tax;
    const statusRoll = Math.random();
    const status = statusRoll < 0.78 ? 'paid' : statusRoll < 0.90 ? 'pending' : statusRoll < 0.97 ? 'partial' : 'overdue';
    const paidAmount = status === 'paid' ? totalAmount : status === 'partial' ? Math.round(totalAmount * 0.5) : 0;

    billingDocs.push({
      invoiceNumber: `INV${appt.appointmentDate.getFullYear()}${padId('', invoiceCounter, 6)}`,
      patient: appt.patient,
      appointment: appt._id,
      items,
      subtotal,
      totalTax: tax,
      totalAmount,
      paidAmount,
      status,
      paymentMethod: status === 'paid' || status === 'partial' ? pick(['cash', 'card', 'upi', 'insurance', 'online']) : undefined,
      paymentDate: status === 'paid' || status === 'partial' ? appt.appointmentDate : undefined,
      dueDate: new Date(appt.appointmentDate.getTime() + 15 * 86400000)
    });
  }
  const createdBilling = await Billing.insertMany(billingDocs);
  console.log(`✅ Created ${createdBilling.length} billing invoices`);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VOLUME SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Users: ${createdUsers.length} | Doctors: ${createdDoctors.length} | Patients: ${createdPatients.length}`);
  console.log(`Staff: ${createdStaff.length} | Medicines: ${createdMedicines.length} | Inventory: ${createdInventory.length}`);
  console.log(`Appointments: ${createdAppointments.length} | Lab Reports: ${createdLabTests.length} | Ambulances: ${createdAmbulances.length}`);
  console.log(`Blood Donors: ${createdDonors.length} | Beds: ${createdBeds.length} | OT Rooms: ${createdOTRooms.length} (+${otBookingDocs.length} bookings)`);
  console.log(`Billing Invoices: ${createdBilling.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DEMO ACCOUNTS (password pattern unchanged from README):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 Super Admin   → admin@medcare360.com        / Admin@1234');
  console.log('🏥 Hospital Admin→ hospitaladmin@medcare360.com/ Admin@1234');
  console.log('👨‍⚕️ Doctor (Cardio)→ doctor@medcare360.com       / Doctor@1234');
  console.log('👩‍⚕️ Doctor (Pedia) → doctor2@medcare360.com      / Doctor@1234');
  console.log('🦴 Doctor (Ortho) → doctor3@medcare360.com      / Doctor@1234');
  console.log('💉 Nurse         → nurse@medcare360.com        / Nurse@1234');
  console.log('📋 Receptionist  → receptionist@medcare360.com / Reception@1234');
  console.log('💊 Pharmacist    → pharmacist@medcare360.com   / Pharma@1234');
  console.log('🔬 Lab Tech      → lab@medcare360.com          / Lab@1234');
  console.log('🚑 Ambulance     → ambulance@medcare360.com    / Ambu@1234');
  console.log('🧑 Patient 1     → patient@medcare360.com      / Patient@1234');
  console.log('👩 Patient 2     → patient2@medcare360.com     / Patient@1234');
  console.log('ℹ️  47 additional doctors, 14 additional staff, and 497 additional patients were');
  console.log('   generated with realistic names/emails — all use the password pattern above');
  console.log('   for their role (e.g. all generated doctors use Doctor@1234).');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
