# G-ONE / LifeLink AI+ — Complete System & Architecture Report

> **Project Name:** G-ONE (LifeLink AI+)  
> **Package Identifier:** `com.lifelink.aiplus`  
> **Version:** 1.0.0 (Expo SDK 57 / React Native 0.86.3)  
> **Status:** Production-Ready Emergency Response Ecosystem (Mobile App + Admin Dashboard + Cloud Backend + AI Voice Companion)  
> **Repository:** [`https://github.com/premexe/GOne`](https://github.com/premexe/GOne)  
> **Cloud API Endpoint:** `https://gone-backend.onrender.com`  
> **Generated:** October 2026  

---

## Table of Contents

1. [Executive Summary & Mission](#1-executive-summary--mission)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Mobile Application (Patient & Bystander Facing)](#4-mobile-application-patient--bystander-facing)
5. [G-ONE ResQ Voice-First Emergency Companion (New Feature Deep Dive)](#5-g-one-resq-voice-first-emergency-companion-new-feature-deep-dive)
6. [Hospital Emergency Admin Dashboard (`/admin`)](#6-hospital-emergency-admin-dashboard-admin)
7. [FastAPI Backend & Service Architecture](#7-fastapi-backend--service-architecture)
8. [Complete API Endpoints Catalog](#8-complete-api-endpoints-catalog)
9. [Database Models & Entity Relationships](#9-database-models--entity-relationships)
10. [AI, Speech, & Voice Engine Architecture](#10-ai-speech--voice-engine-architecture)
11. [Network Security, Android Policy & Offline Resilience](#11-network-security-android-policy--offline-resilience)
12. [Environment Configuration & Deployment Guide](#12-environment-configuration--deployment-guide)

---

## 1. Executive Summary & Mission

**G-ONE (LifeLink AI+)** is an end-to-end mission-critical emergency healthcare response platform. It bridges the critical pre-hospital gap between an emergency occurring, patient panic, first-aid administration, ambulance transit, and emergency room admission.

### Core Problems Solved
1. **The Critical "Golden Hour" Delay:** Patients in cardiac arrest, severe trauma, or stroke often suffer irreparable harm due to bystander inaction or panic before an ambulance arrives.
2. **Language & Panic Barriers:** During medical crises in multicultural regions (like India), patients and bystanders need urgent verbal assistance in their native mother tongue (Hindi, Marathi, or English).
3. **Manual App Friction:** In a life-threatening crisis, requiring users to repeatedly press buttons to talk or navigate complex forms fails.
4. **Hospital Triage Blindness:** Emergency rooms receive patients without pre-arrival knowledge of blood group, allergies, medications, or incident timeline.

### How G-ONE Solves It
- **1-Tap Emergency SOS:** Triggers multi-hospital dispatch, coordinates nearest ambulance, and transmits GPS coordinates.
- **In-App AI Voice Dispatcher (G-ONE ResQ):** Simulates an incoming emergency call and runs a **hands-free continuous conversational voice loop** in English, Hindi, and Marathi.
- **Protocol-Bound Guidance:** Delivers 9 authoritative clinical first-aid protocols (CPR, Choking/Heimlich, Stroke FAST test, Hemorrhage control, etc.).
- **"While Ambulance is En Route" Checklist:** Clear step-by-step pre-hospital survival instructions.
- **QR Medical Identity & Emergency Wallet:** Offline-accessible medical wallet with blood group, allergies, chronic conditions, and emergency contacts.
- **Hospital Command Center (`/admin`):** Real-time triage board with 3-second polling for emergency room coordinators.

---

## 2. Complete Technology Stack

| Domain | Technology / Library | Version / Role |
|---|---|---|
| **Mobile App Shell** | Expo Framework | SDK 57 (Managed Workflow) |
| **Mobile Runtime** | React Native | 0.86.3 (Fabric/Hermes engine) |
| **Language (Frontend)** | TypeScript | Strict type checking throughout |
| **Routing** | Expo Router | File-based navigation (`app/` directory) |
| **Global State** | Zustand | `useAuthStore`, `useSOSStore`, `useEmergencyStore` |
| **Storage (Persistent)** | AsyncStorage & SecureStore | Auth tokens, cached wallet, biometric credentials |
| **Biometric Auth** | `expo-local-authentication` | Fingerprint & FaceID biometric unlock |
| **Speech-to-Text (STT)** | `expo-speech-recognition` | Native Android/iOS speech recognizer + Web Speech fallback |
| **Text-to-Speech (TTS)** | `expo-speech` | Multi-language voice output (`en-IN`, `hi-IN`, `mr-IN`) |
| **In-App Calling Engine**| Agora RTC (`react-native-agora`) | In-app audio calling without telephone numbers |
| **Icons & Design** | `lucide-react-native` | High-fidelity medical and control icons |
| **QR Code Engine** | `react-native-qrcode-svg` | Emergency wallet QR code generation |
| **Backend Framework** | FastAPI (Python 3.12+ / 3.13) | High-performance asynchronous REST API |
| **ASGI Server** | Uvicorn & Gunicorn | Production concurrent web server |
| **ORM & Database** | SQLAlchemy & PostgreSQL | Supabase pooler with automatic SQLite fallback (`lifelink_ai.db`) |
| **Primary AI Provider** | Google Gemini (`gemini-2.5-flash`) | Via official `google-genai` SDK |
| **Deterministic AI Engine**| Python Regex / Rule Engine | 100% resilient offline fallback (never fails) |
| **OCR & Vision** | Pytesseract, PDF2Image, Poppler | Medical report & prescription extraction |
| **Email Delivery** | Resend / SMTP | Hospital alert and transcript notification emails |
| **Cloud Hosting** | Render | `https://gone-backend.onrender.com` |
| **Cloud Build System** | Expo Application Services (EAS)| Direct Standalone Android `.apk` distribution |

---

## 3. System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    MOBILE CLIENT                                      |
|                                (LifeLink AI+ / Expo)                                  |
|                                                                                       |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  |    Patient App     |  | Offline Medical QR |  |      G-ONE ResQ Voice Call      |  |
|  | - 1-Tap SOS Button |  | - Blood, Allergies |  | - Hands-free Continuous STT/TTS |  |
|  | - Live ETA Tracking|  | - Medications      |  | - Auto-Detect: EN, HI, MR       |  |
|  | - Hospital Ranking |  | - Emergency Contact|  | - Actions "Till Ambulance Comes"|  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |              Hospital Admin Command Center (/admin route in app)                |  |
|  |   - 3-Second Real-Time Polling Queue   - Accept / Reject Triage Board           |  |
|  |   - Ambulance Progression Milestones    - Clinical Handover Review               |  |
|  +---------------------------------------------------------------------------------+  |
+-------------------------------------------+-------------------------------------------+
                                            |
                                  HTTPS REST API / JSON
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                               FASTAPI BACKEND ENGINE                                  |
|                          (Port 8000 / Render Cloud Host)                              |
|                                                                                       |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  |    Auth & Users    |  |   SOS Dispatcher   |  |        G-ONE ResQ Service       |  |
|  | - JWT (HS256)      |  | - Distance Ranking |  | - Protocol Engine (9 Categories)|  |
|  | - BCrypt Password  |  | - Milestone State  |  | - Patient Medical Context Blend |  |
|  | - Biometrics Hook  |  | - Notification Bus |  | - Multi-turn Triage Reasoner    |  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|                                                           |                           |
|       +---------------------------------------------------+                           |
|       |                                                                               |
|       v                                                                               v
|  +---------------------------+                                  +-------------------+ |
|  |     AI Provider Layer     |                                  |  Agora RTC Engine | |
|  | - Google Gemini 2.5 Flash |                                  | - Token Generator | |
|  | - Deterministic Protocols |                                  | - In-App Channels | |
|  +---------------------------+                                  +-------------------+ |
+-------------------------------------------+-------------------------------------------+
                                            |
                     +----------------------+----------------------+
                     |                                             |
                     v                                             v
+-------------------------------------------+  +----------------------------------------+
|          DATABASE PERSISTENCE             |  |           EXTERNAL DISPATCH            |
| - Primary: PostgreSQL (Supabase Pooler)   |  | - Resend SMTP Email Service            |
| - Fallback: SQLite (lifelink_ai.db)       |  | - Emergency Contacts Email Alert       |
+-------------------------------------------+  +----------------------------------------+
```

---

## 4. Mobile Application (Patient & Bystander Facing)

### 4.1 Authentication & Profile
- **JWT-Based Authentication:** Standard `POST /users/login` returning Bearer tokens stored securely in `AsyncStorage`.
- **Biometric Unlock:** One-touch fingerprint/FaceID login via `expo-local-authentication`.
- **User Profile Management:** Edit name, phone number, date of birth, and blood group.

### 4.2 Home Dashboard (`app/(tabs)/index.tsx`)
- **Emergency Readiness Score:** Calculated dynamically (0-100%) based on completed profile info, emergency contacts, and uploaded medical documents.
- **Giant Emergency SOS Button:** Pulsating red action button that initiates instant GPS acquisition and hospital matching.
- **Nearby Hospital Cards:** Quick-reference cards showing nearest hospitals with distance, ETA, and ICU bed availability.

### 4.3 Offline Emergency Wallet & QR Identity (`app/(tabs)/wallet.tsx`)
- **Zero-Network Emergency Card:** Displays blood group, allergies, chronic conditions, and emergency notes even with airplane mode on.
- **Dynamic QR Code:** Built with `react-native-qrcode-svg`. First responders or bystanders can scan the patient's phone screen to access critical medical identity instantly without unlocking the phone.
- **Emergency Contacts Directory:** Quick 1-tap dial buttons for primary family members and physicians.

### 4.4 Medical Records & AI OCR (`app/(tabs)/records.tsx`)
- Upload prescriptions, discharge summaries, and lab reports (PDF, JPG, PNG).
- Background OCR extracts text via `pytesseract` and generates an AI summary of key findings and medications.

### 4.5 Live Emergency SOS Tracking (`app/sos/track.tsx`)
- Real-time milestone tracker:
  1. `LOCATING` — Acquiring GPS and querying nearby facilities.
  2. `MATCHING` — Transmitting alert to hospital triage board.
  3. `CONNECTED` — Hospital ER accepted the case.
  4. `EN_ROUTE` — Ambulance dispatched and en route (displays driver name, vehicle number, phone).
  5. `ARRIVED` — Paramedics on scene.
  6. `COMPLETED` — Patient admitted to ER.

---

## 5. G-ONE ResQ Voice-First Emergency Companion (New Feature Deep Dive)

Ported and adapted from the standalone G-ONE ResQ architecture ([GitHub](https://github.com/neha060314/G-ONE-ResQ.git)), this module transforms the app into an interactive emergency dispatcher companion.

### 5.1 Hands-Free Continuous Voice Loop (Duplex Dialogue)
- **Problem:** In past iterations, users had to tap a button to speak, then tap another button to send, repeating this every single turn. During CPR or heavy bleeding, hands cannot touch a phone screen.
- **Solution:**
  1. Dispatcher finishes speaking via TTS.
  2. Microphone **automatically activates** (`isListening = true`) with green audio waves.
  3. Patient speaks their symptoms.
  4. When speech pauses / finishes, the app **automatically submits the utterance**.
  5. The AI processes the response and **speaks aloud**.
  6. As soon as the AI speech ends, the mic **automatically listens again**.
  7. The entire first-aid triage occurs without the user touching the screen once.

### 5.2 Multi-Language Support & Auto-Detection
- **Supported Languages:**
  - `⚡ Auto-Detect`: Dynamically detects whether speech is English, Hindi, or Marathi and responds in that exact tongue.
  - `EN (English)`: Clear clinical English guidance.
  - `हिंदी (Hindi)`: Natural reassuring Hindi/Hinglish instructions.
  - `मराठी (Marathi)`: Empathetic Marathi guidance (*"तातडीची मदत तुमच्या स्थानावर येत आहे..."*).
- Language toggle pills are pinned to the header for manual override at any time.

### 5.3 Nine Clinical First-Aid Protocols
| Category | Severity | Key Symptoms Triggered | First-Aid Guidance Administered |
|---|---|---|---|
| **CARDIAC** | `CRITICAL` | Chest pain, pressure, left arm pain, seena dard, chhatit kal | Sit upright, loosen collar/belt, chew Aspirin if conscious & not allergic, prepare for CPR. |
| **SEVERE BLEEDING** | `CRITICAL` | Gushing blood, arterial wound, ghaav, raktsrav | Firm direct pressure with clean cloth, elevate limb above heart, never remove soaked cloths, apply tourniquet if needed. |
| **BREATHING DIFFICULTY**| `HIGH` | Asthma, wheezing, gasping, saans phulna, dam lagto | Sit leaning forward, 2-4 puffs of rescue inhaler, open windows, pursed-lip breathing, DO NOT lie flat. |
| **CHOKING** | `CRITICAL` | Food stuck, throat blocked, cannot cough, ghashat adakle | 5 firm back blows between shoulder blades, alternate with 5 Heimlich abdominal thrusts until clear. |
| **UNCONSCIOUS / CPR** | `CRITICAL` | Unresponsive, fainted, collapsed, behosh, beshuddha | Tap shoulders, check chest movement for 10s. If not breathing: 30 compressions at 100-120 bpm. If breathing: recovery position. |
| **STROKE / NEURO** | `CRITICAL` | Facial droop, slurred speech, arm weakness, pakshaghat | FAST exam, prop head slightly up, record exact symptom onset time, DO NOT give food, water, or aspirin. |
| **BURNS** | `HIGH` | Fire, boiling oil, scalding, acid, bhajla | Cool running tap water for 15-20 mins, do NOT use ice, butter, or paste, cover loosely with clean wrap. |
| **TRAUMA / FRACTURE** | `HIGH` | Road accident, bone fracture, fall, haddi tootna, apghat | DO NOT move neck/spine, immobilize limb with pillows/splints, apply cloth-wrapped ice pack. |
| **GENERAL EMERGENCY** | `MODERATE` | Severe pain, illness, distress, madad, tras | Reassure patient, keep in quiet ventilated space, maintain hydration, monitor vital responsiveness. |

### 5.4 "🚨 While Ambulance is En Route" Pre-Hospital Survival Card
A dedicated high-visibility amber card pinned below the dispatcher visualizer displaying actionable life-saving tasks:
- Specific posture guidance (sitting upright vs. recovery position).
- Unlocking the front gate/door for paramedics.
- Having previous prescriptions, ECG, and emergency wallet ready.
- Interactive checkboxes allowing the user to mark items as done.

### 5.5 Real-Time Dual Voice-to-Chat & Chat-to-Voice Feed
- **Live Captions:** While speaking, real-time speech subtitles stream across the screen.
- **Live Chat Bubbles:** Complete transcript feed with timestamps (`🤖 G-ONE ResQ` vs. `👤 You`).
- **Synchronized Visualizer:** 5-bar animated audio frequency visualizer reactive to voice output.
- **Hybrid Input:** Bottom text bar with Send button for noisy environments.

### 5.6 Structured Hospital Handover Summary
Upon call completion (`End Call`):
- Consolidates patient medical context (blood group, allergies).
- Finalizes emergency classification and urgency level.
- Generates a clinical handover report saved to the SOS record in the database.
- Automatically dispatches email notifications with the full conversation transcript to designated emergency contacts.

---

## 6. Hospital Emergency Admin Dashboard (`/admin`)

Embedded directly inside the app at route `/admin`, the hospital dashboard is designed for tablet, desktop, or mobile emergency triage staff.

### 6.1 Real-Time SOS Alert Queue
- **3-Second Auto-Polling:** Continuously queries `GET /sos/` for active emergencies without requiring manual refreshes.
- **Audio-Visual Strobe Alert:** Unacknowledged emergencies pulse with red priority badges and alert sounds.
- **Patient Dossier:** Displays patient name, phone number, GPS coordinates, distance, reported symptoms, and AI understanding.

### 6.2 One-Touch Triage Actions
- **Accept Case:** Hospital commits to admitting the patient. Assigns an ICU/Emergency bed.
- **Reject Case:** Prompts for clinical rejection reason (e.g., "ICU at maximum capacity", "No neurosurgeon on duty"). The central dispatcher instantly reroutes the patient to the next closest hospital.

### 6.3 Five-Stage Dispatch Progression
Admins advance the emergency through 5 structured lifecycle milestones:
1. `ACCEPTED` — ER bed reserved.
2. `AMBULANCE_ASSIGNED` — Vehicle dispatched with driver credentials.
3. `EN_ROUTE` — Paramedics traveling to patient GPS location.
4. `PATIENT_PICKED_UP / ARRIVED` — Patient secured in ambulance.
5. `COMPLETED / RESOLVED` — Patient admitted to ER; case archived.

### 6.4 Resource & Bed Capacity Management
- Tracks live counts:
  - Total Beds vs. Available General Beds
  - ICU Beds vs. Available ICU Beds
  - Oxygen-Supported Emergency Beds

---

## 7. FastAPI Backend & Service Architecture

The backend is built with FastAPI for speed and asynchronous concurrency.

### Directory Structure
```text
backend/
├── app/
│   ├── database/
│   │   ├── base.py           # Declarative Base
│   │   ├── session.py        # Database session factory with PostgreSQL -> SQLite fallback
│   │   └── migrations.py     # Schema migrations
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── users.py
│   │   ├── emergency_wallet.py
│   │   ├── emergency_contact.py
│   │   ├── hospital.py
│   │   ├── ambulance.py
│   │   ├── doctor.py
│   │   ├── sos.py
│   │   ├── medical_records.py
│   │   └── notification.py
│   ├── routers/              # API route controllers
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── wallet.py
│   │   ├── emergency_contacts.py
│   │   ├── hospitals.py
│   │   ├── ambulances.py
│   │   ├── doctors.py
│   │   ├── sos.py
│   │   ├── voice.py          # Voice calling & G-ONE ResQ endpoints
│   │   ├── medical_records.py
│   │   └── notifications.py
│   ├── schemas/              # Pydantic v2 validation models
│   └── services/             # Business logic layer
│       ├── voice_service.py      # Agora / Bland AI legacy bridge
│       ├── gone_resq_service.py  # G-ONE ResQ Multi-turn Engine
│       ├── email_service.py      # Resend SMTP transcript dispatch
│       └── ai_service.py         # OCR & Document summarizer
├── lifelink_ai.db            # Local SQLite fallback database
├── requirements.txt          # Python package manifest
└── Procfile                  # Cloud deployment configuration
```

### Resilient Dual-Database Engine
In [`backend/app/database/session.py`](backend/app/database/session.py), the backend attempts to connect to the primary PostgreSQL connection pool (Supabase). If cloud connection drops, network times out, or credentials expire, it **automatically and gracefully falls back to local SQLite (`lifelink_ai.db`)** without crashing.

---

## 8. Complete API Endpoints Catalog

### Authentication & Users
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/users/` | Register new user account (`profile_photo` optional) |
| `POST` | `/users/login` | Authenticate with email/password; returns JWT access token |
| `GET` | `/users/{user_id}` | Fetch user profile data |
| `PUT` | `/users/{user_id}` | Update user profile fields |
| `POST` | `/users/{user_id}/profile-photo` | Upload multipart profile avatar |

### Emergency Wallet & Contacts
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wallet/{user_id}` | Fetch patient emergency wallet (blood group, allergies, etc.) |
| `PUT` | `/wallet/{user_id}` | Update emergency wallet data |
| `GET` | `/emergency-contacts/` | List emergency contacts for authenticated user |
| `POST` | `/emergency-contacts/` | Create a new emergency contact |
| `DELETE`| `/emergency-contacts/{id}` | Remove an emergency contact |

### Emergency SOS & Dispatch
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sos/` | Trigger instant emergency SOS with GPS coordinates and description |
| `GET` | `/sos/` | List all active SOS alerts (used by Admin Dashboard polling) |
| `GET` | `/sos/my-active` | Retrieve authenticated patient's current active SOS |
| `GET` | `/sos/my-completed` | Retrieve authenticated patient's past SOS history |
| `POST` | `/sos/{sos_id}/accept` | Hospital accepts emergency case |
| `POST` | `/sos/{sos_id}/reject` | Hospital rejects case with clinical justification |
| `PATCH`| `/sos/{sos_id}/status` | Update dispatch status milestone (`EN_ROUTE`, `ARRIVED`, etc.) |
| `PATCH`| `/sos/{sos_id}/location`| Update patient's live moving GPS coordinates |
| `PUT` | `/sos/{sos_id}/resolve` | Mark SOS emergency case as resolved |

### G-ONE ResQ AI Voice Companion
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/voice/resq/protocols` | Fetch library of 9 clinical first-aid emergency protocols |
| `POST` | `/voice/resq/turn` | Process interactive speech turn (multi-lingual triage & guidance) |
| `POST` | `/voice/resq/handover` | Finalize emergency call, generate handover report, and dispatch emails |
| `GET` | `/voice/transcript/{sos_id}`| Retrieve complete audio transcript record and call summary |

### Hospitals, Ambulances & Doctors
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospitals/` | List all registered hospitals with bed availability and specialties |
| `GET` | `/ambulances/` | List ambulances with availability and GPS status |
| `GET` | `/doctors/` | List emergency room physicians on duty |

### Medical Records & AI OCR
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/medical-records/upload` | Multipart file upload for prescription/scan/report |
| `GET` | `/medical-records/{user_id}`| List all medical documents for a patient |
| `POST` | `/medical-records/record/{id}/process-ocr` | Run OCR extraction and generate AI clinical summary |

---

## 9. Database Models & Entity Relationships

```text
[User] 1 ──── 1 [EmergencyWallet]
  │
  ├──── N [EmergencyContact]
  ├──── N [MedicalRecord]
  └──── N [SOS] ────── 1 [Hospital]
           │
           ├───── 1 [Ambulance]
           ├───── 1 [Doctor]
           └───── N [HospitalRejection]
```

### Key Table Schemas

#### `users`
- `user_id` (PK, Integer, Auto-increment)
- `full_name` (String, required)
- `email` (String, unique, indexed)
- `hashed_password` (String, BCrypt)
- `phone_number` (String, indexed)
- `blood_group` (String, optional)
- `date_of_birth` (Date, optional)
- `profile_photo` (String, optional)

#### `emergency_wallet`
- `wallet_id` (PK)
- `user_id` (FK -> `users.user_id`)
- `blood_group` (String)
- `allergies` (Text)
- `current_medications` (Text)
- `chronic_conditions` (Text)
- `emergency_notes` (Text)

#### `sos_requests`
- `sos_id` (PK)
- `user_id` (FK -> `users.user_id`)
- `latitude`, `longitude` (Float, GPS coordinates)
- `description` (Text, symptoms reported)
- `status` (`ACTIVE`, `ACCEPTED`, `RESOLVED`, `CANCELLED`)
- `dispatch_status` (`SEARCHING`, `AMBULANCE_ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `COMPLETED`)
- `accepted_hospital_id` (FK -> `hospitals.hospital_id`)
- `assigned_ambulance_id` (FK -> `ambulances.ambulance_id`)
- `ai_emergency_understanding` (String, clinical category)
- `ai_severity` (`CRITICAL`, `HIGH`, `MODERATE`)
- `call_transcript` (Text, full multi-turn dialogue log)
- `call_summary` (Text, structured clinical handover)
- `created_at` (DateTime, UTC)

---

## 10. AI, Speech, & Voice Engine Architecture

```
[Patient Speech] 
       │
       ▼
[Speech Recognition (STT)] ──> Language Detector (_detect_language)
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                 [Marathi / Hindi]               [English]
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                       [Emergency Classifier Engine]
                       (Keywords: cardiac, stroke, etc.)
                                       │
                                       ▼
                     [Medical Wallet Context Injection]
                     (Blood group, allergies, conditions)
                                       │
                                       ▼
                     [Google Gemini 2.5 Flash API]
                     (Safe, protocol-bound prompt)
                                       │ (Fallback on timeout / offline)
                                       ▼
                     [Deterministic Protocol Library]
                                       │
                                       ▼
                     [Audio Response Generated]
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
              [Live Chat Bubble Feed]      [Native TTS (Expo-Speech)]
              (Subtitle & Transcript)      (Voice spoken aloud)
                                                     │
                                                     ▼
                                       [Auto-Listen Activated]
                                       (Continuous Hands-Free Loop)
```

---

## 11. Network Security, Android Policy & Offline Resilience

### 11.1 Android Cleartext Traffic Policy
- **Android 9+ Constraint:** Modern Android enforces `NetworkSecurityConfig` that blocks all unencrypted `http://` traffic with `CLEARTEXT communication not permitted`.
- **Solution Configured:**
  - In [`frontend/app.json`](frontend/app.json): `"usesCleartextTraffic": true` is enabled under `"android"`.
  - In [`frontend/src/services/http.ts`](frontend/src/services/http.ts): Default API URL defaults strictly to encrypted HTTPS (`https://gone-backend.onrender.com`).

### 11.2 Cloud Cold-Start Spin-Up Resilience
- **Render Free Tier Behavior:** Containers spin down after 15 minutes of inactivity and take 45–60 seconds to boot on incoming traffic.
- **Solution Configured:**
  - Extended client request timeout in `frontend/src/services/http.ts` from 30 seconds to **90 seconds** (`90000ms`), preventing premature aborts during cloud spin-up.

### 11.3 Offline Fail-Safe Fallbacks
1. **Medical Wallet:** Persisted in local encrypted device storage. Displays full emergency info and QR code without internet.
2. **First-Aid Guidance:** Hardcoded deterministic protocols in `GOneResQCallModal.tsx`. If the phone loses cell coverage, first-aid advice continues to display and speak locally.
3. **Database Fallback:** Backend automatically fails over to local SQLite if cloud PostgreSQL is unreachable.

---

## 12. Environment Configuration & Deployment Guide

### 12.1 Backend Environment Variables (`backend/.env`)
```ini
# Database (Supabase PostgreSQL pooler or fallback SQLite)
DATABASE_URL=postgresql://user:password@host:6543/postgres

# JWT Secret & Expiry
JWT_SECRET_KEY=lifelink-super-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Agora RTC Audio Calling (Optional)
AGORA_APP_ID=8d9be73b66634d248adac257e0871278
AGORA_APP_CERTIFICATE=your_agora_certificate

# Email Alerts (Resend SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=your_resend_api_key
```

### 12.2 Frontend Environment Configuration (`frontend/.env` & `frontend/eas.json`)
```ini
# Production Cloud Backend URL
EXPO_PUBLIC_API_URL=https://gone-backend.onrender.com
EXPO_PUBLIC_AGORA_APP_ID=8d9be73b66634d248adac257e0871278
```

### 12.3 How to Run Locally

#### 1. Start the FastAPI Backend
```powershell
cd c:\Users\Admin\OneDrive\Desktop\GOne\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation will be available at: `http://localhost:8000/docs`*

#### 2. Start the Frontend Metro Server
```powershell
cd c:\Users\Admin\OneDrive\Desktop\GOne\frontend
npx expo start
```

### 12.4 How to Build the Standalone Android APK

EAS Build is configured in [`frontend/eas.json`](frontend/eas.json) with `"buildType": "apk"` under the `preview` profile:

```powershell
cd c:\Users\Admin\OneDrive\Desktop\GOne\frontend
npx eas-cli build --platform android --profile preview
```

The cloud builder packages the entire React Native bundle, native audio drivers, and dependencies into an installable `.apk` file downloadable directly to any Android device from the [EAS Project Dashboard](https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds).

---

## 13. Summary of Latest Features Added

1. **Continuous Hands-Free Dialogue:** No repeated button taps required; auto-listens when AI finishes speaking, auto-submits on speech completion.
2. **Multi-Language Support with Auto-Detect:** Seamless voice and text interaction across **Marathi (मराठी)**, **Hindi (हिंदी)**, and **English**.
3. **"🚨 While Ambulance is En Route" Guide:** Dedicated high-priority pre-hospital checklist for bystanders while awaiting emergency units.
4. **Real-Time Synchronized Chat Feed:** Simultaneous speech-to-text transcript bubbles, sound-wave animations, and audio speech synthesis.
5. **Network Policy & Cold-Start Hardening:** Full cleartext traffic compliance and 90-second timeout handling for smooth production cloud operations.
