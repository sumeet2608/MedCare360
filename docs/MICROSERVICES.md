# MedCare 360 — Microservices Design

## Service Registry

| Service              | Port | Responsibility                          | DB                    |
|----------------------|------|-----------------------------------------|-----------------------|
| API Gateway          | 3000 | JWT auth, rate limiting, proxy routing  | Redis                 |
| Auth Service         | 3001 | Login, register, 2FA, refresh, audit    | medcare360_auth       |
| Patient Service      | 3002 | Patient CRUD, vitals, medical history   | medcare360_patients   |
| Doctor Service       | 3003 | Doctor profiles, availability, search   | medcare360_doctors    |
| Appointment Service  | 3004 | Booking, queue, Socket.io live queue    | medcare360_appointments|
| Pharmacy Service     | 3005 | Medicine inventory, prescriptions       | medcare360_pharmacy   |
| Billing Service      | 3006 | Invoicing, payments, insurance          | medcare360_billing    |
| Lab Service          | 3007 | Test catalog, orders, results           | medcare360_lab        |
| Ambulance Service    | 3008 | Dispatch, GPS tracking, Socket.io       | medcare360_ambulance  |
| Notification Service | 3009 | Kafka consumer, email, Socket.io emit   | Redis (queue storage) |
| AI Service           | 3010 | Groq AI: chat, symptom, scan, emergency | Redis (cache)         |
| Analytics Service    | 3011 | KPI counters, Kafka consumer, trends    | medcare360_analytics  |
| Inventory Service    | 3012 | Stock management, POs, low-stock alerts | medcare360_inventory  |
| Backend (core)       | 5000 | Blood bank, beds, OT, telemedicine, legacy | medcare360        |

## Service Communication

### Synchronous (HTTP via API Gateway)
- All client → API Gateway → service calls
- Health checks: GET /health on each service
- Metrics: GET /metrics (Prometheus scrape)

### Asynchronous (Kafka Events)
Services communicate state changes through Kafka topics without direct coupling.

Example flow — Patient Books Appointment:
```
Client → API Gateway → Appointment Service
  → Kafka: appointment.events { type: 'appointment.created' }
    ├── Notification Service → sends confirmation email + Socket.io push
    ├── Analytics Service → increments daily appointment counter
    └── Billing Service → creates pending invoice if needed
```

### Real-Time (Socket.io)
```
Ambulance driver app → WebSocket → Ambulance Service
  → Redis: ambulance:location:{id} (30s TTL)
  → Socket.io broadcast → tracking:{id} room → Patient's browser shows live GPS
```

## Health Check Contract

Every service implements:
```json
GET /health → 200 OK
{
  "status": "healthy",
  "service": "patient-service",
  "version": "1.0.0",
  "uptime": 3600,
  "mongodb": "ok"
}
```

## Resilience Patterns

| Pattern           | Implementation                                    |
|-------------------|---------------------------------------------------|
| Retry             | kafkajs retry config, ioredis retryStrategy       |
| Timeout           | Express request timeout middleware                |
| Circuit Breaker   | Kafka publish wrapped in try/catch, app continues |
| Graceful shutdown | SIGTERM handler: flush Kafka, close Redis + Mongo |
| Health probes     | K8s liveness + readiness probes on /health        |
| HPA               | CPU 70% threshold, min 2 / max 8 replicas         |

## API Authentication Flow

```
1. Client: POST /api/auth/login { email, password, [totpCode] }
2. Auth Service: verify bcrypt, check 2FA TOTP, issue tokens
   → accessToken (JWT, 15m, RS256 or HS256)
   → refreshToken (stored in Redis, 7d)
3. Client: Authorization: Bearer {accessToken} on all subsequent requests
4. API Gateway: verify JWT signature → check Redis blacklist
   → proxy to target service with X-User-Id header
5. On expiry: POST /api/auth/refresh { refreshToken }
   → Auth Service issues new accessToken
6. Logout: POST /api/auth/logout
   → Access token added to Redis blacklist for remaining TTL
   → Refresh token deleted from Redis
```
