# GOne / LifeLink AI+ — Complete Project Reference

> **Type:** Master Technical Reference — Generated from Source Code
> **Date:** October 2026
> **Version:** As-built (EAS preview APK build in progress)
> **Scope:** Every file in the project read, analysed, and documented here.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Backend — FastAPI Server](#4-backend--fastapi-server)
   - 4.1 Entry Point & Router Registration
   - 4.2 Database Engine & Fallback
   - 4.3 Auto-Migrations
   - 4.4 Auto-Seeder
5. [Backend — Complete API Catalog](#5-backend--complete-api-catalog)
   - 5.1 Users (`/users`)
   - 5.2 Hospitals (`/hospitals`)
   - 5.3 SOS (`/sos`)
   - 5.4 Emergency Contacts (`/emergency-contacts`)
   - 5.5 Emergency Wallet (`/wallet`)
   - 5.6 Medical Records (`/medical-records`)
   - 5.7 Ambulances (`/hospitals/{id}/ambulances`)
   - 5.8 Doctors (`/hospitals/{id}/doctors`)
   - 5.9 Voice & G-ONE ResQ (`/voice`)
   - 5.10 Notifications (`/notifications`)
   - 5.11 Emergency Response (`/emergency-response`)
   - 5.12 Emergency Orchestration (`/emergency`)
6. [Backend — Database Models](#6-backend--database-models)
7. [Backend — Services Layer](#7-backend--services-layer)
8. [Backend — Security](#8-backend--security)
9. [Backend — OCR Pipeline](#9-backend--ocr-pipeline)
10. [G-ONE ResQ AI Engine](#10-g-one-resq-ai-engine)
11. [Email Service (Resend SMTP)](#11-email-service-resend-smtp)
12. [Frontend — Technology Stack](#12-frontend--technology-stack)
13. [Frontend — Navigation Structure](#13-frontend--navigation-structure)
14. [Frontend — Screens Reference](#14-frontend--screens-reference)
15. [Frontend — Components Reference](#15-frontend--components-reference)
16. [Frontend — Zustand Stores](#16-frontend--zustand-stores)
17. [Frontend — Services Layer](#17-frontend--services-layer)
18. [Frontend — Design System](#18-frontend--design-system)
19. [Frontend — Emergency AI Triage (3-Layer)](#19-frontend--emergency-ai-triage-3-layer)
20. [Frontend — GOneResQCallModal Deep Dive](#20-frontend--goneresqcallmodal-deep-dive)
21. [SOS Full Lifecycle](#21-sos-full-lifecycle)
22. [Hospital Admin Dashboard](#22-hospital-admin-dashboard)
23. [Environment Variables](#23-environment-variables)
24. [EAS Build & Deployment](#24-eas-build--deployment)
25. [Demo Credentials](#25-demo-credentials)
26. [Implementation Plan Summary](#26-implementation-plan-summary)
27. [Project Status](#27-project-status)

---

## 1. Project Overview

**GOne / LifeLink AI+** is an emergency medical response platform combining:

- A **React Native / Expo** mobile app (patient-facing + hospital admin in one bundle)
- A **FastAPI** Python backend with 12 routers, PostgreSQL (Supabase) + SQLite fallback
- **G-ONE ResQ** — an AI voice triage companion that guides patients through emergencies
- A **3-layer AI provider** stack: Gemini 2.5 Flash → Groq llama-3.3-70b → Deterministic protocols
- A **5-stage emergency dispatch** lifecycle tracked in real-time by both patient and hospital

**Production Backend URL:** `https://lifelink-backend-1tzq.onrender.com`

**EAS Project:** `https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds`

---

## 2. Repository Layout

```
GOne/
├── frontend/                     React Native / Expo SDK 57 app
│   ├── app/                      Expo Router screens (file-based routing)
│   │   ├── _layout.tsx           Root layout — session restore, redirect guard
│   │   ├── index.tsx             Splash redirect
│   │   ├── (auth)/
│   │   │   └── login.tsx         Login + register + biometric unlock
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       Bottom tab navigator (uses custom BottomNav)
│   │   │   ├── index.tsx         Home dashboard — readiness, SOS button, hospitals
│   │   │   ├── hospitals.tsx     Hospital list with distance ranking
│   │   │   ├── profile.tsx       User profile, wallet editor, contacts
│   │   │   └── wallet.tsx        Offline emergency wallet + QR code
│   │   ├── sos/
│   │   │   ├── emergency.tsx     SOS confirmation + GPS dispatch
│   │   │   ├── provide-info.tsx  Symptom + condition input
│   │   │   ├── resq.tsx          G-ONE ResQ voice companion screen
│   │   │   └── track.tsx         Live 5-stage dispatch tracker (37 KB)
│   │   ├── admin/
│   │   │   └── index.tsx         Hospital emergency command center (23 KB)
│   │   ├── hospitals/
│   │   │   └── [id].tsx          Hospital detail view
│   │   ├── records/
│   │   │   ├── index.tsx         Medical records list + upload
│   │   │   └── [id].tsx          Medical record detail with OCR/AI summary
│   │   ├── readiness/
│   │   │   └── index.tsx         Readiness score breakdown
│   │   ├── learn/
│   │   │   ├── index.tsx         First-aid education article list
│   │   │   └── [id].tsx          Article detail
│   │   └── notifications/
│   │       └── index.tsx         In-app notification feed
│   ├── src/
│   │   ├── components/           11 shared UI components
│   │   ├── services/             API, HTTP, AI triage, speech, Agora
│   │   ├── store/                5 Zustand state stores
│   │   ├── constants/
│   │   │   └── theme.ts          COLORS, TYPOGRAPHY, SPACING tokens
│   │   └── types/                Shared TypeScript interfaces
│   ├── assets/                   Images, icons, profile photo
│   ├── app.json                  Expo config — permissions, cleartext, EAS project ID
│   └── eas.json                  EAS build profiles (dev / preview APK / production AAB)
│
├── backend/
│   ├── app/
│   │   ├── main.py               FastAPI entry — 12 routers + startup hooks
│   │   ├── database/
│   │   │   ├── base.py           SQLAlchemy declarative base
│   │   │   ├── connection.py     Engine — PostgreSQL (5s timeout) → SQLite fallback
│   │   │   ├── session.py        SessionLocal + get_db dependency
│   │   │   ├── migrations.py     Lightweight ALTER TABLE migration runner
│   │   │   └── seeder.py         Auto-seeds 2 users + 3 hospitals on startup
│   │   ├── models/               10 SQLAlchemy ORM models
│   │   ├── routers/              12 FastAPI route modules
│   │   ├── services/             Business logic layer
│   │   ├── repositories/         Data access layer (CRUD)
│   │   ├── schemas/              Pydantic request/response schemas
│   │   ├── security/
│   │   │   ├── jwt.py            create_access_token, decode_token (HS256)
│   │   │   ├── password.py       hash_password, verify_password (bcrypt)
│   │   │   └── dependencies.py   get_current_user FastAPI dependency
│   │   └── utils/
│   │       └── file_storage.py   Medical record file save helper
│   ├── uploads/
│   │   ├── medical_records/      Uploaded patient files (PDF, images)
│   │   └── profile-photos/       Profile photos (JPG/PNG/WebP, max 5 MB)
│   ├── requirements.txt          Python dependencies
│   ├── .env                      Environment variables (not in Git)
│   └── seed_palghar_hospitals.py Palghar district real hospital data seeder
│
├── README.md
├── FULL_SYSTEM_REPORT.md
├── REPORT_APP.md
├── REPORT_ADMIN_DASHBOARD.md
├── IMPLEMENTATION_PLAN.md
└── final.md                      ← This file
```

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  LifeLink AI+ Mobile App                │
│              (React Native / Expo SDK 57)               │
│                                                         │
│  Patient Screens          Admin Screen (/admin)         │
│  ├─ Login / Register      ├─ SOS Queue (3s poll)        │
│  ├─ Home Dashboard        ├─ Accept / Reject            │
│  ├─ SOS 4-Step Flow       ├─ Dispatch Progression       │
│  ├─ G-ONE ResQ Modal      └─ Completed Case Archive     │
│  ├─ Emergency Wallet + QR                               │
│  ├─ Hospital Discovery                                  │
│  ├─ Medical Records                                     │
│  └─ Readiness / Learn                                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS REST (Bearer JWT)
                       │ 90-second timeout (cold-start)
                       ▼
┌─────────────────────────────────────────────────────────┐
│     FastAPI Backend — lifelink-backend-1tzq.onrender.com│
│                                                         │
│  12 Routers:                                            │
│  /users  /hospitals  /sos  /emergency-contacts          │
│  /wallet  /medical-records  /hospitals/{id}/ambulances  │
│  /hospitals/{id}/doctors  /voice  /notifications        │
│  /emergency-response  /emergency                        │
│                                                         │
│  Services:                                              │
│  SOSService  HospitalRepo  AmbulanceRepo  DoctorRepo    │
│  EmailService  OCRService  VoiceService                 │
│  GoneResqService  NotificationService                   │
│                                                         │
│  AI Provider Chain:                                     │
│  Gemini 2.5 Flash → Groq llama-3.3-70b → Deterministic │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Supabase (PG)   │     │  SQLite (fallback)   │
│  PostgreSQL      │     │  lifelink_ai.db      │
│  5s connect      │     │  auto if PG fails    │
│  timeout         │     │                      │
└──────────────────┘     └──────────────────────┘
```

---

## 4. Backend — FastAPI Server

### 4.1 Entry Point & Router Registration

**File:** `backend/app/main.py`

```python
app = FastAPI(title="LifeLink AI API")
app.add_middleware(CORSMiddleware, allow_origins=["*"])
Base.metadata.create_all(bind=engine)
run_migrations()           # lightweight ALTER TABLE runner
seed_default_data(db)      # auto-seeds users + hospitals

# 12 Routers registered:
app.include_router(user_router)                    # prefix: /users
app.include_router(emergency_wallet_router)        # prefix: /wallet
app.include_router(sos_router)                     # prefix: /sos
app.include_router(emergency_contact_router)       # prefix: /emergency-contacts
app.include_router(emergency_response_router)      # prefix: /emergency-response
app.include_router(notification_router)            # prefix: /notifications
app.include_router(emergency_orchestration_router) # prefix: /emergency
app.include_router(medical_records_router)         # prefix: /medical-records
app.include_router(hospital_router)                # prefix: /hospitals
app.include_router(doctors_router)                 # prefix: /hospitals/{id}/doctors
app.include_router(ambulances_router)              # prefix: /hospitals/{id}/ambulances
app.include_router(voice_router)                   # prefix: /voice
```

### 4.2 Database Engine & Fallback

**File:** `backend/app/database/connection.py`

- Reads `DATABASE_URL` from environment.
- Attempts PostgreSQL (Supabase) connection with a **5-second timeout**.
- If the connection fails (e.g., no `DATABASE_URL`, network issue, or cold container), automatically falls back to **SQLite** at `./lifelink_ai.db`.
- The same SQLAlchemy session interface is used either way — no code changes needed.

### 4.3 Auto-Migrations

**File:** `backend/app/database/migrations.py`

Runs on every startup via `run_migrations()`. Uses `inspector.get_columns()` to check for missing columns and issues `ALTER TABLE ... ADD COLUMN` statements:

| Table | Columns Added (if missing) |
|---|---|
| `sos` | `ai_emergency_understanding`, `ai_severity`, `ai_required_capabilities`, `ai_health_summary`, `ai_emergency_report`, `call_sid`, `call_status`, `call_transcript`, `call_summary`, `email_sent`, `email_sent_at` |
| `emergency_contacts` | `email` |

Safe to run on PostgreSQL and SQLite (failures are logged as warnings, not crashes).

### 4.4 Auto-Seeder

**File:** `backend/app/database/seeder.py`

Runs on startup via `seed_default_data(db)`. Seeds:

**Users:**
| Name | Email | Password | Blood Group |
|---|---|---|---|
| Prem Kakade | premkakade2005@gmail.com | Password123! | O+ |
| LifeLink Demo User | demo@lifelink.ai | Password123! | A+ |

- Both users get an `EmergencyWallet` auto-created.
- Demo user wallet: Penicillin allergy, Asthma condition, carry rescue inhaler note.

**Hospitals (if table empty):**
| Name | Location | Beds | ICU | Oxygen |
|---|---|---|---|---|
| City Care Hospital & Trauma Center | 19.702, 72.772 | 150 | 30 | 25 |
| Apex Super Specialty Hospital | 19.715, 72.780 | 200 | 40 | 35 |
| Metro Emergency & Heart Institute | 19.690, 72.760 | 100 | 20 | 15 |

**Demo Hospital Accounts** (seeded in `hospitals.py` via `seed_demo_hospitals()`):
| Hospital | Email | Password |
|---|---|---|
| CityCare Hospital | citycare@lifelink.demo | Demo@123 |
| Metro General Hospital | metro@lifelink.demo | Demo@123 |
| Lifeline Medical Centre | lifeline@lifelink.demo | Demo@123 |
| Harbourview Emergency Hospital | harbourview@lifelink.demo | Demo@123 |

---

## 5. Backend — Complete API Catalog

### 5.1 Users (`/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/` | None | Register new patient user |
| POST | `/users/login` | None | Login — returns JWT token |
| GET | `/users/` | None | List all users (development) |
| GET | `/users/{user_id}` | JWT (own) | Get user by ID |
| PUT | `/users/{user_id}` | JWT (own) | Update user profile |
| POST | `/users/{user_id}/profile-photo` | JWT (own) | Upload profile photo (JPG/PNG/WebP, max 5 MB) |
| DELETE | `/users/{user_id}` | JWT (own) | Delete user account |

### 5.2 Hospitals (`/hospitals`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/hospitals/login` | None | Hospital admin login (returns JWT with `role: "hospital"`) |
| GET | `/hospitals/` | None | List all hospitals (seeds demo hospitals first) |
| GET | `/hospitals/{hospital_id}` | None | Get hospital by ID |
| GET | `/hospitals/{hospital_id}/resources` | None | Get live bed + resource counts |
| POST | `/hospitals/` | None | Register a new hospital |
| PUT | `/hospitals/{hospital_id}` | None | Update hospital details |
| PATCH | `/hospitals/{hospital_id}/beds` | None | Update bed occupancy/capacity |

Note: `GET /hospitals/` and `POST /hospitals/login` both call `seed_demo_hospitals()` to guarantee demo accounts always exist.

### 5.3 SOS (`/sos`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sos/` | JWT | Create new SOS (dispatches immediately with GPS) |
| GET | `/sos/` | None | List all active SOS (`?hospital_id=N` filter) — admin polling |
| GET | `/sos/completed` | None | List resolved SOS (`?hospital_id=N` filter) |
| GET | `/sos/completed/{hospital_id}` | None | Completed SOS for specific hospital |
| GET | `/sos/hospital/{hospital_id}` | None | Active SOS accepted by a hospital |
| GET | `/sos/my-active` | JWT | Patient's currently active SOS |
| GET | `/sos/my-completed` | JWT | Patient's completed SOS history |
| GET | `/sos/{sos_id}` | None | Get SOS by ID |
| PATCH | `/sos/{sos_id}/location` | JWT (owner) | Update GPS after precise fix arrives |
| POST | `/sos/{sos_id}/accept` | None | Hospital accepts SOS (links hospital, reserves bed) |
| POST | `/sos/{sos_id}/reject` | None | Hospital rejects SOS (creates SOSRejection record) |
| PATCH | `/sos/{sos_id}/status` | None | Update dispatch milestone |
| POST | `/sos/{sos_id}/ambulance-assignment` | None | Assign ambulance to SOS |
| POST | `/sos/{sos_id}/doctor-assignment` | None | Assign doctor to SOS |
| PUT | `/sos/{sos_id}/resolve` | JWT (owner) | Patient resolves/cancels SOS |

**SOS Create Flow (inside SOSService.create_sos):**
1. Creates SOS record with patient GPS, description, and status=ACTIVE.
2. Calls `_build_patient_context()` — reads emergency wallet + last 5 medical records to build a clinician-readable context string.
3. Sets `ai_health_summary` immediately so admin dashboard has context before AI triage finishes.
4. Returns immediately — AI triage (Gemini/Groq) runs asynchronously.

### 5.4 Emergency Contacts (`/emergency-contacts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/emergency-contacts/` | JWT | Add an emergency contact |
| GET | `/emergency-contacts/` | JWT | List current user's contacts |
| PUT | `/emergency-contacts/{contact_id}` | JWT | Update contact |
| DELETE | `/emergency-contacts/{contact_id}` | JWT | Remove contact |

### 5.5 Emergency Wallet (`/wallet`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wallet/public/{user_id}` | None | Responder-safe HTML emergency card (QR scan target) |
| GET | `/wallet/{user_id}` | JWT (own) | Get wallet JSON |
| PUT | `/wallet/{user_id}` | JWT (own) | Update wallet |

Note: `/wallet/public/{user_id}` returns a full-page HTML emergency card with blood group, allergies, medications, conditions, notes, and clickable emergency contacts — designed for first responders scanning the QR code.

### 5.6 Medical Records (`/medical-records`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/medical-records/upload` | JWT | Upload file (PDF/image) with metadata as form data |
| GET | `/medical-records/{user_id}` | JWT (own) | List all records for user |
| GET | `/medical-records/record/{record_id}` | JWT (own) | Get record detail |
| GET | `/medical-records/record/{record_id}/file` | JWT (own) | Download original file |
| POST | `/medical-records/record/{record_id}/process-ocr` | JWT (own) | Run OCR on file, extract text, auto-merge into wallet |

**OCR Auto-Merge Logic (in medical_records.py):**
After OCR, the endpoint uses regex to extract:
- `allerg(y|ies)` → merged into `wallet.allergies`
- `medications?|prescriptions?` → merged into `wallet.current_medications`
- `conditions?|diagnoses` → merged into `wallet.chronic_conditions`

The `_merge_wallet_values()` function deduplicates across comma-separated lists before writing back.

### 5.7 Ambulances (`/hospitals/{hospital_id}/ambulances`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/hospitals/{hospital_id}/ambulances/` | None | List ambulances for hospital |
| POST | `/hospitals/{hospital_id}/ambulances/` | None | Add ambulance to hospital |
| PUT | `/hospitals/{hospital_id}/ambulances/{ambulance_id}` | None | Update ambulance details |
| DELETE | `/hospitals/{hospital_id}/ambulances/{ambulance_id}` | None | Remove ambulance |

### 5.8 Doctors (`/hospitals/{hospital_id}/doctors`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/hospitals/{hospital_id}/doctors/` | None | List doctors for hospital |
| POST | `/hospitals/{hospital_id}/doctors/` | None | Add doctor to hospital |
| PUT | `/hospitals/{hospital_id}/doctors/{doctor_id}` | None | Update doctor details |
| DELETE | `/hospitals/{hospital_id}/doctors/{doctor_id}` | None | Remove doctor |

### 5.9 Voice & G-ONE ResQ (`/voice`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/voice/agora-token` | JWT | Generate Agora RTC token for in-app audio calls |
| GET/POST | `/voice/call-twiml/{sos_id}` | None | Legacy telephony TwiML compatibility endpoint |
| GET/POST | `/voice/process-turn/{sos_id}` | None | Legacy speech turn processing |
| POST | `/voice/bland-webhook/{sos_id}` | None | Bland AI post-call webhook (transcript + summary) |
| POST | `/voice/bland-webhook` | None | Bland AI general webhook |
| POST | `/voice/status/{sos_id}` | None | Legacy call status lifecycle callback |
| POST | `/voice/simulate/{sos_id}` | None | Simulate full AI call (dev/test, no live call) |
| POST | `/voice/resend-email/{sos_id}` | None | Re-trigger emergency email for completed SOS |
| GET | `/voice/transcript/{sos_id}` | None | Get call transcript + summary |
| GET | `/voice/resq/protocols` | None | Get all 9 G-ONE ResQ clinical protocols |
| POST | `/voice/resq/turn` | None | Process one AI voice triage turn (G-ONE ResQ) |
| POST | `/voice/resq/handover` | None | Finalize session, generate clinical handover, send email |

**`POST /voice/resq/turn` Payload:**
```json
{
  "sosId": 42,
  "speech": "I have chest pain and can't breathe",
  "turn": 3,
  "lang": "en",
  "history": [...]
}
```

**`POST /voice/resq/handover` Payload:**
```json
{
  "sosId": 42,
  "category": "CARDIAC",
  "notes": "Patient conscious, 60yo male"
}
```

### 5.10 Notifications (`/notifications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/notifications/{response_id}` | JWT | Create notification |
| GET | `/notifications/` | JWT | List user's notifications |
| GET | `/notifications/{notification_id}` | JWT | Get notification by ID |
| GET | `/notifications/response/{response_id}` | JWT | Get notifications for a response |
| PUT | `/notifications/{notification_id}` | JWT | Update notification status |

### 5.11 Emergency Response (`/emergency-response`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/emergency-response/` | JWT | Create emergency response record |
| GET | `/emergency-response/{response_id}` | JWT | Get response by ID |
| GET | `/emergency-response/` | JWT | List user's responses |
| PUT | `/emergency-response/{response_id}` | JWT | Update response status |

### 5.12 Emergency Orchestration (`/emergency`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/emergency/trigger` | JWT | Trigger full emergency orchestration (hospital search + SOS creation) |

---

## 6. Backend — Database Models

### users

| Column | Type | Notes |
|---|---|---|
| `user_id` | Integer PK | |
| `full_name` | String(100) | Required |
| `email` | String(100) | Unique, required |
| `phone_number` | String(15) | Unique, required |
| `password_hash` | String(255) | BCrypt |
| `plain_password` | String(255) | Optional debug field |
| `date_of_birth` | Date | Optional |
| `gender` | String(20) | Optional |
| `blood_group` | String(5) | Optional |
| `profile_photo` | String(255) | Relative URL path |
| `created_at` | TIMESTAMP | Server default now() |
| `updated_at` | TIMESTAMP | Auto-updated |

### hospitals

| Column | Type | Notes |
|---|---|---|
| `hospital_id` | Integer PK | |
| `name` | String(150) | Required |
| `address` | String(255) | |
| `latitude` | Float | Default 19.700 |
| `longitude` | Float | Default 72.770 |
| `total_beds` | Integer | Default 100 |
| `icu_beds` | Integer | Default 10 |
| `oxygen_beds` | Integer | Default 15 |
| `general_occupied` | Integer | Default 0 |
| `icu_occupied` | Integer | Default 0 |
| `emergency_occupied` | Integer | Default 0 |
| `phone_number` | String(50) | |
| `rating` | Float | Default 4.8 |
| `email` | String(150) | Unique — hospital admin login |
| `password_hash` | String(255) | BCrypt — hospital admin login |
| Relationships | doctors, ambulances | Cascade delete |

### sos

| Column | Type | Notes |
|---|---|---|
| `sos_id` | Integer PK | |
| `user_id` | FK → users | Required |
| `description` | Text | Patient symptoms / description |
| `latitude` | Float | Patient GPS lat |
| `longitude` | Float | Patient GPS lng |
| `status` | String(20) | ACTIVE / RESOLVED / CANCELLED |
| `dispatch_status` | String(50) | RECEIVED → COMPLETED |
| `accepted_hospital_id` | FK → hospitals | SET NULL on hospital delete |
| `assigned_ambulance_id` | FK → ambulances | SET NULL on delete |
| `assigned_doctor_id` | FK → doctors | SET NULL on delete |
| `patient_name` | String(150) | Denormalized for admin display |
| `patient_phone` | String(50) | Denormalized for admin display |
| `ai_emergency_understanding` | Text | AI-classified category (e.g. "CARDIAC EMERGENCY") |
| `ai_severity` | String(30) | CRITICAL / HIGH / MODERATE / LOW / UNKNOWN |
| `ai_required_capabilities` | Text | Comma-separated hospital capability requirements |
| `ai_health_summary` | Text | Structured patient context snapshot |
| `ai_emergency_report` | Text | Full formatted incident report |
| `call_sid` | String(100) | Bland AI call ID |
| `call_status` | String(50) | PENDING / IN_PROGRESS / COMPLETED / FAILED |
| `call_transcript` | Text | Full G-ONE ResQ multi-turn dialogue |
| `call_summary` | Text | AI-generated clinical handover summary |
| `email_sent` | Integer | 0 = not sent, 1 = sent |
| `email_sent_at` | DateTime | UTC timestamp of email dispatch |
| `created_at` | DateTime | |
| `resolved_at` | DateTime | |
| Relationships | user, hospital, ambulance, doctor, rejections | |

### emergency_wallets

| Column | Type | Notes |
|---|---|---|
| `wallet_id` | Integer PK | |
| `user_id` | FK → users | Unique (one wallet per user) |
| `blood_group` | String(10) | |
| `allergies` | Text | |
| `chronic_conditions` | Text | |
| `current_medications` | Text | |
| `emergency_notes` | Text | |
| `readiness_score` | Integer | Calculated, cached |
| `ai_health_summary` | Text | AI-generated health context |

### emergency_contacts

| Column | Type | Notes |
|---|---|---|
| `contact_id` | Integer PK | |
| `user_id` | FK → users | |
| `name` | String(100) | Required |
| `phone_number` | String(15) | Required |
| `email` | String(100) | Optional (added via migration) |
| `relationship` | String(50) | e.g. "Father", "Doctor" |
| `is_primary` | Boolean | Default false |

### medical_records

| Column | Type | Notes |
|---|---|---|
| `record_id` | Integer PK | |
| `user_id` | FK → users | |
| `record_type` | String(50) | e.g. "Lab Report", "Prescription" |
| `title` | String(200) | |
| `hospital_name` | String(200) | |
| `doctor_name` | String(200) | |
| `record_date` | Date | |
| `file_name` | String(255) | Original filename |
| `file_path` | String(500) | Stored file path |
| `file_type` | String(100) | MIME type |
| `ocr_text` | Text | Tesseract-extracted text |
| `ai_summary` | Text | AI clinical summary |

### ambulances

| Column | Type | Notes |
|---|---|---|
| `ambulance_id` | Integer PK | |
| `hospital_id` | FK → hospitals | CASCADE delete |
| `vehicle_number` | String(50) | Required |
| `driver_name` | String(150) | |
| `driver_phone` | String(50) | |
| `location_label` | String(100) | Default "Hospital Fleet" |
| `status` | String(50) | AVAILABLE / DISPATCHED |

### doctors

| Column | Type | Notes |
|---|---|---|
| `doctor_id` | Integer PK | |
| `hospital_id` | FK → hospitals | CASCADE delete |
| `name` | String(150) | Required |
| `department` | String(100) | Default "Emergency" |
| `specialization` | String(100) | Default "General Physician" |
| `phone` | String(50) | |
| `status` | String(50) | AVAILABLE / BUSY |
| `current_cases` | Integer | Default 0 |

### sos_rejections

| Column | Type | Notes |
|---|---|---|
| `rejection_id` | Integer PK | |
| `sos_id` | FK → sos | CASCADE delete |
| `hospital_id` | FK → hospitals | CASCADE delete |
| `reason` | Text | Clinical rejection reason |
| `created_at` | DateTime | |
| Property | `hospital_name` | Computed from relationship |

### notifications

| Column | Type | Notes |
|---|---|---|
| `notification_id` | Integer PK | |
| `response_id` | FK → emergency_responses | |
| `user_id` | FK → users | |
| `recipient_type` | String(30) | e.g. "PATIENT", "CONTACT" |
| `recipient_id` | Integer | |
| `channel` | String(20) | e.g. "IN_APP", "EMAIL" |
| `status` | String(20) | PENDING / SENT / FAILED |
| `message` | Text | |
| `sent_at` | TIMESTAMP | |

### emergency_responses

| Column | Type | Notes |
|---|---|---|
| `response_id` | Integer PK | |
| `sos_id` | FK → sos | |
| `user_id` | FK → users | |
| `status` | String(20) | INITIATED / ACTIVE / RESOLVED |

---

## 7. Backend — Services Layer

| Service | File | Responsibility |
|---|---|---|
| `SOSService` | `sos_service.py` | Create, accept, reject, update, resolve SOS; resource release on completion |
| `HospitalRepository` | `hospital_repository.py` | CRUD for hospitals |
| `AmbulanceRepository` | `ambulance_repository.py` | CRUD for ambulances; availability management |
| `DoctorRepository` | `doctor_repository.py` | CRUD for doctors; case count management |
| `GoneResqService` | `gone_resq_service.py` | G-ONE ResQ AI triage: multi-turn, 9 protocols, Gemini/Groq/deterministic |
| `VoiceService` | `voice_service.py` | Legacy Bland AI telephony, TwiML generation, call simulation |
| `EmailService` | `email_service.py` | HTML emergency emails to patient + contacts via SMTP/Resend |
| `OCRService` | `ocr_service.py` | Tesseract OCR: PDF→images via pdf2image, then pytesseract |
| `MedicalRecordService` | `medical_record_service.py` | Record CRUD + OCR trigger + wallet merge |
| `EmergencyWalletService` | `emergency_wallet_service.py` | Get/create/update emergency wallet |
| `EmergencyContactService` | `emergency_contact_service.py` | Contact CRUD |
| `NotificationService` | `notification_service.py` | Create, retrieve, update notifications |
| `EmergencyResponseService` | `emergency_response_service.py` | Response record management |
| `EmergencyOrchestrationService` | `emergency_orchestration_service.py` | Full emergency trigger: hospital ranking + SOS creation |
| `UserService` | `user_service.py` | Register, login (JWT), update, delete users |

**SOSService._build_patient_context()** — Called on every SOS creation:
- Reads `EmergencyWallet` (blood group, conditions, allergies, medications, notes)
- Reads last 5 `MedicalRecord` entries (title, type, ai_summary/ocr_text excerpt ≤500 chars)
- Builds a structured clinician-readable string set as `ai_health_summary` immediately

**SOSService._release_resources()** — Called on SOS completion:
- Sets `ambulance.status = "AVAILABLE"`
- Decrements `doctor.current_cases` (floor 0)

---

## 8. Backend — Security

### JWT Authentication

| Aspect | Detail |
|---|---|
| Algorithm | HS256 |
| Secret | `JWT_SECRET_KEY` from env |
| Expiry | 30 minutes (configurable via `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) |
| Patient token payload | `{"sub": "<user_id>"}` |
| Hospital token payload | `{"sub": "<hospital_id>", "email": "<email>", "role": "hospital"}` |

### Password Hashing

- Algorithm: BCrypt via `passlib`
- Used for both `users.password_hash` and `hospitals.password_hash`

### Access Controls (enforced in routers)

| Rule | Enforcement |
|---|---|
| User can only access own profile | `user_id != current_user.user_id` → 403 |
| User can only update own profile | Same check |
| User can only upload own profile photo | Same check |
| User can only access own wallet | Same check |
| User can only access own medical records | Same check |
| User can only update own SOS location | `sos.user_id != user_id` → check in service |
| User can only resolve own SOS | Same check |

---

## 9. Backend — OCR Pipeline

**File:** `backend/app/services/ocr_service.py`
**Dependencies:** `pytesseract`, `pdf2image`, `pillow`, `pypdf`

1. **PDF files:** Converted to page images via `pdf2image` (requires Poppler at `POPPLER_PATH` env).
2. **Image files:** Opened directly via `pillow`.
3. **Text extraction:** `pytesseract.image_to_string()` on each page.
4. **Return:** Concatenated text from all pages.
5. **Post-OCR:** `medical_records.py` applies regex extraction and merges into emergency wallet.

---

## 10. G-ONE ResQ AI Engine

**File:** `backend/app/services/gone_resq_service.py`

### 9 Clinical Protocols

| Key | Category | Severity |
|---|---|---|
| `CARDIAC` | Cardiac Emergency | CRITICAL |
| `STROKE` | Stroke Emergency | CRITICAL |
| `BREATHING` | Respiratory Distress | CRITICAL |
| `CHOKING` | Choking / Airway Obstruction | CRITICAL |
| `BLEEDING` | Severe Bleeding | HIGH |
| `BURNS` | Burn Injury | HIGH |
| `TRAUMA` | Trauma / Injury | HIGH |
| `NEUROLOGICAL` | Neurological Emergency | HIGH |
| `GENERAL_EMERGENCY` | General Emergency | MODERATE |

Each protocol contains:
- `title` — Display name
- `severity` — CRITICAL / HIGH / MODERATE
- `first_aid_steps` — Ordered list of actions to take
- `till_ambulance_arrives` — Checklist for patient while waiting
- `default_voice_response` — Fallback text when AI fails

### AI Provider Chain (`GoneResqService.process_turn`)

```
1. Try: Google Gemini 2.5 Flash
   - Uses GEMINI_API_KEY from env
   - Sends full conversation history + patient context
   - Returns: voiceResponse (1-2 sentences), firstAidSteps, category, severity

2. Fallback: Groq llama-3.3-70b-versatile
   - Used when Gemini fails/unavailable

3. Final fallback: Deterministic Protocol Engine
   - Keyword matching on user speech
   - Returns hardcoded protocol data
   - 100% offline, never fails
```

### GoneResqService.complete_handover()

Called when patient ends the ResQ session (POST /voice/resq/handover):
1. Reads full conversation history from database.
2. Sends to Gemini to generate structured clinical handover summary.
3. Saves `call_transcript` + `call_summary` to SOS record.
4. Calls `EmailService.send_sos_transcript_emails()` to notify emergency contacts.
5. Returns handover payload with clinical summary.

---

## 11. Email Service (Resend SMTP)

**File:** `backend/app/services/email_service.py`

**Recipients:**
- Patient's own email (`user.email`)
- All `EmergencyContact` records with a non-null email

**Email Content (`_build_html`):**
- Severity badge with colour coding (CRITICAL=red, HIGH=orange, MODERATE=amber, LOW=green)
- Patient name, blood group, allergies
- GPS location with Google Maps link
- AI emergency classification
- G-ONE ResQ transcript
- AI clinical summary

**SMTP Config (env vars):**
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<resend-api-key>
EMAIL_FROM=LifeLink Emergency <alerts@yourdomain.com>
```

If SMTP credentials are not configured: email is **simulated** (logged as info) — the app continues without error.

---

## 12. Frontend — Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Expo (Managed Workflow) | SDK 57 |
| Runtime | React Native | 0.86.3 |
| Language | TypeScript | Strict |
| Routing | Expo Router | (SDK 57 bundle) |
| State | Zustand | ^4.5.2 |
| Persistent Storage | AsyncStorage | (Expo included) |
| Secure Storage | expo-secure-store | (biometric credentials) |
| Biometrics | expo-local-authentication | Fingerprint / Face ID |
| Location | expo-location | GPS with permission flow |
| Speech STT | expo-speech-recognition | Native + Web Speech fallback |
| Speech TTS | expo-speech | Multi-language voice output |
| In-App Audio | react-native-agora | ^4.6.4 (Agora RTC) |
| QR Code | react-native-qrcode-svg | 6.3.12 |
| Icons | lucide-react-native | 1.33.0 |
| Document Picker | expo-document-picker | Medical records upload |
| Image Picker | expo-image-picker | Profile photo upload |
| HTTP Client | fetch (wrapped) | 90-second timeout |

---

## 13. Frontend — Navigation Structure

```
app/_layout.tsx         Root Stack — session restore, profile hydrate, SOS sync on mount
│
├── (auth)/login.tsx    Unauthenticated: Login / Register / Biometric unlock
│
└── (tabs)/_layout.tsx  Authenticated: Custom BottomNav pill bar
    ├── index.tsx        Tab 1: Home Dashboard
    ├── hospitals.tsx    Tab 2: Hospital Discovery
    ├── wallet.tsx       Tab 3: Emergency Wallet + QR
    └── profile.tsx      Tab 4: Profile + Settings
    
Additional routes (full-screen modal or stack):
├── sos/emergency.tsx   SOS Confirmation + GPS dispatch (fullScreenModal + fade)
├── sos/provide-info.tsx Symptom input
├── sos/resq.tsx        G-ONE ResQ Voice (fullScreenModal + slide_from_bottom)
├── sos/track.tsx       Live 5-stage tracker
├── admin/index.tsx     Hospital admin command center
├── hospitals/[id].tsx  Hospital detail
├── records/index.tsx   Medical records list
├── records/[id].tsx    Medical record detail
├── readiness/index.tsx Readiness score breakdown
├── learn/index.tsx     Education article list
├── learn/[id].tsx      Article detail
└── notifications/index.tsx Notification feed
```

**Root layout boot sequence (`app/_layout.tsx`):**
```typescript
useEffect(() => {
  restoreSession();          // restore JWT from AsyncStorage
  fetchProfileAndReadiness(); // load wallet + readiness score
  refreshActiveEmergency();   // sync any active SOS from backend
}, []);
```

---

## 14. Frontend — Screens Reference

| Screen | File | Size | Key Features |
|---|---|---|---|
| Login | `(auth)/login.tsx` | — | Email/password, register, biometric unlock, error states |
| Home | `(tabs)/index.tsx` | — | Greeting, readiness score, SOS button, top hospital, records count |
| Hospitals | `(tabs)/hospitals.tsx` | 12 KB | Filtered list, distance ranked, bed counts, ETA |
| Wallet | `(tabs)/wallet.tsx` | — | Offline card, QR code, emergency contacts |
| Profile | `(tabs)/profile.tsx` | 30 KB | Edit profile, wallet editor, contacts manager, biometric toggle |
| SOS Emergency | `sos/emergency.tsx` | — | GPS acquisition, emergency type selection, confirm dispatch |
| SOS Provide Info | `sos/provide-info.tsx` | — | Symptom checklist, custom notes |
| SOS ResQ | `sos/resq.tsx` | — | Launches GOneResQCallModal |
| SOS Track | `sos/track.tsx` | 37 KB | 5-stage timeline, ambulance ETA, driver info, survival checklist |
| Admin | `admin/index.tsx` | 23 KB | SOS queue (3s poll), accept/reject, dispatch progression, completed archive |
| Hospital Detail | `hospitals/[id].tsx` | 9 KB | Full hospital info, map, bed counts, select as emergency |
| Records List | `records/index.tsx` | 7.8 KB | Upload via picker, processing status |
| Record Detail | `records/[id].tsx` | 5.3 KB | OCR text, AI summary, download file |
| Readiness | `readiness/index.tsx` | 7.7 KB | Score breakdown, missing items with action links |
| Learn List | `learn/index.tsx` | 2.6 KB | Curated first-aid articles |
| Learn Detail | `learn/[id].tsx` | 3.0 KB | Article with images and formatted content |
| Notifications | `notifications/index.tsx` | — | In-app notification feed |

---

## 15. Frontend — Components Reference

All in `frontend/src/components/`:

| Component | File | Purpose |
|---|---|---|
| `BottomNav` | `BottomNav.tsx` | Custom bottom nav pill bar (4 tabs: Home, Hospitals, Wallet, Profile) |
| `DetailHeader` | `DetailHeader.tsx` | Back-button header for detail screens |
| `EditorialCard` | `EditorialCard.tsx` | First-aid article card for Learn section |
| `EmergencyVoiceCall` | `EmergencyVoiceCall.tsx` | Agora RTC in-app voice call UI |
| `GOneResQCallModal` | `GOneResQCallModal.tsx` | **56 KB** — Full G-ONE ResQ voice triage modal |
| `SOSButton` | `SOSButton.tsx` | Pulsating red SOS button with animation |
| `StatusBadge` | `StatusBadge.tsx` | Colour-coded dispatch status badge |
| `SummaryCard` | `SummaryCard.tsx` | Dashboard summary information card |
| `TimelineStepper` | `TimelineStepper.tsx` | 5-stage dispatch milestone timeline |
| `TrendChart` | `TrendChart.tsx` | Health trend visualization |
| `WalletCard` | `WalletCard.tsx` | Emergency wallet display card |

---

## 16. Frontend — Zustand Stores

### useAuthStore (`src/store/useAuthStore.ts`)

| Action | Description |
|---|---|
| `login(email, password)` | POST /users/login, saves token to AsyncStorage, stores credentials to SecureStore for biometrics |
| `register(name, email, phone, password)` | POST /users/, stores credentials to SecureStore |
| `loginWithBiometrics()` | LocalAuthentication.authenticateAsync() → reads SecureStore → calls api.login() |
| `restoreSession()` | Reads token from AsyncStorage, fetches user profile |
| `logout()` | Clears token, sets user=null (SecureStore credentials kept for next biometric) |
| `updateUser(partial)` | PATCH /users/{id}, updates local state |

Biometric notes:
- SecureStore used only on native (iOS/Android) — skipped on web
- Biometric unlock is disabled if no hardware or no enrolled fingerprint/face
- Credentials cleared from SecureStore only on explicit key corruption

### useEmergencyStore (`src/store/useEmergencyStore.ts`)

| Action | Description |
|---|---|
| `triggerSOS(symptoms, notes)` | Dispatches immediately with last-known GPS (≤750ms wait), then updates with precise fix asynchronously. Starts 3-second polling loop. |
| `refreshActiveEmergency()` | GET /sos/my-active, updates local state, stops polling if SOS resolved |
| `endEmergency()` | Clears polling timer, calls PUT /sos/{id}/resolve |
| `toggleSymptom(symptom)` | Adds/removes from selectedSymptoms |
| `setNotes(text)` | Updates notes field |
| `clearSymptoms()` | Resets selectedSymptoms + notes |

GPS dispatch strategy:
1. Try `getLastKnownPositionAsync` (maxAge 120s, timeout 750ms) — fast path
2. Dispatch SOS immediately with whatever GPS is available (fallback: Palghar center 19.697, 72.766)
3. Async: run `getCurrentPositionAsync(Accuracy.High)` and PATCH location update to backend

### useProfileStore (`src/store/useProfileStore.ts`)

| Action | Description |
|---|---|
| `fetchProfileAndReadiness()` | Loads wallet + contacts + calculates readiness score |
| `updateProfile(data)` | PUT /users/{id} |
| `updateWallet(data)` | PUT /wallet/{id} |
| `addContact(contact)` | POST /emergency-contacts/ |
| `removeContact(id)` | DELETE /emergency-contacts/{id} |

### useHospitalStore (`src/store/useHospitalStore.ts`)

| Action | Description |
|---|---|
| `fetchHospitals()` | GET /hospitals/ |
| `setSelectedHospital(hospital)` | Updates selected hospital for detail view |

### useRecordStore (`src/store/useRecordStore.ts`)

| Action | Description |
|---|---|
| `fetchDocuments()` | GET /medical-records/{user_id} |
| `uploadRecord(file, metadata)` | POST /medical-records/upload (multipart) |
| `processOCR(recordId)` | POST /medical-records/record/{id}/process-ocr |

---

## 17. Frontend — Services Layer

| Service | File | Purpose |
|---|---|---|
| `api` | `api.ts` (27 KB) | All REST methods: auth, profile, wallet, contacts, records, hospitals, SOS, admin, voice |
| `http` | `http.ts` | fetch wrapper: Bearer token, 90s timeout, error parsing, URL resolution |
| `emergencyAiTriage` | `emergencyAiTriage.ts` (22 KB) | 3-layer AI triage: backend → Gemini → local protocols |
| `speechRecognition` | `speechRecognition.ts` | STT abstraction: expo-speech-recognition + Web Speech fallback |
| `agora.native` | `agora.native.ts` | Agora RTC native implementation |
| `agora.web` | `agora.web.ts` | Agora RTC web stub |
| `aiService` | `aiService.ts` (4.6 KB) | Readiness score calculation, symptom urgency classification |
| `recommendationEngine` | `recommendationEngine.ts` (2.7 KB) | Hospital ranking by distance + bed availability + specialty match |
| `mockData` | `mockData.ts` | Seeded demo data for development mode |

### http.ts — Backend URL Resolution

Priority order:
1. `EXPO_PUBLIC_API_URL` env (if set and not device-localhost)
2. Expo Go `hostUri` (auto-detected LAN IP in development)
3. Default: `https://gone-backend.onrender.com`

EAS preview build overrides to: `https://lifelink-backend-1tzq.onrender.com`

**Timeout:** 90 seconds (AbortController) — handles Render cold starts gracefully.

### api.ts — BackendSOS Type Map

The `BackendSOS` interface and `toEmergencyRequest()` adapter handle all SOS backend-to-frontend field translation, including:
- `dispatch_status` → app-level `status` enum (`locating` / `matching` / `connected` / `en_route` / `arrived` / `closed`)
- Nested `hospital`, `ambulance`, `doctor` objects → typed frontend objects
- `rejections` array → `rejectedHospitals` list

---

## 18. Frontend — Design System

**File:** `src/constants/theme.ts`

### COLORS

**Calm Mode (default):**
| Token | Hex | Use |
|---|---|---|
| `COLORS.bg` | `#FFFFFF` | Screen background |
| `COLORS.surface` | `#F7F9FA` | Cards, grouped areas |
| `COLORS.ink` | `#0B2545` | Primary text |
| `COLORS.muted` | `#64748B` | Secondary text, labels |
| `COLORS.brand` | `#0E7C86` | Primary actions, active nav, links |
| `COLORS.border` | `#EDF1F4` | Dividers, card borders |

**Category Tints:**
| Area | Background | Accent |
|---|---|---|
| `readiness` | `#DFF3E3` | `#2E9E5B` |
| `records` | `#E3EEFB` | `#2E6FA6` |
| `hospitals` | `#FCEEDB` | `#E8A33D` |
| `wallet` | `#EDE7F6` | `#6B4FA0` |

**Status Dots:**
| Status | Hex |
|---|---|
| `status.green` | `#2E9E5B` |
| `status.amber` | `#E8A33D` |
| `status.red` | `#D7263D` |

**Emergency Mode (Active SOS — dark theme):**
| Token | Hex |
|---|---|
| `emergency.bg` | `#0A0E14` |
| `emergency.text` | `#F5F7FA` |
| `emergency.pulseRed` | `#FF3B4E` |
| `emergency.pulseAmber` | `#FFB03B` |
| `emergency.pulseGreen` | `#3BDB7A` |
| `emergency.cardBg` | `#161F2B` |
| `emergency.border` | `#263445` |

### TYPOGRAPHY

| Name | Size (dp) |
|---|---|
| `title` | 28 |
| `heading` | 22 |
| `subheading` | 17 |
| `body` | 15 |
| `caption` | 13 |

### SPACING

| Token | Value |
|---|---|
| `padding` | 20 |
| `cardRadius` | 24 |
| `buttonRadius` | 16 |

---

## 19. Frontend — Emergency AI Triage (3-Layer)

**File:** `src/services/emergencyAiTriage.ts` (22 KB)

```
Layer 1: Backend (POST /voice/resq/turn)
  └─ GoneResqService on FastAPI
      └─ Gemini 2.5 Flash → Groq llama-3.3-70b → Deterministic protocols

Layer 2: Direct Gemini (google/generative-ai)
  └─ Called if backend unreachable (Render cold start, no network)
  └─ Streaming enabled for faster first token

Layer 3: Local Protocol Engine (localTriageDiagnostician)
  └─ Keyword matching on user speech
  └─ 9 clinical categories, English + Hindi + Marathi responses
  └─ 100% offline, zero latency, never fails
  └─ Exported as: CLINICAL_PROTOCOLS constant
```

**Exported functions:**
- `localTriageDiagnostician(speech, turn, lang)` — local engine
- `directGeminiTriage(speech, history, lang)` — direct Gemini
- `detectLanguage(transcript)` — auto-detects Marathi / Hindi / English
- `classifyCategory(speech)` — maps keywords to clinical category
- `ResqTurnResponse` — shared return type

---

## 20. Frontend — GOneResQCallModal Deep Dive

**File:** `src/components/GOneResQCallModal.tsx` (56 KB)

### Component Props

```typescript
interface Props {
  sosId: string | number;
  patientName?: string;
  emergencyDescription?: string;
  autoStart?: boolean;
}
```

### Call Phases

```
idle → ringing → active → handover
```

### State Management (within component)

| State | Purpose |
|---|---|
| `modalVisible` | Controls modal visibility |
| `phase` | Current call phase |
| `callDuration` | Timer in seconds |
| `language` | 'auto' / 'en' / 'hi' / 'mr' |
| `category` | Detected clinical category |
| `severity` | CRITICAL / HIGH / MODERATE |
| `protocolTitle` | Display title for current protocol |
| `firstAidSteps` | Ordered action steps from AI/protocol |
| `tillAmbulanceArrives` | Checklist for patient while waiting |
| `completedSteps` | Interactive first-aid checkboxes |
| `completedAmbulanceSteps` | Interactive "while waiting" checkboxes |
| `currentAiSpeech` | Current AI text being spoken |
| `patientSpeech` | Latest patient transcript |

### UI Elements

- **5-bar audio visualizer:** Animated frequency bars using `Animated.Value` — react while AI speaks
- **Transcript chat feed:** Scrolling `ScrollView` with timestamped chat bubbles (AI = teal left, Patient = right)
- **Language selector:** Button row: AUTO / EN / हि / मर
- **"While Ambulance is En Route" card:** Amber high-visibility card with interactive checklist
- **Text input bar:** Send button for noisy environments
- **Mic / speaker toggles**
- **End Call button:** Triggers `POST /voice/resq/handover`

### Hands-Free Loop

```
1. AI finishes speaking (TTS complete via expo-speech)
2. Auto-starts speech recognition (expo-speech-recognition)
3. Silence detection → auto-submits after 2-3 seconds
4. Sends to 3-layer AI provider chain
5. Speaks AI response via expo-speech
6. Loop repeats
```

---

## 21. SOS Full Lifecycle

```
Patient App                    Backend                      Admin Dashboard
    │                              │                               │
    │  1. Tap SOS button           │                               │
    │─────────────────────────────►│                               │
    │  POST /sos/                  │                               │
    │  (with last-known GPS)       │  Creates SOS                  │
    │                              │  Builds patient context       │
    │◄─────────────────────────────│  status=ACTIVE                │
    │  SOS created (sos_id)        │  dispatch_status=RECEIVED     │
    │                              │                               │
    │  2. High-accuracy GPS fix    │                               │
    │─────────────────────────────►│                               │
    │  PATCH /sos/{id}/location    │  Updates GPS                  │
    │                              │                               │
    │  3. G-ONE ResQ session       │                               │
    │  POST /voice/resq/turn       │  Gemini/Groq/Deterministic    │
    │  (multi-turn conversation)   │  Returns voice response       │
    │                              │  + first-aid steps            │
    │  4. End call                 │                               │
    │─────────────────────────────►│                               │
    │  POST /voice/resq/handover   │  Generate clinical summary    │
    │                              │  Email emergency contacts     │
    │                              │                               │
    │                              │◄──────────────────────────────│
    │                              │  GET /sos/ (3s poll)          │
    │                              │  Admin sees SOS card          │
    │                              │                               │
    │                              │◄──────────────────────────────│
    │                              │  POST /sos/{id}/accept        │
    │                              │  hospital_id linked           │
    │                              │  bed decremented              │
    │◄─────────────────────────────│                               │
    │  3s poll refreshes:          │                               │
    │  Hospital name + ETA         │                               │
    │  Ambulance details           │                               │
    │                              │◄──────────────────────────────│
    │                              │  PATCH /sos/{id}/status       │
    │                              │  PATIENT_PICKED_UP            │
    │                              │                               │
    │                              │◄──────────────────────────────│
    │                              │  PATCH /sos/{id}/status       │
    │                              │  ARRIVED_AT_HOSPITAL          │
    │                              │                               │
    │                              │◄──────────────────────────────│
    │                              │  PATCH /sos/{id}/status       │
    │                              │  COMPLETED                    │
    │                              │  Resources released           │
    │─────────────────────────────►│                               │
    │  PUT /sos/{id}/resolve       │  status=RESOLVED              │
    │  (patient ends tracking)     │                               │
```

### Dispatch Status Values

| Value | Meaning |
|---|---|
| `RECEIVED` | SOS created, awaiting hospital action |
| `ACCEPTED` | Hospital accepted, ER bed reserved |
| `AMBULANCE_ASSIGNED` | Ambulance assigned and ready |
| `EN_ROUTE` | Ambulance traveling to patient |
| `PATIENT_PICKED_UP` | Patient in ambulance |
| `ARRIVED_AT_HOSPITAL` | Patient at emergency bay |
| `COMPLETED` | Case closed, resources released |

---

## 22. Hospital Admin Dashboard

**File:** `frontend/app/admin/index.tsx` (23 KB)

### Authentication

- Separate from patient auth
- Login: `POST /hospitals/login` → JWT with `role: "hospital"`
- Hospital credentials stored in `hospitals` table (not `users`)
- Default hospital ID: `process.env.EXPO_PUBLIC_HOSPITAL_ID || '1'`

### Real-Time Polling

```typescript
useEffect(() => {
  loadData();
  const timer = setInterval(loadData, 3000);
  return () => clearInterval(timer);
}, [hospitalId]);

// Parallel fetch:
const [live, completed] = await Promise.all([
  api.getAdminSOSAlerts(hospitalId),    // GET /sos/?status=ACTIVE
  api.getCompletedSOSAlerts(hospitalId) // GET /sos/completed
]);
```

### Admin SOS Card

Each card shows:
- Patient name (or `Patient #<user_id>`)
- Patient phone (with callback button)
- Colour-coded status badge
- Emergency description
- GPS coordinates (or "GPS location pending")
- AI classification + severity (from `ai_emergency_understanding` + `ai_severity`)
- 5-step case activity timeline with timestamps
- Context-sensitive action buttons

### Action Buttons by Status

| Current Status | Available Actions |
|---|---|
| RECEIVED / NEW | Accept Emergency, Reject (with reason) |
| ACCEPTED | Confirm Ambulance Assigned, Reject |
| AMBULANCE_ASSIGNED | Confirm Patient Pickup |
| PATIENT_PICKED_UP | Mark Arrived at Hospital |
| ARRIVED_AT_HOSPITAL | Complete Emergency Case |
| COMPLETED | (view only) |

### Status Badge Colours

| Status | Background | Text |
|---|---|---|
| NEW SOS | Red tint | Red |
| ACCEPTED | Green tint | Green |
| PICKED UP | Blue tint | Blue |
| AT HOSPITAL | Purple tint | Purple |
| COMPLETED | Darker green | Green |

---

## 23. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Recommended | PostgreSQL URL (SQLite fallback if absent) |
| `JWT_SECRET_KEY` | Yes | HS256 signing secret |
| `JWT_ALGORITHM` | No | Default: HS256 |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default: 30 |
| `GEMINI_API_KEY` | Recommended | Gemini 2.5 Flash (ResQ Tier 1 AI) |
| `POPPLER_PATH` | Yes (for OCR) | Path to Poppler bin (PDF→image) |
| `SMTP_HOST` | Recommended | SMTP host (e.g. smtp.resend.com) |
| `SMTP_PORT` | No | Default: 587 |
| `SMTP_USERNAME` | Recommended | SMTP username |
| `SMTP_PASSWORD` | Recommended | Resend API key |
| `EMAIL_FROM` | No | Sender display name + email |
| `AGORA_APP_ID` | Optional | Agora RTC App ID |
| `AGORA_APP_CERTIFICATE` | Optional | Agora RTC certificate |
| `AGORA_SECONDARY_CERTIFICATE` | Optional | Agora secondary cert |
| `AGORA_TOKEN_TTL` | No | Default: 3600 seconds |
| `BLAND_API_KEY` | Optional | Bland AI outbound calls |
| `BLAND_VOICE` | No | Default: maya |
| `ENABLE_SOS_VOICE_CALLS` | No | Default: true |

### Frontend (`frontend/.env` / EAS env)

| Variable | Set By | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | EAS preview profile | Production backend URL |
| `EXPO_PUBLIC_HOSPITAL_ID` | Optional | Default hospital ID for admin dashboard |

---

## 24. EAS Build & Deployment

### EAS Build Profiles (`frontend/eas.json`)

| Profile | Build Type | Distribution | Backend URL |
|---|---|---|---|
| `development` | Dev client | Internal | (local) |
| `preview` | APK | Internal | `https://lifelink-backend-1tzq.onrender.com` |
| `production` | AAB | Store | (auto-increment version) |

### App Configuration (`frontend/app.json`)

| Setting | Value |
|---|---|
| App name | LifeLink AI+ |
| Slug | `lifelink-ai-plus` |
| Android package | `com.lifelink.aiplus` |
| EAS Project ID | `5ae13db1-64be-453a-b830-403ccc0910d8` |
| `usesCleartextTraffic` | `true` (development only; HTTPS in production) |

### Android Permissions

```
USE_BIOMETRIC, USE_FINGERPRINT, RECORD_AUDIO,
ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION,
READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE
```

### iOS Permissions

```
NSSpeechRecognitionUsageDescription
NSMicrophoneUsageDescription
NSLocationWhenInUseUsageDescription
NSFaceIDUsageDescription (via expo-local-authentication)
```

### Build Command

```powershell
cd frontend
npx eas-cli build --platform android --profile preview
```

**Current build status at time of this document:** In progress (~1h15m running)

---

## 25. Demo Credentials

### Patient App

| Name | Email | Password |
|---|---|---|
| Prem Kakade | premkakade2005@gmail.com | Password123! |
| LifeLink Demo User | demo@lifelink.ai | Password123! |

### Hospital Admin Dashboard

| Hospital | Email | Password |
|---|---|---|
| CityCare Hospital | citycare@lifelink.demo | Demo@123 |
| Metro General Hospital | metro@lifelink.demo | Demo@123 |
| Lifeline Medical Centre | lifeline@lifelink.demo | Demo@123 |
| Harbourview Emergency Hospital | harbourview@lifelink.demo | Demo@123 |

---

## 26. Implementation Plan Summary

The full `IMPLEMENTATION_PLAN.md` covers:

1. **Current assessment** — Architecture overview, existing patterns
2. **Technical debt** — Known issues and gaps
3. **Backend work breakdown** — Config, migrations, auth audit, OCR workers, file security
4. **Frontend work breakdown** — Session hydration, permission flows, offline states, biometric re-auth
5. **Testing matrix** — Auth, wallet, records, hospital, SOS, accessibility, reliability, security
6. **Delivery milestones** — Foundation → Secure core → Records → Decision support → SOS beta → Release
7. **Key risks** — Emergency-service scope, healthcare compliance, medical AI, hospital capacity accuracy
8. **Definition of done** — Complete only with: API contract, auth controls, offline UX, tests, accessibility, logs, deploy instructions, sign-offs
9. **UI/UX system** — Calm mode + Emergency mode themes, WCAG AA contrast, 44×44pt touch targets, 8pt spacing rhythm
10. **Frontend implementation standards** — Token-first, primitive-first, server validation authoritative

---

## 27. Project Status

| Area | Status | Notes |
|---|---|---|
| Authentication (JWT + Biometrics) | ✅ Complete | Login, register, biometric, session restore |
| Home Dashboard | ✅ Complete | Readiness score, SOS button, top hospital |
| Emergency Wallet | ✅ Complete | Offline display, QR code (react-native-qrcode-svg), public HTML endpoint |
| SOS Flow (4 steps) | ✅ Complete | confirm → symptoms → ResQ → track |
| G-ONE ResQ Voice Modal | ✅ Complete | Hands-free, 3-layer AI, audio visualizer, transcript |
| Live Dispatch Tracking | ✅ Complete | 3s polling, 5-stage timeline, ambulance details |
| Hospital List / Detail | ✅ Complete | Distance ranked, bed counts |
| Admin Dashboard | ✅ Complete | 3s polling, accept/reject, dispatch progression |
| Medical Records | ✅ Complete | Upload, OCR, AI summary, wallet auto-merge |
| Readiness Screen | ✅ Complete | Score + actionable items |
| Learn / Education | ✅ Complete | Article list + detail |
| Notifications | ✅ Complete | In-app feed |
| Emergency Email (Resend) | ✅ Complete | HTML email to patient + all contacts |
| OCR Pipeline | ✅ Complete | PDF + image, tesseract, wallet merge |
| Agora RTC Calling | ✅ Integrated | Token endpoint on backend, native client |
| Database Fallback | ✅ Complete | PostgreSQL → SQLite auto-fallback |
| Auto-Migrations | ✅ Complete | Runs on every startup |
| Auto-Seeder | ✅ Complete | Users + hospitals guaranteed on cold start |
| EAS APK Build | 🔄 In Progress | Preview APK running at time of writing |
| Palghar Hospital Data | ✅ Available | `seed_palghar_hospitals.py` ready to run |

---

*This document was generated from a complete read of every source file in the GOne / LifeLink AI+ repository — October 2026.*
