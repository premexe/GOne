# GOne — LifeLink AI · Hospital Admin Dashboard Report

> **Document Type:** Technical & Feature Report  
> **Generated:** September 2026  
> **Project Name:** GOne / LifeLink AI  
> **Component:** Hospital Emergency Admin Dashboard  
> **File Location:** `frontend/app/admin/index.tsx`  
> **Route:** `/admin`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Position](#2-architecture-position)
3. [Technology Stack](#3-technology-stack)
4. [Authentication and Access Control](#4-authentication-and-access-control)
5. [Dashboard Features](#5-dashboard-features)
6. [SOS Case Lifecycle](#6-sos-case-lifecycle)
7. [Real-Time Polling Architecture](#7-real-time-polling-architecture)
8. [UI Components and Layout](#8-ui-components-and-layout)
9. [Backend Connection and API Endpoints](#9-backend-connection-and-api-endpoints)
10. [Backend Services Used](#10-backend-services-used)
11. [Data Models](#11-data-models)
12. [Hospital Management](#12-hospital-management)
13. [Ambulance and Doctor Assignment](#13-ambulance-and-doctor-assignment)
14. [Email and Notification Integration](#14-email-and-notification-integration)
15. [G-ONE AI Integration](#15-g-one-ai-integration)
16. [Backend Architecture (FastAPI)](#16-backend-architecture-fastapi)
17. [Database Schema](#17-database-schema)
18. [Environment Configuration](#18-environment-configuration)
19. [Backend Dependencies](#19-backend-dependencies)
20. [Security Model](#20-security-model)
21. [Demo Hospital Credentials](#21-demo-hospital-credentials)

---

## 1. Overview

The **Hospital Emergency Admin Dashboard** is the command-and-control interface for hospital emergency triage staff. It is embedded directly inside the LifeLink AI mobile app and runs at the `/admin` route.

### Purpose
Hospital administrators use this dashboard to:

- **Monitor** all incoming SOS alerts in real time (3-second polling).
- **Triage and respond** to emergency cases by accepting or rejecting each SOS.
- **Track the full dispatch lifecycle** through 5 defined milestones.
- **Progress cases** manually: Accepted → Patient Picked Up → Arrived at Hospital → Completed.
- **Review completed cases** with full patient history and dispatch timeline.

### Who Uses It
- Emergency room triage nurses and coordinators.
- Hospital dispatch officers.
- Ambulance coordination staff.

---

## 2. Architecture Position

```
+--------------------------------------------------+
|         LifeLink AI Mobile App                   |
|                                                  |
|  [Patient App]  |  [Admin Dashboard /admin]      |
|  - SOS Trigger  |  - Live SOS Queue              |
|  - Track Screen |  - Accept / Reject             |
|  - Wallet / QR  |  - Dispatch Progression        |
+--------------------------------------------------+
                      |
                      | REST API (same backend)
                      v
+--------------------------------------------------+
|          FastAPI Backend (Port 8000)             |
|  /sos/  /hospitals/  /ambulances/  /doctors/     |
|  PostgreSQL (Supabase)                           |
|  G-ONE AI Module  Bland AI  Resend Email         |
+--------------------------------------------------+
```

The Admin Dashboard shares the same FastAPI backend and `api.ts` service layer as the patient-facing app. There is no separate admin server.

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | React Native (Expo SDK 57) | Cross-platform |
| **Language** | TypeScript | Strict typing |
| **Routing** | Expo Router | Route: `/admin` |
| **State** | React useState / useCallback | Local component state |
| **Icons** | lucide-react-native | MapPin, Siren, Truck, Building2, etc. |
| **Polling** | setInterval (3-second) | Real-time SOS queue refresh |
| **API** | src/services/api.ts | Shared with patient app |
| **Theme** | src/constants/theme.ts | Shared COLORS, SPACING |

---

## 4. Authentication and Access Control

### Hospital Admin vs. Patient Auth

| Aspect | Patient App | Hospital Admin Dashboard |
|---|---|---|
| Credentials stored in | users table | hospitals table |
| Login endpoint | POST /users/login | POST /hospitals/login |
| JWT payload | {"sub": user_id} | {"sub": hospital_id, "role": "hospital"} |
| Password hashing | bcrypt via passlib | bcrypt via passlib |

### Hospital Login Flow
1. Hospital staff opens `/admin`.
2. Enters hospital email + password.
3. `POST /hospitals/login` validates against `hospitals.email` + `hospitals.password_hash`.
4. Returns `access_token` + hospital metadata.
5. Token stored in-app; hospital ID pre-filled in dashboard.

---

## 5. Dashboard Features

### Hospital ID Selector Bar
```
[ HOSPITAL ID: ] [ 1 ] [ SYNC ]
```
- Configurable hospital ID input for multi-hospital staff.
- SYNC button forces immediate data refresh.
- Default: `process.env.EXPO_PUBLIC_HOSPITAL_ID || '1'`.

### Active Queue Tab
- Shows all currently active SOS alerts assigned to or pending acceptance.
- Red count badge shows number of pending emergencies.
- Auto-refreshes every 3 seconds.

### Completed Cases Tab
- Shows all resolved/completed SOS cases for the hospital.
- Green count badge shows total completed cases.
- Useful for post-shift audit.

### SOS Admin Card Fields

| Field | Description |
|---|---|
| Patient Name | From SOS record or Patient #<user_id> fallback |
| Patient Phone | Shown with phone emoji for quick callback |
| Status Badge | Color-coded: NEW SOS / ACCEPTED / PICKED UP / AT HOSPITAL / COMPLETED |
| Emergency Details | Patient-described or AI-extracted description |
| GPS Coordinates | Latitude and longitude (or "GPS location pending") |
| Case Activity Milestones | Visual 5-step stepper with timestamps |
| Action Buttons | Context-sensitive action buttons |

### Status Badge Color System

| Status | Badge Color | Text Color |
|---|---|---|
| NEW SOS | Red tint | Red |
| ACCEPTED | Green tint | Green |
| PICKED UP | Blue tint | Blue |
| AT HOSPITAL | Purple tint | Purple |
| COMPLETED | Green tint (darker) | Green |

---

## 6. SOS Case Lifecycle

```
[NEW SOS]
    |
    | Admin: ACCEPT EMERGENCY
    v
[ACCEPTED]  dispatch_status = ACCEPTED, hospital_id linked
    |
    | Admin: CONFIRM PATIENT PICKUP
    v
[PICKED UP]  dispatch_status = PICKED_UP
    |
    | Admin: MARK ARRIVED AT HOSPITAL
    v
[AT HOSPITAL]  dispatch_status = ARRIVED_AT_HOSPITAL
    |
    | Admin: COMPLETE EMERGENCY CASE
    v
[COMPLETED]  dispatch_status = COMPLETED, status = RESOLVED
             Resources (ambulance, doctor) released to AVAILABLE pool
```

### Dispatch Status Values

| Value | Meaning |
|---|---|
| RECEIVED | SOS created, not yet actioned |
| ACCEPTED | Hospital accepted the SOS |
| AMBULANCE_ASSIGNED | Ambulance assigned to case |
| EN_ROUTE | Ambulance en route to patient |
| PICKED_UP / PATIENT_PICKED_UP | Patient picked up |
| ARRIVED_AT_HOSPITAL / ARRIVED | At emergency bay |
| COMPLETED | Case closed, resources released |

### Rejection Flow
- REJECT creates a `SOSRejection` record.
- SOS stays ACTIVE — other hospitals can still accept it.
- Patient app shows the rejection in `rejectedHospitals` list.
- Multiple hospitals can reject; first to accept wins the case.

---

## 7. Real-Time Polling Architecture

```typescript
useEffect(() => {
  loadData();                              // initial load on mount
  const timer = setInterval(loadData, 3000); // poll every 3 seconds
  return () => clearInterval(timer);       // cleanup on unmount
}, [loadData]);
```

### loadData() — Parallel Fetch
```typescript
const [live, comp] = await Promise.all([
  api.getAdminSOSAlerts(hospitalId),       // GET /sos/?hospital_id=<id>
  api.getCompletedSOSAlerts(hospitalId),   // GET /sos/completed?hospital_id=<id>
]);
```

Both lists are fetched in parallel using `Promise.all` for minimal latency. Pull-to-refresh is also supported via `RefreshControl` on the `FlatList`.

---

## 8. UI Components and Layout

### Screen Layout

```
+--------------------------------------------------+
| Emergency Admin   Triage Control & Dispatch   [X]|  <- Header + Close
+--------------------------------------------------+
| HOSPITAL ID: [1]                         [SYNC]  |  <- Selector Bar
+--------------------------------------------------+
| [ACTIVE QUEUE (3)]  |  [COMPLETED CASES (12)]    |  <- Tab Bar
+--------------------------------------------------+
|  [Siren] Patient Name                [NEW SOS]   |
|  Phone: +91 XXXXXXX                              |
|  EMERGENCY DETAILS / SYMPTOMS                    |
|  Chest pain, difficulty breathing                |
|  [MapPin] 19.69712, 72.76601                     |
|                                                  |
|  CASE ACTIVITY & MILESTONES                      |
|  [green] 1. SOS Broadcast Received     10:32     |
|  [grey]  2. Hospital Admission Accepted Pending  |
|  [grey]  3. Patient Picked Up          Pending   |
|  [grey]  4. Arrived at Hospital Bay    Pending   |
|  [grey]  5. Case Completed & Admitted  Pending   |
|                                                  |
|  [ACCEPT EMERGENCY]         [REJECT]             |
+--------------------------------------------------+
```

### Action Button States

| Case State | Buttons Shown |
|---|---|
| status === ACTIVE (new) | ACCEPT EMERGENCY (green) + REJECT (red) |
| Accepted, not picked up | CONFIRM PATIENT PICKUP (blue, Truck icon) |
| Picked up, not arrived | MARK ARRIVED AT HOSPITAL (purple, Building2 icon) |
| Arrived, not completed | COMPLETE EMERGENCY CASE (green, CheckCircle2 icon) |
| Completed | "Case Closed - Medical Records Synced" (green notice) |
| Updating | ActivityIndicator spinner |

---

## 9. Backend Connection and API Endpoints

### Admin-Specific Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| /hospitals/login | POST | Hospital admin authentication |
| /hospitals/:id | GET | Get hospital info |
| /hospitals/:id/resources | GET | Live bed, ambulance, doctor counts |
| /hospitals/:id/beds | PATCH | Update bed occupancy |
| /sos/ | GET | Active SOS alerts (hospital_id filter) |
| /sos/completed | GET | Completed SOS alerts (hospital_id filter) |
| /sos/:id/accept | POST | Accept a SOS alert |
| /sos/:id/reject | POST | Reject a SOS alert (with reason) |
| /sos/:id/status | PATCH | Update dispatch status milestone |
| /ambulances/ | GET / POST | List / add ambulances |
| /ambulances/:id | PUT / DELETE | Update / remove ambulance |
| /doctors/ | GET / POST | List / add doctors |
| /doctors/:id | PUT / DELETE | Update / remove doctor |
| /sos/:id/assign-ambulance | POST | Assign ambulance to SOS |
| /sos/:id/assign-doctor | POST | Assign doctor to SOS |

### Accept SOS Request Example

```http
POST /sos/42/accept
Authorization: Bearer <hospital-jwt>
Content-Type: application/json

{ "hospital_id": 1 }
```

Response:
```json
{
  "sos_id": 42,
  "status": "ACCEPTED",
  "dispatch_status": "ACCEPTED",
  "accepted_hospital_id": 1
}
```

### Update Dispatch Status Example

```http
PATCH /sos/42/status
Authorization: Bearer <hospital-jwt>
Content-Type: application/json

{ "status": "PICKED_UP" }
```

---

## 10. Backend Services Used

### SOSService (backend/app/services/sos_service.py)

| Method | Description |
|---|---|
| create_sos() | Creates SOS, triggers Bland AI voice call in background thread |
| get_all_active_sos() | Returns active SOS records filtered by hospital |
| get_completed_sos() | Returns RESOLVED SOS records |
| accept_sos() | Marks SOS as ACCEPTED, links hospital |
| reject_sos() | Creates SOSRejection record, SOS stays ACTIVE |
| update_dispatch_status() | Advances milestones, releases resources on COMPLETED |
| assign_ambulance() | Assigns ambulance, sets to EN_ROUTE |
| assign_doctor() | Assigns doctor, increments current_cases |
| resolve_sos() | Patient-side resolution, releases resources |
| _release_resources() | Returns ambulance to AVAILABLE, decrements doctor case count |

### VoiceService (backend/app/services/voice_service.py)

| Feature | Detail |
|---|---|
| API | Bland AI REST API (https://api.bland.ai/v1) |
| Trigger | Auto-called in create_sos() if user phone present |
| Thread | Daemon background thread (non-blocking) |
| Phone Format | E.164 normalization (+91XXXXXXXXXX) |
| AI Voice | Configurable via BLAND_VOICE env var (default: "maya") |
| Transcript | Stored in sos.call_transcript |
| Summary | Clinical call summary in sos.call_summary |
| Call Status | PENDING -> IN_PROGRESS -> COMPLETED / FAILED |
| Post-Call | Triggers EmailService.send_sos_email() |

### EmailService (backend/app/services/email_service.py)

Sends HTML-formatted emergency alert emails via Resend / SMTP.

Recipients:
- Patient email (if available)
- All emergency contacts with email addresses

Email content includes:
- Severity banner (color-coded: CRITICAL=red, HIGH=orange, MODERATE=amber, LOW=green)
- Patient name, phone, blood group
- Allergies, medications, chronic conditions
- Emergency description + GPS coordinates + Google Maps link
- AI emergency report
- Bland AI call transcript

### AIPipelineService (backend/app/services/ai_pipeline_service.py)

Input sources:
- Emergency description from SOS payload
- Emergency wallet from emergency_wallets table
- Medical records from medical_records table
- GPS coordinates from SOS payload

Output stored in SOS record:
- ai_emergency_understanding — Brief classification summary
- ai_severity — CRITICAL / HIGH / MODERATE / LOW / UNKNOWN
- ai_required_capabilities — Comma-separated required hospital capabilities
- ai_health_summary — Structured patient health context
- ai_emergency_report — Full formatted incident report

---

## 11. Data Models

### AdminSOSAlert (Frontend TypeScript)

```typescript
type AdminSOSAlert = {
  id: string;
  patientName: string;
  patientPhone?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  status: string;           // ACTIVE | ACCEPTED | IN_PROGRESS | RESOLVED
  dispatchStatus?: string;  // RECEIVED | ACCEPTED | PICKED_UP | ARRIVED_AT_HOSPITAL | COMPLETED
  createdAt: string;
};
```

### SOS (Backend SQLAlchemy Model)

Key columns:
- sos_id (PK), user_id (FK), description, latitude, longitude
- status: ACTIVE | ACCEPTED | IN_PROGRESS | RESOLVED
- dispatch_status: RECEIVED | ACCEPTED | AMBULANCE_ASSIGNED | EN_ROUTE | PICKED_UP | ARRIVED_AT_HOSPITAL | COMPLETED
- accepted_hospital_id (FK), assigned_ambulance_id (FK), assigned_doctor_id (FK)
- patient_name, patient_phone
- ai_emergency_understanding, ai_severity, ai_required_capabilities, ai_health_summary, ai_emergency_report
- call_sid, call_status, call_transcript, call_summary, email_sent
- created_at, resolved_at

---

## 12. Hospital Management

### Hospital Model Key Fields

| Field | Type | Description |
|---|---|---|
| hospital_id | Integer PK | Unique identifier |
| name | String(150) | Hospital name |
| address | String(255) | Street address |
| latitude / longitude | Float | GPS coordinates (default: Palghar region) |
| total_beds | Integer | General ward bed count (default: 100) |
| icu_beds | Integer | ICU bed count (default: 10) |
| oxygen_beds | Integer | Oxygen/emergency beds (default: 15) |
| general_occupied | Integer | Occupied general beds |
| icu_occupied | Integer | Occupied ICU beds |
| emergency_occupied | Integer | Occupied emergency beds |
| phone_number | String(50) | Contact number |
| rating | Float | Rating (default: 4.8) |
| email | String(150) unique | Admin login email |
| password_hash | String(255) | bcrypt hashed password |

### Hospital API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /hospitals/login | Admin authentication |
| GET | /hospitals/ | List all (seeds demo on first call) |
| GET | /hospitals/:id | Get single hospital |
| GET | /hospitals/:id/resources | Live beds + ambulances + doctors |
| POST | /hospitals/ | Register new hospital |
| PUT | /hospitals/:id | Update hospital details |
| PATCH | /hospitals/:id/beds | Update bed occupancy counters |

---

## 13. Ambulance and Doctor Assignment

### Ambulance Fields
- ambulance_id (PK), hospital_id (FK), vehicle_number, driver_name, driver_phone
- status: AVAILABLE | EN_ROUTE | ON_SITE

### Doctor Fields
- doctor_id (PK), hospital_id (FK), name, specialization, department, phone
- current_cases (Integer) — tracks active caseload

### Assignment Rules (Enforced by SOSService)
- Ambulance must belong to the accepting hospital.
- Ambulance must be AVAILABLE status.
- Auto-set to EN_ROUTE when assigned.
- Returned to AVAILABLE on case completion.
- Doctor current_cases incremented on assignment, decremented on completion.
- Both assignments require hospital to have first accepted the SOS.

---

## 14. Email and Notification Integration

### Email Flow

```
SOS Created
    |
    v
Bland AI voice call completes (or timeout)
    |
    v
EmailService.send_sos_email(db, sos_id)
    |
    +---> HTML email with severity-coded banner
    +---> Sends to patient email (if available)
    +---> Sends to all emergency contacts with emails
    |
    v
sos.email_sent = 1, sos.email_sent_at = NOW()
```

### Environment Variables
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<resend-api-key>
EMAIL_FROM=LifeLink Emergency <alerts@yourdomain.com>
```

### Notification Records

| Field | Values |
|---|---|
| recipient_type | EMERGENCY_CONTACT, HOSPITAL |
| channel | SMS, PUSH |
| status | PENDING -> SENT -> DELIVERED / FAILED |
| sent_at | Timestamp when status = SENT |

Status transitions enforced:
- PENDING can go to SENT or FAILED.
- SENT can go to DELIVERED.
- DELIVERED and FAILED are terminal states.

---

## 15. G-ONE AI Integration

### Tri-Tier Pipeline

```
Emergency Description + Patient Wallet + Medical Records
                        |
                        v
             [Tier 1: Gemini API]      <- GEMINI_API_KEY
             google-genai >= 0.3
                   |
            (if Gemini fails)
                   v
             [Tier 2: Ollama]          <- Local LLM
                   |
            (if Ollama fails)
                   v
             [Tier 3: Deterministic Rules]  <- Always succeeds
                   |
                   v
         Structured AI Response:
         - emergency_understanding
         - severity (CRITICAL/HIGH/MODERATE/LOW/UNKNOWN)
         - required_medical_capability
         - ai_health_summary
         - emergency_report
```

### AI Results Used by Admin Dashboard
- ai_emergency_understanding — shown as Emergency Details / Symptoms on the SOS card.
- ai_severity — severity level available for triaging decisions.
- ai_emergency_report — included in email sent to emergency contacts.

---

## 16. Backend Architecture (FastAPI)

### Entry Point (backend/app/main.py)

```python
app = FastAPI(title="LifeLink AI API")
app.add_middleware(CORSMiddleware, allow_origins=["*"])
Base.metadata.create_all(bind=engine)
run_migrations()

# Routers
app.include_router(user_router)                   # /users/
app.include_router(emergency_wallet_router)       # /wallet/
app.include_router(sos_router)                    # /sos/
app.include_router(emergency_contact_router)      # /emergency-contacts/
app.include_router(emergency_response_router)     # /responses/
app.include_router(notification_router)           # /notifications/
app.include_router(emergency_orchestration_router) # /emergency/
app.include_router(medical_records_router)        # /medical-records/
app.include_router(hospital_router)              # /hospitals/
app.include_router(doctors_router)               # /doctors/
app.include_router(ambulances_router)            # /ambulances/
app.include_router(voice_router)                 # /voice/
```

### Backend Project Structure

```
backend/
+-- app/
|   +-- main.py                   # FastAPI app + router registration
|   +-- database/
|   |   +-- base.py               # SQLAlchemy declarative base
|   |   +-- connection.py         # Engine + DATABASE_URL
|   |   +-- session.py            # SessionLocal + get_db dependency
|   |   +-- migrations.py        # Lightweight ALTER TABLE migrations
|   +-- models/                   # SQLAlchemy ORM models
|   +-- routers/                  # FastAPI route handlers
|   +-- services/                 # Business logic layer
|   +-- schemas/                  # Pydantic request/response models
|   +-- repositories/             # Data access layer (CRUD)
|   +-- security/
|       +-- jwt.py               # create_access_token, decode_token
|       +-- password.py          # hash_password, verify_password
+-- gone_ai_module/              # G-ONE AI Triage Pipeline (Tri-Tier)
+-- uploads/
|   +-- medical_records/         # Uploaded patient documents
+-- .env                         # Environment variables
+-- requirements.txt
+-- seed_palghar_hospitals.py    # Hospital data seeder script
```

---

## 17. Database Schema

### Core Tables

| Table | Primary Key | Key Columns |
|---|---|---|
| users | user_id | full_name, email, phone_number, blood_group, password_hash |
| hospitals | hospital_id | name, email, password_hash, lat, lng, total_beds, icu_beds, oxygen_beds, general_occupied, icu_occupied, emergency_occupied |
| ambulances | ambulance_id | hospital_id (FK), vehicle_number, driver_name, driver_phone, status |
| doctors | doctor_id | hospital_id (FK), name, specialization, department, phone, current_cases |
| sos | sos_id | user_id (FK), accepted_hospital_id (FK), assigned_ambulance_id (FK), assigned_doctor_id (FK), status, dispatch_status, ai_* fields, call_* fields |
| sos_rejections | rejection_id | sos_id (FK), hospital_id (FK), reason |
| emergency_wallets | wallet_id | user_id (FK), blood_group, allergies, medications, chronic_conditions, emergency_notes |
| emergency_contacts | contact_id | user_id (FK), name, relationship, phone_number, email, is_primary |
| medical_records | record_id | user_id (FK), title, record_type, file_path, ocr_text |
| notifications | notification_id | user_id (FK), response_id (FK), recipient_type, channel, status, message |
| emergency_responses | response_id | user_id (FK), sos_id (FK), hospital_id (FK), status |

### Key Relationships

```
users          --> sos (one-to-many)
users          --> emergency_wallets (one-to-one)
users          --> emergency_contacts (one-to-many)
users          --> medical_records (one-to-many)
hospitals      --> doctors (one-to-many, cascade delete)
hospitals      --> ambulances (one-to-many, cascade delete)
sos            --> sos_rejections (one-to-many, cascade delete)
sos.hospital   --> hospitals (many-to-one)
sos.ambulance  --> ambulances (many-to-one)
sos.doctor     --> doctors (many-to-one)
```

---

## 18. Environment Configuration

### backend/.env

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:6543/postgres

# JWT Authentication
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# OCR (Tesseract)
POPPLER_PATH=C:\path\to\poppler\bin

# G-ONE AI Module — Tier 1 Gemini
GEMINI_API_KEY=<your-gemini-api-key>

# Agora In-App Voice Calling
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERTIFICATE=<your-agora-certificate>
AGORA_SECONDARY_CERTIFICATE=<secondary-certificate>
AGORA_TOKEN_TTL=3600

# Bland AI Voice Calls
BLAND_API_KEY=<your-bland-api-key>
BLAND_VOICE=maya
ENABLE_SOS_VOICE_CALLS=true

# Email Delivery (Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<your-resend-api-key>
EMAIL_FROM=LifeLink Emergency <alerts@yourdomain.com>
```

---

## 19. Backend Dependencies

| Package | Purpose |
|---|---|
| fastapi | REST API framework |
| uvicorn[standard] | ASGI web server |
| gunicorn | Production ASGI server |
| sqlalchemy | ORM + query builder |
| psycopg2-binary | PostgreSQL driver |
| python-dotenv | .env file loader |
| pydantic | Request/response validation |
| pyjwt | JWT creation |
| python-jose[cryptography] | JWT decode/verify |
| python-multipart | Multipart file uploads |
| passlib | Password hashing utilities |
| bcrypt | bcrypt hashing algorithm |
| pdf2image | PDF to image (OCR pre-processing) |
| pillow | Image processing |
| pypdf | PDF parsing |
| pytesseract | Tesseract OCR wrapper |
| email-validator | Email format validation |
| google-genai >= 0.3, < 1.0 | Gemini AI API (G-ONE Tier 1) |
| agora-token-builder >= 1.0.0 | Agora RTC token generation |

---

## 20. Security Model

### JWT Authentication

| Aspect | Detail |
|---|---|
| Algorithm | HS256 |
| Secret | JWT_SECRET_KEY from environment |
| Expiry | 30 minutes (configurable) |
| Patient JWT payload | {"sub": "<user_id>"} |
| Hospital JWT payload | {"sub": "<hospital_id>", "email": "<email>", "role": "hospital"} |

### Password Security

| Aspect | Detail |
|---|---|
| Algorithm | bcrypt via passlib |
| Patient passwords | Stored in users.password_hash |
| Hospital passwords | Stored in hospitals.password_hash |
| Verification | verify_password(plain, hashed) |

### Access Control Rules (SOS Endpoints)

| Rule | Enforcement |
|---|---|
| Only SOS owner can update location | sos.user_id != user_id -> 403 |
| Only SOS owner can resolve | sos.user_id != user_id -> 403 |
| Only accepting hospital ambulances assignable | ambulance.hospital_id != accepted_hospital_id -> 403 |
| Cannot accept already-accepted SOS | accepted_hospital_id already set -> 409 |
| Cannot reject a RESOLVED SOS | status check -> 409 |
| Cannot update status of RESOLVED SOS (except COMPLETED) | enforced in service layer |

---

## 21. Demo Hospital Credentials

These hospitals are automatically seeded on first call to GET /hospitals/ or POST /hospitals/login:

| Hospital Name | Email | Password | Default Hospital ID |
|---|---|---|---|
| CityCare Hospital | citycare@lifelink.demo | Demo@123 | 1 |
| Metro General Hospital | metro@lifelink.demo | Demo@123 | 2 |
| Lifeline Medical Centre | lifeline@lifelink.demo | Demo@123 | 3 |
| Harbourview Emergency Hospital | harbourview@lifelink.demo | Demo@123 | 4 |

### Hospital Resources

| Hospital | Total Beds | ICU Beds | Emergency Beds | Location |
|---|---|---|---|---|
| CityCare | 200 | 40 | 40 | 19.697, 72.766 |
| Metro General | 150 | 30 | 35 | 19.710, 72.790 |
| Lifeline Medical | 120 | 25 | 30 | 19.680, 72.740 |
| Harbourview | 180 | 35 | 45 | 19.725, 72.755 |

All hospitals are located in the **Palghar, Maharashtra** region.

---

*This report was generated from source code analysis of the GOne / LifeLink AI project — September 2026.*
