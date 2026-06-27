// MongoDB initialization script
db = db.getSiblingDB('medcare360');

db.createCollection('users');
db.createCollection('patients');
db.createCollection('doctors');
db.createCollection('appointments');
db.createCollection('medicines');
db.createCollection('billings');
db.createCollection('labtests');
db.createCollection('inventories');
db.createCollection('ambulances');
db.createCollection('staffs');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.patients.createIndex({ patientId: 1 }, { unique: true });
db.patients.createIndex({ user: 1 });
db.doctors.createIndex({ doctorId: 1 }, { unique: true });
db.doctors.createIndex({ user: 1 });
db.appointments.createIndex({ appointmentId: 1 }, { unique: true });
db.appointments.createIndex({ patient: 1, appointmentDate: -1 });
db.appointments.createIndex({ doctor: 1, appointmentDate: 1 });
db.medicines.createIndex({ medicineId: 1 }, { unique: true });
db.medicines.createIndex({ name: 1 });
db.billings.createIndex({ invoiceNumber: 1 }, { unique: true });
db.labtests.createIndex({ testId: 1 }, { unique: true });
db.staffs.createIndex({ staffId: 1 }, { unique: true });

print('MedCare 360 database initialized with indexes.');
