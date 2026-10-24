# G-ONE: AI-Powered Emergency Health Companion

**Full-Stack Emergency Response Platform for the Indian Healthcare Context**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020)](https://expo.dev/)
[![Python](https://img.shields.io/badge/Python-3.12+-yellowgreen)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com/)
[![Render](https://img.shields.io/badge/Render-Hosted-46E3B7)](https://render.com/)
[![EAS](https://img.shields.io/badge/EAS-Build%20%26%20Submit-000020)](https://expo.dev/eas)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-orange)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

## Table of Contents

1. [What is G-ONE?](#what-is-g-one)
2. [The G-ONE Framework](#the-g-one-framework)
3. [System Architecture & Tech Stack](#system-architecture--tech-stack)
4. [Key Features](#key-features)
5. [Repository Layout](#repository-layout)
6. [Getting Started](#getting-started)
7. [Environment Configuration](#environment-configuration)
8. [Deployment](#deployment)
9. [License](#license)

---

## What is G-ONE?

G-ONE is an intelligent emergency health companion designed specifically for the Indian context. It connects patients in crisis with the nearest available hospitals, dispatches ambulances, and provides real-time AI-guided pre-hospital care â€” all from a single tap.

**The Problem:** In India, critical minutes are lost between a medical emergency and hospital admission due to fragmented communication, lack of real-time hospital visibility, and absence of guided pre-hospital support.

**The Solution:** G-ONE creates a unified emergency response loop. A patient triggers SOS â†’ the backend instantly ranks and notifies the nearest hospitals â†’ a hospital accepts and dispatches â†’ the patient receives live tracking and AI voice guidance â€” all in under 30 seconds.

### Where is G-ONE Useful?

- **Cardiac & Stroke Emergencies:** Rapid hospital matching + AI voice guidance for CPR and stroke response
- **Road Accidents & Trauma:** Immediate triage and ambulance dispatch with live GPS tracking
- **Disaster & Mass Casualty Events:** Coordinated multi-hospital resource management
- **Rural & Peri-Urban Areas:** Works across language barriers (English, Hindi, Marathi) with offline fallback

---

## The G-ONE Framework

G-ONE is built on three tightly integrated layers designed for speed, resilience, and clinical accuracy.

### 1. Patient Layer â€” Mobile App (Expo / React Native)
- 1-tap SOS with automatic GPS acquisition
- G-ONE ResQ: hands-free AI voice triage (EN / HI / MR)
- Emergency Wallet with QR-scannable medical identity
- Live 5-stage dispatch milestone tracker

### 2. Intelligence Layer â€” FastAPI Backend
- Haversine-based nearest-hospital ranking
- G-ONE ResQ WebSocket voice engine (9 emergency protocol categories)
- Multi-tier LLM: Gemini 2.5 Flash â†’ Groq â†’ Deterministic offline fallback
- Automated clinical handover report + Resend email dispatch

### 3. Operations Layer â€” Hospital Dashboard (Vite + React)
- Real-time SOS queue with 3-second polling
- Accept / Reject triage with clinical rejection reason
- 5-stage dispatch progression management
- Live bed count: General, ICU, Oxygen-supported

---

## System Architecture & Tech Stack

```
+-------------------------------------------------------+
|                    G-ONE Mobile App                   |
|                (Expo SDK 57 / React Native 0.86)      |
|                                                       |
|  Patient Screens   |  G-ONE ResQ Voice Screen         |
|  - SOS 1-tap       |  - Hands-free STT/TTS dialogue   |
|  - Live tracking   |  - EN / HI / MR auto-detect      |
|  - Wallet QR       |  - Pre-hospital survival guide   |
|                                                       |
|  Hospital Admin Dashboard (/admin)                    |
|  - 3-sec real-time polling queue                      |
|  - Accept / Reject triage board                       |
|  - 5-stage dispatch progression                       |
+------------------------+------------------------------+
                         | HTTPS / WSS (REST + WebSocket)
                         v
+-------------------------------------------------------+
|          FastAPI Backend (Port 8000)                  |
|  Hosted: https://lifelink-backend-1tzq.onrender.com   |
|                                                       |
|  Auth & Users | SOS Dispatcher | G-ONE ResQ Engine    |
|  JWT / BCrypt | Distance Rank  | 9 Protocol Types     |
|               | Milestone State| Gemini + Fallback    |
|                                                       |
|  ResQ WebSocket voice session                         |
|  Resend email handover (when configured)              |
+------+----------------------------+-------------------+
       |                            |
       v                            v
PostgreSQL (Supabase)         SQLite auto-fallback
                              (lifelink_ai.db)
```

| Layer              | Technology                                        |
|--------------------|---------------------------------------------------|
| Mobile Framework   | Expo SDK 57 (Managed Workflow)                    |
| Runtime            | React Native 0.86.3 (Fabric / Hermes)             |
| Language           | TypeScript (strict)                               |
| Routing            | Expo Router (file-based)                          |
| State              | Zustand                                           |
| Speech STT         | expo-speech-recognition                           |
| Speech TTS         | expo-speech                                       |
| QR Code            | react-native-qrcode-svg                           |
| Backend            | FastAPI + Uvicorn / Gunicorn                      |
| ORM                | SQLAlchemy 2                                      |
| Database           | PostgreSQL (Supabase) with SQLite auto-fallback   |
| AI Provider        | Google Gemini 2.5 Flash (google-genai)            |
| Email              | Resend SMTP                                       |
| Cloud Hosting      | Render (lifelink-backend-1tzq.onrender.com)       |
| App Distribution   | Expo Application Services (EAS)                   |
| Hospital Dashboard | Vite + React (independent static site)            |

---

## Key Features

### Patient App

| Feature | Description |
|---|---|
| **1-Tap SOS** | GPS acquisition + nearest hospital matching in one tap |
| **G-ONE ResQ Voice Call** | Hands-free AI voice triage in English, Hindi, Marathi |
| **Emergency Wallet** | Cached patient card with blood group, allergies, medications, and contacts |
| **Dynamic QR Code** | First-responder scannable medical identity (react-native-qrcode-svg) |
| **Live Tracking** | 5-stage dispatch milestone tracker with real-time GPS |
| **Medical Records** | Upload prescriptions / scans; OCR + AI clinical summary |
| **Readiness Score** | 0â€“100% preparedness score based on profile completeness |
| **Biometric Login** | Fingerprint / Face ID via expo-local-authentication |

### Hospital Admin Dashboard

| Feature | Description |
|---|---|
| **Live SOS Queue** | 3-second auto-polling of all active emergencies |
| **Accept / Reject** | One-touch triage with clinical rejection reason |
| **Dispatch Progression** | Move case through 5 defined lifecycle stages |
| **Resource Tracking** | Live bed counts: General, ICU, Oxygen-supported |

### G-ONE ResQ AI Voice Companion

- **9 Emergency Protocol Categories:** Cardiac, Stroke, Breathing, Choking, Bleeding, Burns, Trauma, Neurological, General
- **Multi-tier Provider Strategy:** Google Gemini 2.5 Flash â†’ Groq â†’ Deterministic offline fallback (never crashes)
- **Structured Handover:** Auto-generates clinical handover report + dispatches email to emergency contacts
- **WebSocket Interface:** Real-time bidirectional voice conversation at `ws://<host>/ws/emergency`

---

## Repository Layout

```
GOne/
|-- frontend/                    Expo 57 + React Native 0.86 mobile app
|   |-- app/                     Expo Router file-based screens
|   |   |-- (auth)/login.tsx     Login / register + biometric unlock
|   |   |-- (tabs)/              Bottom-tab screens (Home, Hospitals, Profile, Wallet)
|   |   |-- admin/index.tsx      Hospital emergency command-center dashboard
|   |   |-- sos/                 SOS trigger -> provide-info -> resq -> track
|   |   |-- hospitals/[id].tsx   Hospital detail view
|   |   |-- records/             Medical records list + detail
|   |   |-- readiness/           Emergency readiness score
|   |   |-- learn/               First-aid education module
|   |   `-- notifications/       In-app notification feed
|   |-- src/
|   |   |-- components/          SOSButton, WalletCard, TimelineStepper ...
|   |   |-- services/            API client, speech recognition, text-to-speech, location
|   |   |-- store/               Zustand global stores (auth, emergency, hospital, ...)
|   |   |-- constants/           Theme colours, spacing, typography
|   |   `-- types/               Shared TypeScript interfaces
|   |-- app.json                 Expo / EAS app config (package: com.lifelink.aiplus)
|   `-- eas.json                 EAS Build profiles (development, preview APK, production)
|
|-- backend/                     FastAPI Python 3.12+ API server
|   |-- app/
|   |   |-- database/            SQLAlchemy engine, connection, seeder, migrations
|   |   |-- models/              ORM models: User, SOS, Hospital, Ambulance, Doctor ...
|   |   |-- routers/             12 route controllers
|   |   |-- schemas/             Pydantic v2 request/response models
|   |   |-- services/            gone_resq_service, voice_service, email_service, sos_service ...
|   |   |-- security/            JWT + BCrypt password helpers
|   |   `-- main.py              FastAPI entry point; mounts all routers + ResQ service
|   |-- resq_service/            G-ONE ResQ standalone voice-AI module (integrated)
|   |   |-- src/                 WebSocket API, session manager, LLM providers, protocols
|   |   |-- web/                 Bundled browser voice client served at /resq/
|   |   |-- protocols/           YAML-defined clinical first-aid protocol library
|   |   |-- ARCHITECTURE.md      Full ResQ service architecture document
|   |   |-- INTEGRATION.md       How ResQ is mounted into the main G-ONE backend
|   |   `-- README.md            ResQ standalone setup and development guide
|   |-- gone_ai_module/          Legacy Python AI triage module (Gemini -> Ollama -> Rules)
|   |-- .env.example             Full environment configuration template
|   `-- requirements.txt         Python package manifest
|
|-- hospital-dashboard/          Independent Vite + React hospital operations dashboard
|   |-- src/                     Dashboard UI, mock data, API adapter, map views
|   |-- tests/                   Dashboard verification and API-contract checks
|   |-- .env.example             Safe dashboard configuration template
|   `-- vercel.json              Static-hosting SPA rewrite configuration
|
|-- start.ps1                    One-command local launcher (backend + optional ngrok)
|-- package.json                 Root npm scripts for backend and frontend startup
|-- LICENSE                      GNU General Public License v3.0
`-- lifelink_ai.db               Local SQLite fallback database (auto-created)
```

---

## Getting Started — Full Local Setup

> Complete guide to clone, configure, and run all four parts:  
> **Backend API · Mobile App · Hospital Dashboard · Database**

---

### Prerequisites — Install These First

| Tool | Minimum Version | Download |
|---|---|---|
| **Python** | 3.12+ | https://www.python.org/downloads/ |
| **Node.js** | 20+ | https://nodejs.org/ |
| **Git** | any | https://git-scm.com/ |
| **Expo CLI** | latest | `npm install -g expo-cli` |
| **EAS CLI** | latest (for APK builds only) | `npm install -g eas-cli` |
| **Expo Go app** | latest | Install on your Android/iOS phone |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/premexe/GOne.git
cd GOne
```

---

### Step 2 — Database Setup (choose one)

#### Option A — SQLite (zero setup, local only ✅ recommended for dev)
Do nothing. The backend auto-creates `lifelink_ai.db` in the project root on first run.  
Skip `DATABASE_URL` in your `.env` — the backend falls back to SQLite automatically.

#### Option B — Supabase PostgreSQL (cloud, matches production)
1. Go to https://supabase.com → **New Project**
2. After creation → **Project Settings → Database → Connection Pooling**
3. Copy the **Pooler connection string** (port 6543, Transaction mode)
4. Paste it as `DATABASE_URL` in `backend/.env` (see Step 3)

---

### Step 3 — Configure the Backend Environment

```powershell
copy backend\.env.example backend\.env
```

Open `backend\.env` and fill in:

```env
# REQUIRED
JWT_SECRET_KEY=any-long-random-string-here   # e.g. openssl rand -hex 32

# OPTIONAL — leave blank to use SQLite
DATABASE_URL=postgresql://postgres.YOURPROJECT:PASS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# OPTIONAL — leave blank to use offline fallback AI
GEMINI_API_KEY=your_gemini_api_key_here      # https://aistudio.google.com/

# OPTIONAL — email handover reports
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_your_resend_api_key_here    # https://resend.com/

# KEEP FALSE for local dev
ENABLE_SOS_VOICE_CALLS=false
```

> **Minimum to run locally:** only `JWT_SECRET_KEY` is required. Everything else has a working fallback.

---

### Step 4 — Start the Backend

```powershell
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Run the server
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

**Verify:** Open http://localhost:8000/docs — Swagger UI should load.

> On first run with SQLite, the backend auto-seeds hospitals and sample data.

---

### Step 5 — Configure the Mobile App

Open `frontend\.env` (create it if missing):

```env
# For local dev with Expo Go on your phone:
# Expo auto-detects your machine's LAN IP — this value is a fallback only
EXPO_PUBLIC_API_URL=http://localhost:8000

# Agora (optional — only needed for in-app audio calls)
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

> **Important:** When scanning QR with Expo Go on a physical phone, replace `localhost` with your machine's **local IP** (e.g. `192.168.1.x`). Run `ipconfig` to find it.

---

### Step 6 — Start the Mobile App

```powershell
cd frontend
npm install
npx expo start
```

- Scan the QR code with **Expo Go** on your phone
- Or press `a` to open Android emulator, `i` for iOS simulator
- Press `w` to open in browser (limited features)

---

### Step 7 — Start the Hospital Dashboard

```powershell
cd hospital-dashboard
npm install
```

Create `hospital-dashboard\.env`:

```env
# Use 'mock' to run without backend (default, safe)
VITE_DATA_MODE=mock

# Switch to 'api' to connect to the real backend
# VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8000

VITE_OSRM_BASE_URL=https://router.project-osrm.org
```

```powershell
npm run dev
```

**Verify:** Open http://localhost:5173 — hospital operations dashboard loads.

> Set `VITE_DATA_MODE=api` only after the backend is running and seeded.

---

### Step 8 — (Optional) One-Command Startup

Instead of Steps 4–7 separately, use the startup script:

```powershell
# From the project root
.venv\Scripts\Activate.ps1
./start.ps1
```

This launches the backend on port 8000 and optionally tunnels it via ngrok for public HTTPS access (needed for Bland AI / webhook callbacks).

---

### Step 9 — (Optional) Build Android APK

```powershell
cd frontend
npx eas login           # login to your Expo account
npx eas build --platform android --profile preview
```

Download the `.apk` from: https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds

---

### All Services at a Glance

| Service | URL | Command |
|---|---|---|
| **Backend API** | http://localhost:8000 | `uvicorn app.main:app ...` |
| **Swagger Docs** | http://localhost:8000/docs | *(auto with backend)* |
| **ResQ Voice UI** | http://localhost:8000/resq/ | *(auto with backend)* |
| **Mobile App** | Expo Go / emulator | `npx expo start` |
| **Hospital Dashboard** | http://localhost:5173 | `npm run dev` in `hospital-dashboard/` |



---

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and fill in your values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL (falls back to SQLite if absent) |
| `JWT_SECRET_KEY` | HS256 signing secret |
| `GEMINI_API_KEY` | Google Gemini AI (primary LLM provider) |
| `AGORA_APP_ID` | Agora RTC in-app audio calling |
| `SMTP_HOST` / `SMTP_PASSWORD` | Resend SMTP email alerts |
| `BLAND_API_KEY` | Bland AI phone call bridge (optional legacy) |
| `ENABLE_SOS_VOICE_CALLS` | Set `true` to enable real phone calls |

Frontend: set `EXPO_PUBLIC_API_URL` in `frontend/.env` for local development.
EAS preview build: automatically injects `https://lifelink-backend-1tzq.onrender.com`.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| **Mobile App** | EAS Build | Root dir: `frontend/`, preview profile uses `EXPO_PUBLIC_API_URL` |
| **Backend** | Render | Root dir: `backend/`, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Hospital Dashboard** | Vercel / Render Static | Root dir: `hospital-dashboard/`, keep `VITE_DATA_MODE=mock` until live API tested |

> **Security:** Keep real values only in local `.env` files and Render/Vercel environment settings. Never commit secrets or place them in `EXPO_PUBLIC_*` values.

---

## Further Reading

- [FULL_SYSTEM_REPORT.md](FULL_SYSTEM_REPORT.md) â€” Detailed technical and feature documentation
- [REPORT_APP.md](REPORT_APP.md) â€” Mobile app code review and implementation status
- [REPORT_ADMIN_DASHBOARD.md](REPORT_ADMIN_DASHBOARD.md) â€” Hospital admin dashboard report
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) â€” Original architecture and planning document
- [backend/resq_service/README.md](backend/resq_service/README.md) â€” G-ONE ResQ standalone service
- [backend/resq_service/ARCHITECTURE.md](backend/resq_service/ARCHITECTURE.md) â€” ResQ full architecture
- [backend/.env.example](backend/.env.example) â€” Environment configuration template

---

## License

This project is licensed under the **GNU General Public License v3.0**.
See the [LICENSE](LICENSE) file for full terms.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

