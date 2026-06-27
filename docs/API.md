# API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require: `Authorization: Bearer <token>`

---

## Authentication

### POST /auth/register
Register a new patient account (public).

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password@123",
  "phone": "9876543210",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "bloodGroup": "O+",
  "address": { "street": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" }
}
```

**Response:** `201` — `{ success, token, user }`

---

### POST /auth/login
```json
{ "email": "john@example.com", "password": "Password@123" }
```
**Response:** `200` — `{ success, token, user }`

---

### GET /auth/me
Get current authenticated user.  
**Headers:** `Authorization: Bearer <token>`

---

### POST /auth/forgot-password
```json
{ "email": "john@example.com" }
```
Sends reset email.

---

### PUT /auth/reset-password/:token
```json
{ "password": "NewPassword@123" }
```

---

## Patients

### GET /patients
**Access:** doctor, nurse, receptionist, admin  
**Query:** `?page=1&limit=10&search=john&bloodGroup=O%2B`

### POST /patients
**Access:** receptionist, admin  
Create patient profile (user must exist).

### GET /patients/:id
**Access:** doctor, nurse, patient (own), admin

### PUT /patients/:id
**Access:** doctor, nurse, admin

### PUT /patients/:id/vitals
Add vital signs reading.
```json
{ "bloodPressure": "120/80", "heartRate": 72, "temperature": 98.6, "weight": 70, "height": 175 }
```

---

## Doctors

### GET /doctors
**Access:** All authenticated  
**Query:** `?specialization=cardiology&page=1`

### GET /doctors/:id/slots
Get available appointment slots.  
**Query:** `?date=2024-12-20`

---

## Appointments

### POST /appointments
```json
{
  "doctor": "doctorId",
  "patient": "patientId",
  "appointmentDate": "2024-12-20T10:30:00.000Z",
  "type": "consultation",
  "chiefComplaint": "Chest pain"
}
```

### PUT /appointments/:id/status
```json
{ "status": "confirmed", "notes": "Confirmed by receptionist" }
```

---

## AI Endpoints

### POST /ai/chat
**Access:** All authenticated  
```json
{
  "message": "What are signs of dehydration?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```
**Response:** `{ response, disclaimer }`

---

### POST /ai/scan-medicine
**Access:** All authenticated  
```json
{ "image": "data:image/jpeg;base64,/9j/..." }
```
**Response:** `{ name, activeIngredient, dosage, usage, sideEffects, warnings, storageInstructions, confidence }`

---

### GET /ai/emergency/:type
**Access:** All authenticated  
Types: `heart_attack`, `stroke`, `burns`, `choking`, `seizure`, `bleeding`, `asthma`, `diabetic_emergency`

---

## Analytics

### GET /analytics/dashboard
Returns patient count, doctor count, today's appointments, pending appointments, monthly revenue, occupied beds.

### GET /analytics/revenue
Monthly revenue for the past 12 months.

### GET /analytics/appointments
Appointment status breakdown (pie chart data).

### GET /analytics/demographics
Patient demographics by gender, blood group, age group.

---

## Pharmacy / Medicines

### GET /medicines
**Query:** `?category=antibiotic&lowStock=true`

### POST /medicines
Add new medicine to pharmacy.

### PUT /medicines/:id/dispense
```json
{ "quantity": 5, "patientId": "patientId", "prescribedBy": "doctorId" }
```

---

## Billing

### POST /billing
```json
{
  "patient": "patientId",
  "items": [{ "description": "Consultation", "category": "consultation", "quantity": 1, "unitPrice": 500 }],
  "paymentMethod": "cash"
}
```

### GET /billing/:id/invoice
Returns full invoice with patient and doctor details.

### PUT /billing/:id/payment
```json
{ "amountPaid": 1000, "paymentMethod": "upi", "transactionId": "TXN123456" }
```

---

## Lab Tests

### POST /lab-tests
Order a lab test.

### PUT /lab-tests/:id/results
Upload test results (lab technician).
```json
{
  "results": [
    { "parameter": "Hemoglobin", "value": "14.5", "unit": "g/dL", "referenceRange": "12-17", "status": "normal" }
  ],
  "technicianNotes": "Sample quality: good"
}
```

---

## Ambulance

### GET /ambulances
Get all ambulances with status.

### POST /ambulances/:id/dispatch
```json
{
  "patient": "patientId",
  "pickupLocation": { "address": "123 Main St", "latitude": 18.9220, "longitude": 72.8347 },
  "destination": "Hospital Main Campus",
  "emergency": true,
  "notes": "Chest pain, conscious"
}
```

---

## Response Formats

### Success
```json
{ "success": true, "data": {...}, "count": 10, "pagination": { "page": 1, "limit": 10, "total": 150, "pages": 15 } }
```

### Error
```json
{ "success": false, "message": "Description of error" }
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
