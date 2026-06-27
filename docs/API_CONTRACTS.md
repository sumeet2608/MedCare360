# MedCare 360 — API Contracts

All endpoints require `Authorization: Bearer {accessToken}` unless marked `[Public]`.

Base URL (production): `https://api.medcare360.com`
Base URL (local dev): `http://localhost:3000` (API Gateway) or `http://localhost:5000` (Backend)

---

## Auth Service (via Gateway: /api/auth/*)

| Method | Path                  | Auth     | Description                        |
|--------|-----------------------|----------|------------------------------------|
| POST   | /api/auth/register    | [Public] | Register new user                  |
| POST   | /api/auth/login       | [Public] | Login, returns access+refresh token|
| POST   | /api/auth/logout      | Required | Blacklist token, delete refresh    |
| POST   | /api/auth/refresh     | [Public] | Get new access token               |
| POST   | /api/auth/2fa/setup   | Required | Generate TOTP QR code              |
| POST   | /api/auth/2fa/verify  | Required | Enable 2FA after TOTP verify       |
| GET    | /api/auth/audit-logs  | Admin    | Paginated audit log                |

### POST /api/auth/login — Request
```json
{ "email": "admin@medcare360.com", "password": "Admin@1234", "totpCode": "123456" }
```
### POST /api/auth/login — Response 200
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Admin", "email": "...", "role": "super_admin" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## Patient Service (/api/patients/*)

| Method | Path                       | Description                    |
|--------|----------------------------|--------------------------------|
| GET    | /api/patients              | List patients (paginated+search)|
| POST   | /api/patients              | Register new patient           |
| GET    | /api/patients/:id          | Get patient by ID or patientId |
| PATCH  | /api/patients/:id          | Update patient details         |
| POST   | /api/patients/:id/vitals   | Record vitals                  |

### GET /api/patients — Query params
`?page=1&limit=20&search=sharma`

---

## Doctor Service (/api/doctors/*)

| Method | Path                         | Description                  |
|--------|------------------------------|------------------------------|
| GET    | /api/doctors                 | List doctors (filter+search) |
| POST   | /api/doctors                 | Register doctor              |
| GET    | /api/doctors/:id             | Doctor profile               |
| PATCH  | /api/doctors/:id             | Update doctor                |
| GET    | /api/doctors/:id/availability| Check availability for date  |

### GET /api/doctors — Query params
`?specialization=cardiology&department=Cardiology&search=kumar&page=1&limit=20`

---

## Appointment Service (/api/appointments/*)

| Method | Path                               | Description                |
|--------|------------------------------------|----------------------------|
| GET    | /api/appointments                  | List (filter by patient/doctor/dept/status/date) |
| POST   | /api/appointments                  | Book appointment           |
| PATCH  | /api/appointments/:id/status       | Update status              |
| GET    | /api/appointments/queue/:department| Live OPD queue             |

### POST /api/appointments — Request
```json
{
  "patientId": "P1A2B3",
  "doctorId": "DR4C5D6",
  "department": "Cardiology",
  "appointmentDate": "2026-07-01",
  "timeSlot": "10:00",
  "type": "in-person",
  "symptoms": ["chest pain", "shortness of breath"],
  "priority": "urgent"
}
```

---

## AI Service (/api/ai/*)

| Method | Path                   | Description                              |
|--------|------------------------|------------------------------------------|
| POST   | /api/ai/chat           | Healthcare AI assistant (Redis 5min cache)|
| POST   | /api/ai/symptom-check  | Structured symptom analysis              |
| POST   | /api/ai/drug-interaction| Drug interaction checker                |
| POST   | /api/ai/scan-medicine  | Vision AI — medicine label reader        |
| POST   | /api/ai/emergency      | Step-by-step emergency guidance          |
| POST   | /api/ai/preventive-care| Personalized preventive care plan        |
| POST   | /api/ai/insights       | Dashboard insights (Redis 1hr cache)     |

### POST /api/ai/symptom-check — Request
```json
{ "symptoms": ["fever", "cough", "breathlessness"], "age": 45, "gender": "male" }
```
### Response
```json
{
  "success": true,
  "data": {
    "possibleConditions": ["Pneumonia", "COVID-19", "Bronchitis"],
    "urgencyLevel": "high",
    "immediateActions": ["Visit ER", "Avoid exertion"],
    "redFlags": ["Oxygen saturation below 94%"],
    "disclaimer": "AI analysis only — consult a qualified physician"
  }
}
```

### POST /api/ai/emergency — Request
```json
{ "type": "heart-attack", "patientAge": 62, "additionalInfo": "crushing chest pain, left arm numbness" }
```
Supported types: `heart-attack`, `stroke`, `choking`, `burns`, `seizures`, `poisoning`, `asthma`, `bleeding`, `snake-bite`, `electric-shock`

---

## Ambulance Service (/api/ambulance/*)

| Method | Path                             | Description              |
|--------|----------------------------------|--------------------------|
| GET    | /api/ambulance                   | List all + live location |
| POST   | /api/ambulance/dispatch          | Emergency dispatch       |
| PATCH  | /api/ambulance/dispatch/:id/status| Update dispatch status  |
| GET    | /api/ambulance/track/:ambulanceId| Real-time location       |

---

## Billing Service (/api/billing/*)

| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/billing/invoices         | List invoices            |
| POST   | /api/billing/invoices         | Create invoice           |
| POST   | /api/billing/invoices/:id/pay | Record payment           |
| GET    | /api/billing/analytics/revenue| Revenue analytics        |

---

## Standard Response Envelope

### Success
```json
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 20, "total": 145 } }
```

### Error
```json
{ "success": false, "message": "Patient not found", "code": "NOT_FOUND" }
```

### Validation Error
```json
{ "success": false, "errors": [{ "field": "email", "message": "Must be a valid email" }] }
```
