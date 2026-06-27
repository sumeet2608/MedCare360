# MedCare 360 — Enterprise Architecture

## System Overview

MedCare 360 is a cloud-native, microservices-based healthcare platform deployed on AWS EKS. It consists of 13 independent Node.js services behind an API Gateway, an Angular 16 SPA frontend, and a full observability stack.

## Architecture Diagram (Text)

```
Internet
    │
    ▼
Route53 (DNS)
    │
    ▼
CloudFront (CDN — Angular SPA + static assets from S3)
    │
    ▼
ALB (Application Load Balancer)
    │
    ├── /api/* ──► API Gateway (port 3000)
    │                   │ JWT Verify + Rate Limit + Request ID
    │                   ├── /auth/*        → Auth Service       :3001
    │                   ├── /patients/*    → Patient Service    :3002
    │                   ├── /doctors/*     → Doctor Service     :3003
    │                   ├── /appointments/*→ Appointment Service:3004
    │                   ├── /pharmacy/*    → Pharmacy Service   :3005
    │                   ├── /billing/*     → Billing Service    :3006
    │                   ├── /lab/*         → Lab Service        :3007
    │                   ├── /ambulance/*   → Ambulance Service  :3008
    │                   ├── /notifications/→ Notification Svc   :3009
    │                   ├── /ai/*          → AI Service         :3010
    │                   ├── /analytics/*   → Analytics Service  :3011
    │                   └── /inventory/*   → Inventory Service  :3012
    │
    └── /* ──────► Backend (port 5000)
                       Blood Bank, Beds, OT, Telemedicine, Staff, Legacy
```

## Data Layer

```
MongoDB (per-service databases):
  medcare360_auth         ← auth-service
  medcare360_patients     ← patient-service
  medcare360_doctors      ← doctor-service
  medcare360_appointments ← appointment-service
  medcare360_pharmacy     ← pharmacy-service
  medcare360_billing      ← billing-service
  medcare360_lab          ← lab-service
  medcare360_ambulance    ← ambulance-service
  medcare360_analytics    ← analytics-service
  medcare360_inventory    ← inventory-service
  medcare360              ← backend (blood bank, beds, OT, telemedicine)

Redis (shared, key namespacing):
  blacklist:{token}        ← JWT blacklist 15m TTL
  refresh:{userId}         ← Refresh tokens 7d TTL
  patient:{id}             ← Patient cache 5min
  doctors:*                ← Doctor list cache 1min
  ambulance:location:{id}  ← GPS location 30s TTL
  analytics:*              ← KPI counters 30-day TTL
  ai:cache:*               ← AI response cache 5min
```

## Event Bus (Kafka Topics)

| Topic               | Producer(s)               | Consumer(s)                              |
|---------------------|---------------------------|------------------------------------------|
| appointment.events  | appointment-service       | notification, analytics, billing         |
| prescription.events | pharmacy-service          | billing, notification                    |
| billing.events      | billing, lab              | analytics, notification                  |
| ambulance.events    | ambulance-service         | notification, analytics                  |
| inventory.events    | inventory-service         | notification                             |
| patient.events      | patient-service           | analytics, notification                  |
| auth.events         | auth-service              | analytics                                |

## Real-Time (Socket.io)

| Room              | Purpose                    |
|-------------------|----------------------------|
| user:{userId}     | Personal notifications     |
| admin-room        | Live dashboard updates     |
| queue:{deptId}    | OPD queue position         |
| ambulance:{id}    | GPS tracking broadcast     |
| tracking:{id}     | Patient tracking ambulance |

## AWS Infrastructure

```
VPC (10.0.0.0/16)
├── Public Subnets  (3 AZs) — NAT Gateways, ALB
└── Private Subnets (3 AZs) — EKS Nodes, ElastiCache, DocumentDB

EKS Cluster (medcare360-production)
├── System node group (2× t3.medium)
└── App node group  (3–10× t3.medium, HPA auto-scales)

Managed Services:
├── ElastiCache Redis   — Sessions, cache, pub/sub
├── DocumentDB          — MongoDB-compatible
├── S3                  — Frontend assets, uploads, ALB logs
├── CloudFront          — CDN for Angular SPA + S3 assets
├── ECR                 — Container registry (13 service images)
├── Secrets Manager     — JWT secrets, DB passwords, API keys
├── SNS + SQS           — Async notifications + dead-letter queue
└── CloudWatch          — Logs, metrics, alarms, dashboards
```

## Security Architecture

```
Edge:         CloudFront WAF — SQL injection, XSS, rate limits
API Gateway:  JWT verification → Redis blacklist → proxy
Auth:         bcrypt(12), TOTP 2FA, dual-token (15m/7d)
RBAC:         9 roles — super_admin to patient
K8s:          Non-root UID 1001, network policies, Secrets Manager
HIPAA:        Audit logs (1-year TTL), encrypted at rest + transit
```

## Observability Stack

```
Metrics:  Prometheus scrapes /metrics → Grafana dashboards
Traces:   OpenTelemetry SDK → Jaeger distributed tracing
Logs:     Winston JSON → Filebeat → Elasticsearch → Kibana
Alerts:   AlertManager → Slack (#critical) + Email + PagerDuty
Health:   GET /health on every service (K8s liveness/readiness)
```
