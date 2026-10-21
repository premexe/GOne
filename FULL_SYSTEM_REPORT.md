# GOne / LifeLink AI+ - Full System Report

> **Document Type:** Technical System Report
> **Generated:** October 2026
> **Project Name:** GOne / LifeLink AI+
> **Version:** 1.0.0 (EAS Build in progress)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Mobile Application](#4-mobile-application)
5. [G-ONE ResQ Voice Companion](#5-g-one-resq-voice-companion)
6. [Hospital Admin Dashboard](#6-hospital-admin-dashboard)
7. [FastAPI Backend and Service Architecture](#7-fastapi-backend-and-service-architecture)
8. [Complete API Endpoints Catalog](#8-complete-api-endpoints-catalog)
9. [Database Models and Entity Relationships](#9-database-models-and-entity-relationships)
10. [AI, Speech, and Voice Engine Architecture](#10-ai-speech-and-voice-engine-architecture)
11. [Network Security and Offline Resilience](#11-network-security-and-offline-resilience)
12. [Environment Configuration and Deployment](#12-environment-configuration-and-deployment)
13. [Summary of Latest Features](#13-summary-of-latest-features)

---

## 1. System Overview

LifeLink AI+ (code-name GOne) is a production-targeted emergency health companion for India. The system is structured as three integrated tiers:

1. **Mobile App** - A React Native / Expo application for patients, bystanders, and hospital triage staff.
2. **FastAPI Backend** - A Python server handling authentication, SOS dispatch, hospital coordination, AI triage, email alerts, and Agora RTC token generation.
3. **G-ONE ResQ** - An embedded voice-first AI emergency companion (WebSocket + REST) serving protocol-bound first-aid guidance in English, Hindi, and Marathi.

### Core Capabilities

- **1-Tap SOS Dispatch:** Single button triggers GPS acquisition, distance-ranked hospital matching, and emergency notification pipeline.
- **G-ONE ResQ Voice Call:** Hands-free continuous speech-to-text/text-to-speech AI dialogue for pre-hospital guidance with auto-detect language support.
- **Offline Emergency Wallet:** QR-code-backed medical identity (blood group, allergies, medications) readable without internet.
- **"While Ambulance is En Route" Checklist:** Interactive pre-hospital survival checklist for bystanders.
- **Hospital Command Center (`/admin`):** Real-time triage board for ER coordinators with 3-second polling.
- **EAS Cloud APK Distribution:** One-command Android APK build and distribution via Expo Application Services.

---

## 2. Complete Technology Stack

| Domain | Technology / Library | Version / Role |
|---|---|---|
| **Mobile App Shell** | Expo Framework | SDK 57 (Managed Workflow) |
| **Mobile Runtime** | React Native | 0.86.3 (Fabric/Hermes engine) |
| **Language (Frontend)** | TypeScript | Strict type checking throughout |
| **Routing** | Expo Router | File-based navigation (app/ directory) |
| **Global State** | Zustand | useAuthStore, useEmergencyStore, useHospitalStore, useProfileStore, useRecordStore |
| **Storage (Persistent)** | AsyncStorage and SecureStore | Auth tokens, cached wallet, biometric credentials |
| **Biometric Auth** | expo-local-authentication | Fingerprint and Face ID biometric unlock |
| **Speech-to-Text (STT)** | expo-speech-recognition | Native Android/iOS speech recognizer + Web Speech fallback |
| **Text-to-Speech (TTS)** | expo-speech | Multi-language voice output (en-IN, hi-IN, mr-IN) |
| **In-App Calling** | react-native-agora 4.6.4 | Agora RTC in-app audio calling without telephone numbers |
| **Icons** | lucide-react-native | Medical and control icons |
| **QR Code** | react-native-qrcode-svg | Emergency wallet QR code generation |
| **Backend Framework** | FastAPI (Python 3.12+) | High-performance asynchronous REST API |
| **ASGI Server** | Uvicorn and Gunicorn | Production concurrent web server |
| **ORM and Database** | SQLAlchemy + PostgreSQL | Supabase pooler with automatic SQLite fallback |
| **Primary AI Provider** | Google Gemini 2.5 Flash | Via official google-genai SDK |
| **Secondary AI Provider** | Groq (llama-3.3-70b-versatile) | Fallback when Gemini is unavailable or quota-limited |
| **Deterministic AI Engine** | Python Regex / Rule Engine | 100% resilient offline fallback (never fails) |
| **OCR and Vision** | Pytesseract, PDF2Image, Poppler | Medical report and prescription extraction |
| **Email Delivery** | Resend / SMTP | Hospital alert and transcript notification emails |
| **Phone Calls (Legacy)** | Bland AI | Optional outbound AI voice calls to patient phone |
| **Cloud Hosting** | Render | https://lifelink-backend-1tzq.onrender.com |
| **Cloud Build System** | Expo Application Services (EAS) | Direct standalone Android APK distribution |

---

## 3. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                    MOBILE CLIENT                                  |
|                              (LifeLink AI+ / Expo SDK 57)                         |
|                                                                                   |
|  +------------------+  +--------------------+  +-------------------------------+  |
|  |   Patient App    |  | Offline Medical QR |  |   G-ONE ResQ Voice Call       |  |
|  | - 1-Tap SOS      |  | - Blood, Allergies |  | - Hands-free Continuous STT   |  |
|  | - Live Tracking  |  | - Medications      |  | - Auto-Detect: EN, HI, MR     |  |
|  | - Hospital Rank  |  | - Emergency Contact|  | - "Till Ambulance Comes" Guide |  |
|  +------------------+  +--------------------+  +-------------------------------+  |
|                                                                                   |
|  +-------------------------------------------------------------------------------+|
|  |    Hospital Admin Command Center (/admin route in app)                        ||
|  |   - 3-Second Real-Time Polling Queue    - Accept / Reject Triage Board        ||
|  |   - Ambulance Progression Milestones    - Clinical Handover Review            ||
|  +-------------------------------------------------------------------------------+|
+-------------------------------------------+---------------------------------------+
                                            |
                              HTTPS REST API / WebSocket
                                            |
                                            v
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND ENGINE                              |
|               (Port 8000 / https://lifelink-backend-1tzq.onrender.com)            |
|                                                                                   |
|  +------------------+  +--------------------+  +-------------------------------+  |
|  |  Auth & Users    |  |  SOS Dispatcher    |  |  G-ONE ResQ Service           |  |
|  | - JWT (HS256)    |  | - Distance Ranking |  | - Protocol Engine (9 Types)   |  |
|  | - BCrypt Password|  | - Milestone State  |  | - Medical Wallet Context      |  |
|  | - Biometrics Hook|  | - Notification Bus |  | - Multi-turn Triage Reasoner  |  |
|  +------------------+  +--------------------+  +-------------------------------+  |
|                                                                                   |
|  +--------------------+  +------------------+  +-------------------------------+  |
|  | AI Provider Layer  |  | Agora RTC Engine |  | Email Service (Resend SMTP)   |  |
|  | - Gemini 2.5 Flash |  | - Token Generator|  | - Emergency Contact Alerts    |  |
|  | - Groq Fallback    |  | - In-App Channels|  | - Transcript Delivery         |  |
|  | - Deterministic    |  +------------------+  +-------------------------------+  |
|  +--------------------+                                                           |
|                                                                                   |
|  ResQ WebSocket (/ws/emergency) + Browser Client (/resq/)                         |
+-------------------------------------------+---------------------------------------+
                                            |
                     +----------------------+--------------------+
                     |                                           |
                     v                                           v
+--------------------------------------------+  +-----------------------------------------+
|         DATABASE PERSISTENCE               |  |           EXTERNAL SERVICES              |
| - Primary: PostgreSQL (Supabase Pooler)    |  | - Resend SMTP Email                      |
| - Fallback: SQLite (lifelink_ai.db)        |  | - Bland AI Phone Calls (legacy/optional) |
| - Auto-seeder: premkakade2005 + demo       |  | - EAS Cloud APK Builder                  |
+--------------------------------------------+  +-----------------------------------------+
```

---

## 4. Mobile Application (Patient and Bystander Facing)

### 4.1 Authentication and Profile

- **JWT-Based Authentication:** Standard POST /users/login returning Bearer tokens stored securely in AsyncStorage.
- **Biometric Unlock:** One-touch fingerprint/FaceID login via expo-local-authentication.
- **User Profile Management:** Edit name, phone number, date of birth, and blood group.
- **Session Restore:** Root layout hydrates session on app start and redirects appropriately.

### 4.2 Home Dashboard (app/(tabs)/index.tsx)

- **Emergency Readiness Score:** Calculated dynamically (0-100%) based on completed profile info, emergency contacts, and uploaded medical documents.
- **Giant Emergency SOS Button:** Pulsating red action button that initiates instant GPS acquisition and hospital matching.
- **Nearby Hospital Cards:** Quick-reference cards showing nearest hospitals with distance, ETA, and ICU bed availability.

### 4.3 Offline Emergency Wallet and QR Identity (app/(tabs)/wallet.tsx)

- **Zero-Network Emergency Card:** Displays blood group, allergies, chronic conditions, and emergency notes even with airplane mode on.
- **Dynamic QR Code:** Built with react-native-qrcode-svg. First responders or bystanders can scan the patient's phone screen to access critical medical identity without unlocking.
- **Emergency Contacts Directory:** Quick 1-tap dial buttons for primary family members and physicians.

### 4.4 SOS Emergency Flow

- **app/sos/emergency.tsx:** SOS confirmation screen with consent and GPS acquisition.
- **app/sos/provide-info.tsx:** Symptom and condition input before dispatch.
- **app/sos/resq.tsx:** G-ONE ResQ voice companion screen.
- **app/sos/track.tsx:** 5-stage dispatch milestone tracker with real-time hospital status.

### 4.5 Hospital Discovery (app/(tabs)/hospitals.tsx)

- Distance-ranked hospital list with ICU/general bed counts, specialties, and ETA.
- Tapping a hospital opens the detail view (app/hospitals/[id].tsx).

### 4.6 Medical Records (app/records/)

- Upload medical documents (prescriptions, scans, reports) via expo-document-picker.
- OCR extraction and AI clinical summary via backend endpoints.
- Records list and detail view with processing status.

### 4.7 Readiness and Education

- **app/readiness/index.tsx:** Readiness score breakdown with actionable missing items.
- **app/learn/index.tsx and [id].tsx:** Curated first-aid education content.

### 4.8 Notifications (app/notifications/index.tsx)

- In-app notification feed for SOS status updates and emergency alerts.

---

## 5. G-ONE ResQ Voice Companion

G-ONE ResQ is the voice-first AI emergency companion, embedded directly in the FastAPI backend and the mobile app.

### 5.1 Architecture Layers

```
[Patient Speech]
       |
       v
[expo-speech-recognition (STT)]
       |
       v
[Language Auto-Detector]
       |
       +------> Marathi / Hindi
       +------> English
       |
       v
[Emergency Classifier Engine]
(9 protocol categories, keyword matching)
       |
       v
[Medical Wallet Context Injection]
(Blood group, allergies, chronic conditions)
       |
       v
[Google Gemini 2.5 Flash] -- (timeout/offline) --> [Groq llama-3.3-70b] -- (fallback) --> [Deterministic Protocol Library]
       |
       v
[Safety Validator]
       |
       v
[Voice Response via expo-speech + Chat Bubble Feed]
       |
       v
[Auto-Listen Activated (Continuous Hands-Free Loop)]
```

### 5.2 Emergency Protocol Categories (9)

| Category | Severity | Keywords (Sample) | Key Actions |
|---|---|---|---|
| **CARDIAC** | CRITICAL | chest pain, heart attack, dil ka daura, hruday | Sit upright, loosen clothing, give Aspirin if not allergic, CPR if unresponsive |
| **STROKE** | CRITICAL | stroke, paralysis, face drooping, FAST, ardhaang | F.A.S.T. test, lay flat, do NOT give food/water, keep awake |
| **BREATHING** | CRITICAL | cannot breathe, suffocation, saans nahi, dama | Sit upright at 45 deg, loosen clothing, open windows, pursed lip breathing |
| **CHOKING** | CRITICAL | choking, food stuck, gavat adakla | 5 back blows + 5 abdominal thrusts (Heimlich), 911 if unconscious |
| **BLEEDING** | HIGH | severe bleeding, accident, rakt, khoon bahu | Direct firm pressure for 10 min, elevate limb, tourniquet above wound |
| **BURNS** | HIGH | fire, boiling oil, acid, scalding | Cool running water 15-20 min, no ice/butter/paste, cover loosely |
| **TRAUMA** | HIGH | road accident, bone fracture, haddi tootna | Do NOT move neck/spine, immobilize limb, ice pack |
| **NEUROLOGICAL** | CRITICAL | seizure, fit, convulsion, jhad | Do NOT restrain, protect head, clear space, recovery position after |
| **GENERAL** | MODERATE | severe pain, illness, distress, madad | Reassure, quiet ventilated space, maintain hydration |

### 5.3 Provider Strategy

```
Primary: Google Gemini 2.5 Flash
      |
      | (failure / quota / timeout)
      v
Secondary: Groq llama-3.3-70b-versatile
      |
      | (failure / quota / timeout)
      v
Tertiary: Deterministic Protocol Response (always succeeds offline)
```

### 5.4 "While Ambulance is En Route" Pre-Hospital Survival Card

A dedicated high-visibility amber card below the dispatcher visualizer displaying:
- Specific posture guidance (sitting upright vs. recovery position).
- Unlocking the front gate/door for paramedics.
- Having previous prescriptions, ECG, and emergency wallet ready.
- Interactive checkboxes the user can mark as done.

### 5.5 Real-Time Dual Voice-to-Chat and Chat-to-Voice Feed

- **Live Captions:** Real-time speech subtitles while speaking.
- **Live Chat Bubbles:** Complete transcript feed with timestamps (G-ONE ResQ vs. You).
- **Synchronized Visualizer:** 5-bar animated audio frequency visualizer.
- **Hybrid Input:** Bottom text bar with Send button for noisy environments.

### 5.6 Structured Hospital Handover Summary

Upon call completion (End Call):
- Consolidates patient medical context (blood group, allergies).
- Finalizes emergency classification and urgency level.
- Generates a clinical handover report saved to the SOS record in the database.
- Automatically dispatches email notifications with the full conversation transcript to emergency contacts.

### 5.7 WebSocket Interface (ResQ Service)

The G-ONE ResQ module is mounted into the main G-ONE FastAPI backend:
- Browser voice client served at: /resq/
- WebSocket endpoint: ws://<host>/ws/emergency
- REST health check: /api/v1/health

---

## 6. Hospital Emergency Admin Dashboard (/admin)

Embedded at route /admin inside the app, designed for tablet or mobile triage staff.

### 6.1 Real-Time SOS Alert Queue

- **3-Second Auto-Polling:** Continuously queries GET /sos/ for active emergencies.
- **Audio-Visual Strobe Alert:** Unacknowledged emergencies pulse with red priority badges.
- **Patient Dossier:** Displays patient name, phone, GPS coordinates, symptoms, AI understanding.

### 6.2 One-Touch Triage Actions

- **Accept Case:** Hospital commits to admitting the patient; assigns an ICU/Emergency bed.
- **Reject Case:** Prompts for clinical rejection reason. The system instantly reroutes to the next closest hospital.

### 6.3 Five-Stage Dispatch Progression

1. ACCEPTED - ER bed reserved.
2. AMBULANCE_ASSIGNED - Vehicle dispatched with driver credentials.
3. EN_ROUTE - Paramedics traveling to patient GPS location.
4. PATIENT_PICKED_UP / ARRIVED - Patient secured in ambulance.
5. COMPLETED / RESOLVED - Patient admitted to ER; case archived.

### 6.4 Resource and Bed Capacity Management

Tracks live counts: Total Beds, Available General Beds, ICU Beds, Available ICU Beds, Oxygen-Supported Emergency Beds.

---

## 7. FastAPI Backend and Service Architecture

### Directory Structure

```
backend/
|-- app/
|   |-- database/
|   |   |-- base.py           Declarative Base
|   |   |-- connection.py     Engine factory with PostgreSQL -> SQLite fallback
|   |   |-- session.py        Database session factory
|   |   |-- migrations.py     Lightweight schema migrations (new columns)
|   |   `-- seeder.py         Auto-seed verified accounts and hospital network
|   |-- models/               SQLAlchemy ORM models
|   |   |-- users.py
|   |   |-- emergency_wallet.py
|   |   |-- emergency_contact.py
|   |   |-- hospital.py
|   |   |-- ambulance.py
|   |   |-- doctor.py
|   |   |-- sos.py            (includes sos_rejection)
|   |   |-- medical_record.py
|   |   `-- notification.py
|   |-- routers/              API route controllers (12 modules)
|   |   |-- users.py
|   |   |-- emergency_wallet.py
|   |   |-- emergency_contacts.py
|   |   |-- hospitals.py
|   |   |-- ambulances.py
|   |   |-- doctors.py
|   |   |-- sos.py
|   |   |-- voice.py          G-ONE ResQ endpoints
|   |   |-- medical_records.py
|   |   |-- notifications.py
|   |   |-- emergency_response.py
|   |   `-- emergency_orchestration.py
|   |-- schemas/              Pydantic v2 validation models
|   |-- services/             Business logic layer
|   |   |-- gone_resq_service.py   G-ONE ResQ multi-turn engine
|   |   |-- voice_service.py       Bland AI phone call bridge (legacy)
|   |   |-- email_service.py       Resend SMTP transcript dispatch
|   |   |-- sos_service.py         SOS orchestration and hospital ranking
|   |   |-- emergency_contact_service.py
|   |   |-- emergency_orchestration_service.py
|   |   |-- emergency_response_service.py
|   |   |-- emergency_wallet_service.py
|   |   |-- medical_record_service.py
|   |   |-- notification_service.py
|   |   |-- ocr_service.py         Pytesseract OCR for medical records
|   |   |-- ai_pipeline_service.py
|   |   `-- user_service.py
|   `-- main.py               FastAPI entry point
|-- resq_service/             Integrated G-ONE ResQ voice AI service
|-- gone_ai_module/           Legacy AI triage module
|-- lifelink_ai.db            Local SQLite fallback database
|-- requirements.txt
`-- .env.example
```

### Resilient Dual-Database Engine

In backend/app/database/connection.py, the backend:
1. Attempts PostgreSQL connection with a 5-second timeout.
2. On any failure, automatically falls back to SQLite (lifelink_ai.db) without crashing.
3. Logs a warning when failover occurs.

### Auto-Seeder

On every startup, backend/app/database/seeder.py ensures:
- Primary user: premkakade2005@gmail.com / Password123!
- Demo user: demo@lifelink.ai / Demo123!
- Hospital admin credentials
- Default hospital network records

---

## 8. Complete API Endpoints Catalog

### Authentication and Users

| Method | Endpoint | Description |
|---|---|---|
| POST | /users/ | Register new user account (profile_photo optional) |
| POST | /users/login | Authenticate with email/password; returns JWT access token |
| GET | /users/{user_id} | Fetch user profile data |
| PUT | /users/{user_id} | Update user profile fields |
| POST | /users/{user_id}/profile-photo | Upload multipart profile avatar |

### Emergency Wallet and Contacts

| Method | Endpoint | Description |
|---|---|---|
| GET | /wallet/{user_id} | Fetch patient emergency wallet |
| PUT | /wallet/{user_id} | Update emergency wallet data |
| GET | /emergency-contacts/ | List emergency contacts for authenticated user |
| POST | /emergency-contacts/ | Create a new emergency contact |
| DELETE | /emergency-contacts/{id} | Remove an emergency contact |

### Emergency SOS and Dispatch

| Method | Endpoint | Description |
|---|---|---|
| POST | /sos/ | Trigger instant emergency SOS with GPS coordinates |
| GET | /sos/ | List all active SOS alerts (Admin Dashboard polling) |
| GET | /sos/my-active | Authenticated patient's current active SOS |
| GET | /sos/my-completed | Authenticated patient's past SOS history |
| POST | /sos/{sos_id}/accept | Hospital accepts emergency case |
| POST | /sos/{sos_id}/reject | Hospital rejects case with clinical justification |
| PATCH | /sos/{sos_id}/status | Update dispatch status milestone |
| PATCH | /sos/{sos_id}/location | Update patient's live GPS coordinates |
| PUT | /sos/{sos_id}/resolve | Mark SOS emergency case as resolved |

### G-ONE ResQ AI Voice Companion

| Method | Endpoint | Description |
|---|---|---|
| GET | /voice/resq/protocols | Fetch library of 9 clinical first-aid emergency protocols |
| POST | /voice/resq/turn | Process interactive speech turn (multi-lingual triage and guidance) |
| POST | /voice/resq/handover | Finalize emergency call, generate handover report, dispatch emails |
| GET | /voice/transcript/{sos_id} | Retrieve complete audio transcript record and call summary |

### ResQ WebSocket Service

| Method | Endpoint | Description |
|---|---|---|
| WS | /ws/emergency | Real-time bidirectional voice conversation |
| GET | /api/v1/health | ResQ service health check |

### Hospitals, Ambulances and Doctors

| Method | Endpoint | Description |
|---|---|---|
| GET | /hospitals/ | List all registered hospitals with bed availability |
| GET | /ambulances/ | List ambulances with availability and GPS status |
| GET | /doctors/ | List emergency room physicians on duty |

### Medical Records and AI OCR

| Method | Endpoint | Description |
|---|---|---|
| POST | /medical-records/upload | Multipart file upload for prescription/scan/report |
| GET | /medical-records/{user_id} | List all medical documents for a patient |
| POST | /medical-records/record/{id}/process-ocr | Run OCR extraction and generate AI clinical summary |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | / | API health confirmation message |
| GET | /health | Lightweight readiness probe |

---

## 9. Database Models and Entity Relationships

```
[User] 1 -- 1 [EmergencyWallet]
  |
  |-- N [EmergencyContact]
  |-- N [MedicalRecord]
  `-- N [SOS] -- 1 [Hospital]
           |
           |-- 1 [Ambulance]
           |-- 1 [Doctor]
           `-- N [SOSRejection]
```

### Key Table Schemas

#### users
- user_id (PK, Integer, Auto-increment)
- full_name (String, required)
- email (String, unique, indexed)
- password_hash (String, BCrypt)
- phone_number (String, indexed)
- blood_group (String, optional)
- date_of_birth (Date, optional)
- profile_photo (String, optional)

#### emergency_wallet
- wallet_id (PK)
- user_id (FK -> users.user_id)
- blood_group (String)
- allergies (Text)
- current_medications (Text)
- chronic_conditions (Text)
- emergency_notes (Text)

#### sos_requests
- sos_id (PK)
- user_id (FK -> users.user_id)
- latitude, longitude (Float, GPS coordinates)
- description (Text, symptoms reported)
- status (ACTIVE, ACCEPTED, RESOLVED, CANCELLED)
- dispatch_status (SEARCHING, AMBULANCE_ASSIGNED, EN_ROUTE, ARRIVED, COMPLETED)
- accepted_hospital_id (FK -> hospitals.hospital_id)
- assigned_ambulance_id (FK -> ambulances.ambulance_id)
- ai_emergency_understanding (String, clinical category)
- ai_severity (CRITICAL, HIGH, MODERATE)
- call_transcript (Text, full multi-turn dialogue log)
- call_summary (Text, structured clinical handover)
- created_at (DateTime, UTC)

---

## 10. AI, Speech, and Voice Engine Architecture

### Frontend: Three-Layer Emergency AI Triage

The frontend emergencyAiTriage.ts implements:
1. **Primary:** Cloud LifeLink Backend (/voice/resq/turn)
2. **Secondary:** Direct Google Gemini Generative API (zero-cold-start, live streaming chat)
3. **Tertiary:** Comprehensive Local Clinical First-Aid Protocol Engine (100% offline-ready)

### Backend: G-ONE ResQ gone_resq_service.py

- Protocol-first: The protocol engine determines allowed actions before Gemini is queried.
- LLM second: Gemini / Groq converts approved information into natural conversational language.
- Safety before speech: Every generated response is validated before it reaches the patient.
- Graceful degradation: Loss of an external provider never crashes the emergency session.
- No hallucinated patient data: Unavailable patient information remains unavailable.

---

## 11. Network Security, Android Policy, and Offline Resilience

### 11.1 Android Cleartext Traffic Policy

- In frontend/app.json: "usesCleartextTraffic": true is enabled under "android" for local development.
- Production API URL defaults to HTTPS (https://lifelink-backend-1tzq.onrender.com).
- EAS preview build injects the HTTPS URL automatically via eas.json env vars.

### 11.2 Cloud Cold-Start Spin-Up Resilience

- Render free-tier containers spin down after 15 minutes of inactivity and take 45-60 seconds to boot.
- Client request timeout in frontend/src/services/http.ts is set to 90 seconds (90000ms).
- The dynamic Expo Go URL resolver in http.ts follows the laptop's current Wi-Fi IP automatically.

### 11.3 Offline Fail-Safe Fallbacks

1. **Medical Wallet:** Persisted in local encrypted device storage. Displays full emergency info and QR without internet.
2. **First-Aid Guidance:** Hardcoded deterministic protocols in GOneResQCallModal.tsx and emergencyAiTriage.ts. If the phone loses cell coverage, first-aid advice continues to display and speak locally.
3. **Database Fallback:** Backend automatically fails over to local SQLite if cloud PostgreSQL is unreachable.
4. **Frontend AI Triage Fallback:** Three-layer triage means at least one tier always responds.

---

## 12. Environment Configuration and Deployment

### 12.1 Backend Environment Variables (backend/.env)

```ini
# Database (Supabase PostgreSQL pooler or fallback SQLite)
DATABASE_URL=postgresql://user:password@host:6543/postgres

# JWT Secret and Expiry
JWT_SECRET_KEY=lifelink-super-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Agora RTC Audio Calling
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# Email Alerts (Resend SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=your_resend_api_key

# Bland AI Phone Calls (optional legacy)
BLAND_API_KEY=your_bland_api_key_here
BLAND_VOICE=maya
ENABLE_SOS_VOICE_CALLS=false
PUBLIC_BACKEND_URL=https://lifelink-backend-1tzq.onrender.com
```

### 12.2 Frontend Environment Configuration

**frontend/.env** (local development only):
```ini
EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

**frontend/eas.json** (preview build):
```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://lifelink-backend-1tzq.onrender.com"
  }
}
```

### 12.3 How to Run Locally

#### 1. Start the FastAPI Backend

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

API Swagger Documentation available at: http://localhost:8000/docs

#### 2. Start the Frontend Metro Server

```powershell
cd frontend
npx expo start
```

#### 3. Use the startup script

```powershell
./start.ps1
```

### 12.4 How to Build the Standalone Android APK

EAS Build is configured in frontend/eas.json with "buildType": "apk" under the preview profile:

```powershell
cd frontend
npx eas-cli build --platform android --profile preview
```

EAS project: https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds
EAS CLI version requirement: >= 24.7.0

---

## 13. Summary of Latest Features Added

1. **G-ONE ResQ Fully Integrated into Main Backend:** The resq_service WebSocket router and static browser client are now mounted directly into the main FastAPI server (no separate service needed).
2. **Continuous Hands-Free Dialogue:** No repeated button taps required; auto-listens when AI finishes speaking, auto-submits on speech completion.
3. **Three-Language Support with Auto-Detect:** Seamless voice and text interaction across Marathi, Hindi, and English.
4. **Groq Secondary AI Provider:** When Gemini is unavailable or quota-limited, the system falls back to Groq (llama-3.3-70b-versatile) before the deterministic engine.
5. **Auto-Seeder on Every Startup:** Verified demo accounts and hospital network are guaranteed on every cold start or container restart.
6. **"While Ambulance is En Route" Guide:** Dedicated high-priority pre-hospital interactive checklist.
7. **Real-Time Synchronized Chat Feed:** Simultaneous speech-to-text transcript bubbles, sound-wave animations, and audio speech synthesis.
8. **EAS APK Build Pipeline:** Full EAS configuration with preview APK profile pointing to the production Render backend URL.
9. **Network Policy and Cold-Start Hardening:** Full cleartext traffic compliance and 90-second timeout handling for smooth Render cloud operations.
10. **Agora RTC Token Generation:** Backend generates Agora RTC tokens for in-app audio calling without telephone numbers.