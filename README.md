# MedCare 360 — Enterprise Healthcare Platform

<div align="center">

![Version](https://img.shields.io/badge/version-4.0.0-0891b2?style=for-the-badge)
![Angular](https://img.shields.io/badge/Angular-16-red?style=for-the-badge&logo=angular)
![Node.js](https://img.shields.io/badge/Node.js-20-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7-darkgreen?style=for-the-badge&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7.2-red?style=for-the-badge&logo=redis)
![Kafka](https://img.shields.io/badge/Kafka-7.5-black?style=for-the-badge&logo=apache-kafka)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker)
![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS-326CE5?style=for-the-badge&logo=kubernetes)
![AWS](https://img.shields.io/badge/AWS-Production-FF9900?style=for-the-badge&logo=amazon-aws)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?style=for-the-badge&logo=terraform)

**Production-ready enterprise healthcare platform — Angular 16 SPA, Node.js API, MongoDB, AI-powered clinical decision support, EMR, PACS imaging, intelligent billing, and full DevOps stack.**

[Quick Start](#-quick-start) · [Modules](#-modules) · [AI Features](#-ai-features) · [EMR](#-emr-module) · [DevOps](#-devops) · [API Docs](docs/API_CONTRACTS.md)

</div>

---

## What's New in v4.0

| Feature | Details |
|---|---|
| **EMR Module** | Full Electronic Medical Records — SOAP Notes, Prescriptions, Clinical Timeline, ICD-10 search, Audit Logs |
| **AI Lab Analyzer v3** | Gender/age/pregnancy-specific reference ranges, value-traceable explainability, 6 analyzer types |
| **Intelligent Billing** | Auto-billing on patient registration + appointments; category bifurcation; "Cleared" status when paid |
| **Patient Discharge** | One-click discharge/re-admit with bed clearing and status tracking |
| **Staff-Doctor Assignment** | Dedicated staff (nurses, assistants) assigned to each doctor, visible on doctor cards |
| **Pharmacy** | 60 common medicines seeded; unlimited inventory; RxNorm cross-reference (clean results, no combo packs) |
| **Magic MCP UI** | 21st.dev design patterns — white glassmorphism stat cards, Emergency dark-gradient cards, site-matched design |
| **Security** | Tiered rate limiting, CSP enabled, XSS-clean, clinical audit trail |
| **DevOps** | Kafka events wired (appointments/patients), Redis caching, K8s PVC for uploads, private EKS endpoint |

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/medcare360.git
cd MedCare360

# Copy environment file
cp .env.example backend/.env
# Fill in all values in backend/.env

# Backend
cd backend && npm install && npm run dev   # → http://localhost:5000

# Frontend (new terminal)
cd frontend && npm install && npm start    # → http://localhost:4200
```

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@medcare360.com | Admin@1234 |
| Doctor | doctor@medcare360.com | Doctor@1234 |
| Patient | patient@medcare360.com | Patient@1234 |

---

## Architecture

```
Browser (Angular 16 SPA)
    │
    ▼
Node.js / Express API (port 5000)
    ├── Auth + JWT middleware
    ├── 21 REST route groups
    ├── Socket.io (real-time: ambulance, OT queue, notifications)
    ├── Redis (caching: patient lists 60s, analytics 30s)
    └── Kafka (events: patient.registered, appointment.created/cancelled)
    │
    ▼
MongoDB 7 (mongoose)
    ├── 18 models including MedicalRecord, Prescription, SOAPNote, ClinicalAuditLog
    └── Indexes on patient + date for timeline queries

External APIs
    ├── Groq LLaMA 3.3-70B (text — lab analyzer, AI assistant, AI command center)
    ├── Groq Llama 4 Scout (vision — medicine scanner)
    └── RxNorm NIH API (pharmacy search, filtered: IN/BN/SCD only)
```

---

## Modules

### Core
| Module | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Role-based (Admin/Doctor/Patient) with AI insights, stat cards, revenue charts |
| Patients | `/patients` | Registration, profile, vitals, admit/discharge, clinical timeline link |
| Doctors | `/doctors` | 50 doctors with specializations, fees ₹1294-1300, assigned staff display |
| Appointments | `/appointments` | Booking, status tracking, auto-billing on create |

### Clinical
| Module | Route | Description |
|---|---|---|
| **EMR** | `/emr` | SOAP Notes (S·O·A·P), Prescription Generator, Clinical Timeline, ICD-10 search |
| Pharmacy | `/pharmacy` | 60 medicines seeded, stock management, RxNorm search, medicine scanner |
| Lab | `/lab` | Test ordering, AI analyzer (6 types), results with reference ranges |
| Medical Imaging | `/medical-imaging` | PACS viewer, X-ray SVG demo, upload real images → AI analysis, localStorage persistence |
| Blood Bank | `/blood-bank` | Donor management, blood unit inventory, request tracking |
| Operation Theater | `/operation-theater` | OT booking, surgeon/anesthesiologist assignment |
| Telemedicine | `/telemedicine` | Video consultation via Jitsi, chat log |

### Admin & Operations
| Module | Route | Description |
|---|---|---|
| Billing | `/billing` | Intelligent auto-billing, category bifurcation, "Cleared" status on full payment |
| Emergency | `/emergency` | 8 emergency type cards with first aid guidance, emergency number panel |
| Ambulance | `/ambulance` | Real-time GPS tracking, dispatch workflow |
| Bed Management | `/bed-management` | Occupancy tracking, ward/bed assignment |
| Inventory | `/inventory` | Medical equipment and supply tracking |
| Staff | `/staff` | 15 staff members, assigned to doctors |
| Analytics | `/analytics` | Revenue trends, appointment stats, gender distribution, low stock alerts |

### AI & Tools
| Module | Route | Description |
|---|---|---|
| AI Assistant | `/ai-assistant` | Groq LLaMA chat, healthcare Q&A |
| AI Command Center | `/ai-command-center` | Orchestration dashboard, command history |
| Medicine Scanner | `/medicine-scanner` | Upload medicine image → Groq vision → identification (Tesseract OCR + AI) |

---

## EMR Module

Full Electronic Medical Records system built on top of 4 new MongoDB models:

### Models
- **MedicalRecord** — Encounters with diagnoses (ICD-10), procedures, vitals, disposition
- **Prescription** — Medications with dosage/route/frequency, allergy check, interaction check, pharmacy dispensing
- **SOAPNote** — Structured Subjective/Objective/Assessment/Plan with sign-off workflow
- **ClinicalAuditLog** — HIPAA-compliant audit trail: every read/write/sign/prescribe logged with user, IP, resource

### API Routes (`/api/emr/*`)
```
GET  /records?patient=:id          — patient medical records
POST /records                      — create encounter
GET  /timeline/:patientId          — full clinical timeline (records + notes + Rx)
GET  /soap?patient=:id             — SOAP notes
POST /soap                         — create SOAP note
PATCH /soap/:id/sign               — sign and lock a SOAP note
GET  /prescriptions?patient=:id    — prescriptions
POST /prescriptions                — create prescription
PATCH /prescriptions/:id/dispense  — pharmacy dispenses
GET  /icd10/search?q=hypertension  — 40 built-in ICD-10 codes (searchable)
GET  /audit-logs                   — admin audit trail
```

### Frontend Components
- **EMR Dashboard** — Patient search → timeline, recent SOAP notes, recent prescriptions
- **Clinical Timeline** — Chronological view with filter chips (records / notes / Rx)
- **SOAP Note Editor** — Full S·O·A·P form with ICD-10 search, draft/sign workflow
- **Prescription Generator** — Medication builder + printable letterhead preview

---

## AI Features

### AI Lab Analyzer (6 Panels)

| Panel | Key Capabilities |
|---|---|
| CBC | Microcytic/normocytic/macrocytic anemia classification, WBC differential, platelet severity |
| Lipid Profile | ACC/AHA 2019 risk stratification, Framingham risk, atherogenic index, TG/HDL ratio |
| LFT | R-ratio hepatocellular vs cholestatic, De Ritis ratio, synthetic dysfunction detection |
| KFT | KDIGO CKD staging (G1-G5), BUN/Cr pre-renal differentiation, electrolyte cascade |
| Diabetes | ADA 2024 criteria, HOMA-IR insulin resistance, eAG from HbA1c, complication staging |
| Thyroid | ATA classification (6 states), Hashimoto's vs Graves', thyroid storm risk |

**Clinical accuracy features:**
- Gender/age/pregnancy-specific reference ranges (e.g. female MCHC differs, pregnancy TSH 0.1-2.5)
- Deterministic post-processing: `correctFindingSeverities()` overrides AI with known reference tables
- Full value-traceable explainability: *"LDL is 185 mg/dL which exceeds the 160 mg/dL high threshold"*

### Medicine Scanner
- Upload any medicine packaging image
- Tesseract.js OCR (browser) → Groq Llama 4 Scout vision → drug identification
- Cross-reference: 60 hospital medicines + RxNorm (IN/BN/SCD results only, no combo packs)
- Image auto-compressed to 1024px JPEG before sending (prevents Groq 400 errors)

### AI Assistant
- Groq LLaMA 3.3-70B chat
- Healthcare-scoped (refuses non-medical questions)
- Floating widget persists across all authenticated pages

---

## Intelligent Billing

- **Auto-creation** on patient registration: ₹500 registration fee (category: `other`)
- **Auto-creation** on appointment booking: doctor's `consultationFee` (category: `consultation`)
- **"Cleared" status**: when `dueAmount` reaches ₹0, invoice shows green ✓ "Cleared" badge
- **Category bifurcation**: filter invoices by Consultation / Lab Tests / Medicines / Other / Room
- All 50 doctors have consultation fees: ₹1294 / ₹1296 / ₹1298 / ₹1300 (cycling)

---

## Patient Management

- **Discharge workflow**: Discharge button on patient detail → confirms → calls `PUT /patients/:id/discharge` → clears `isAdmitted`, sets `dischargeDate`, removes bed assignment
- **Re-admit**: Admit button visible when patient is outpatient
- **Timeline**: Every patient links to their clinical timeline in EMR
- Auto-billing on registration (₹500 fee)

---

## Staff & Doctor Assignment

- 15 staff members seeded (nurses, medical assistants, lab technicians)
- Each doctor has 2 assigned staff visible as avatar chips on their card
- API: `GET/POST /api/doctors/:id/staff`, `DELETE /api/doctors/:id/staff/:staffId`
- Staff roles: `nurse`, with departments matching doctor specializations

---

## Security

| Layer | Implementation |
|---|---|
| Authentication | JWT (15min access token) |
| Authorization | 9 RBAC roles: super_admin, hospital_admin, doctor, nurse, pharmacist, lab_technician, patient, receptionist, ambulance_staff |
| Rate Limiting | Tiered: `/auth/login` 10/15min, `/ai` 30/15min, general 500/15min |
| Input Sanitization | `express-mongo-sanitize` + `xss-clean` on all routes |
| CSP | Helmet with Content-Security-Policy enabled |
| Audit Trail | `ClinicalAuditLog` — every EMR operation logged with user, IP, resource, outcome |
| CORS | Configurable `FRONTEND_URL` allowlist |

---

## Pharmacy

- **60 medicines seeded** across categories: antibiotics, analgesics, antihypertensives, antidiabetics, gastro, antihistamines, statins, respiratory, vitamins, thyroid, cardiac, neuro/psych, injectables, antifungals, dermatology, ophthalmology
- **Medicine Scanner**: image → AI identification
- **RxNorm search**: clean results (Ingredient, Brand Name, Clinical Drug only — no combo packs)
- **Searchable names that work in RxNorm**: Amoxicillin, Ibuprofen, Metformin, Ondansetron, Atorvastatin, Ciprofloxacin, Azithromycin, Omeprazole, Pantoprazole, Cetirizine

---

## DevOps

### Docker
```bash
docker-compose up -d    # full stack with Redis, Kafka, MongoDB, monitoring
```

### Kubernetes (AWS EKS)
```bash
# 1. Bootstrap Terraform state
bash devops/scripts/bootstrap-terraform-state.sh

# 2. Provision infrastructure
cd devops/terraform && terraform init && terraform apply

# 3. Create K8s secrets from AWS Secrets Manager
bash devops/scripts/create-k8s-secrets.sh

# 4. Deploy
kubectl apply -f devops/kubernetes/
```

### Infrastructure (AWS)
- **EKS**: Private endpoint cluster, managed node groups
- **ECR**: Image repositories with scan-on-push
- **S3**: Terraform state with versioning + AES-256 encryption
- **MongoDB**: StatefulSet with gp3/100Gi persistent volume
- **Redis**: Caching for patient lists (60s) and analytics (30s)
- **Kafka**: Events: `patient.registered`, `appointment.created`, `appointment.cancelled`
- **Monitoring**: Prometheus + Grafana (docker-compose `--profile monitoring`)
- **Logging**: ELK stack (docker-compose `--profile logging`)
- **Tracing**: Jaeger OpenTelemetry (optional, set `JAEGER_ENDPOINT`)
- **CI/CD**: Jenkins pipeline with Trivy security scanning

### Environment Variables
Copy `.env.example` to `backend/.env` and fill all values. Required:
- `JWT_SECRET` — min 64 chars random string
- `MONGO_ROOT_PASSWORD` / `MONGODB_URI`
- `REDIS_PASSWORD`
- `GROQ_API_KEY` — from console.groq.com

---

## API Summary

| Group | Base | Key Endpoints |
|---|---|---|
| Auth | `/api/auth` | login, register, logout, forgot-password |
| Patients | `/api/patients` | CRUD, vitals, admit, discharge, allergies |
| Doctors | `/api/doctors` | CRUD, schedule, staff assignment |
| Appointments | `/api/appointments` | CRUD, cancel, today's list |
| EMR | `/api/emr` | records, soap, prescriptions, timeline, icd10/search, audit-logs |
| Billing | `/api/billing` | invoices, record payment (auto-cleared), stats |
| Pharmacy | `/api/pharmacy` | medicines, low-stock, expiring, RxNorm search |
| Lab | `/api/lab` | test ordering, results, AI analyzer |
| AI | `/api/ai` | chat, scan-medicine, emergency-guidance |
| AI Analyzer | `/api/ai-analyzer` | cbc, lipid, lft, kft, diabetes, thyroid |
| Analytics | `/api/analytics` | dashboard-stats, revenue-chart, appointment-stats |
| Blood Bank | `/api/blood-bank` | donors, units, requests |
| Staff | `/api/staff` | CRUD staff members |

Full API contracts: [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 16, Angular Material, TypeScript, Chart.js, Echarts |
| Backend | Node.js 20, Express, Mongoose, Socket.io |
| Database | MongoDB 7, Redis 7.2 |
| AI | Groq (LLaMA 3.3-70B text + Llama 4 Scout vision) |
| Messaging | Kafka (events), Socket.io (real-time) |
| DevOps | Docker, Kubernetes EKS, Terraform, Jenkins, Prometheus, Grafana |
| Security | JWT, Helmet CSP, xss-clean, express-mongo-sanitize, tiered rate limiting |

---

*MedCare 360 v4.0 — Enterprise Healthcare Platform*
