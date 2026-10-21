# G-ONE

G-ONE is a full-stack emergency health companion built for the Indian context. It combines a React Native / Expo mobile app, a FastAPI backend, an independent hospital dashboard, and the G-ONE ResQ voice-triage service.

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
|-- FULL_SYSTEM_REPORT.md        Comprehensive technical and feature report
|-- REPORT_APP.md                Mobile app detailed code review
|-- REPORT_ADMIN_DASHBOARD.md    Hospital admin dashboard detailed report
|-- IMPLEMENTATION_PLAN.md       Original implementation plan and architecture decisions
`-- lifelink_ai.db               Local SQLite fallback database (auto-created)
```

## Deployment Boundaries

- **Mobile app:** `frontend/` is built with EAS. Its preview profile uses `EXPO_PUBLIC_API_URL` from `frontend/eas.json`.
- **Backend:** Render must use root directory `backend`, build command `pip install -r requirements.txt`, and start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Hospital dashboard:** `hospital-dashboard/` is separate from the mobile app. It remains in `VITE_DATA_MODE=mock` until its live API contract is explicitly tested. Deploy it independently as a static site (Vercel or Render Static Site).
- **Secrets:** keep real values only in local service `.env` files and Render/Vercel environment settings. Never commit them or place them in `EXPO_PUBLIC_*` values.

---

## Architecture Overview

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
|  ResQ WebSocket voice session                          |
|  Resend email handover (when configured)              |
+------+----------------------------+------------------+
       |                            |
       v                            v
PostgreSQL (Supabase)         SQLite auto-fallback
                              (lifelink_ai.db)
```

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
| **Readiness Score** | 0-100% preparedness score based on profile completeness |
| **Biometric Login** | Fingerprint / Face ID via expo-local-authentication |

### Hospital Admin Dashboard (/admin)

| Feature | Description |
|---|---|
| **Live SOS Queue** | 3-second auto-polling of all active emergencies |
| **Accept / Reject** | One-touch triage with clinical rejection reason |
| **Dispatch Progression** | Move case through 5 defined lifecycle stages |
| **Resource Tracking** | Live bed counts: General, ICU, Oxygen-supported |

### G-ONE ResQ AI Voice Companion

- **9 Emergency Protocol Categories:** Cardiac, Stroke, Breathing, Choking, Bleeding, Burns, Trauma, Neurological, General
- **Multi-tier Provider Strategy:** Google Gemini 2.5 Flash -> Groq -> Deterministic offline fallback (never crashes)
- **Structured Handover:** Auto-generates clinical handover report + dispatches email to emergency contacts
- **WebSocket Interface:** Real-time bidirectional voice conversation at ws://<host>/ws/emergency

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Expo Go (iOS/Android) or Android device for APK

### 1. Start the Backend
```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```
Swagger docs available at http://localhost:8000/docs

### 2. Start the Frontend (Expo Go)
```powershell
cd frontend
npm install
npx expo start
```

### 3. Use the Startup Script (recommended)
```powershell
./start.ps1
```
Starts the backend on port 8000 and optionally sets up a public ngrok tunnel.

### 4. Build Standalone Android APK via EAS Cloud
```powershell
cd frontend
npx eas-cli build --platform android --profile preview
```
Download from: https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds

---

## Authentication and Database

G-ONE currently uses its FastAPI user service for registration, password
verification, and JWT sessions. Supabase provides the hosted PostgreSQL
database through `DATABASE_URL`; Supabase Auth is not part of the active login
flow. Do not create or document shared production credentials.

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

## Access and Accounts

Create patient accounts through the in-app registration flow. Production
documentation never contains personal emails, passwords, or shared demo
accounts. Hospital-dashboard access must be provisioned separately for each
authorized hospital user.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile Framework | Expo SDK 57 (Managed Workflow) |
| Runtime | React Native 0.86.3 (Fabric / Hermes) |
| Language | TypeScript (strict) |
| Routing | Expo Router (file-based) |
| State | Zustand |
| Speech STT | expo-speech-recognition |
| Speech TTS | expo-speech |
| QR Code | react-native-qrcode-svg |
| Backend | FastAPI + Uvicorn / Gunicorn |
| ORM | SQLAlchemy 2 |
| Database | PostgreSQL (Supabase) with SQLite auto-fallback |
| AI Provider | Google Gemini 2.5 Flash (google-genai) |
| Email | Resend SMTP |
| Cloud Hosting | Render (lifelink-backend-1tzq.onrender.com) |
| App Distribution | Expo Application Services (EAS) |

---

## Further Reading

- [FULL_SYSTEM_REPORT.md](FULL_SYSTEM_REPORT.md) - Detailed technical and feature documentation
- [REPORT_APP.md](REPORT_APP.md) - Mobile app code review and implementation status
- [REPORT_ADMIN_DASHBOARD.md](REPORT_ADMIN_DASHBOARD.md) - Hospital admin dashboard report
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - Original architecture and planning document
- [backend/resq_service/README.md](backend/resq_service/README.md) - G-ONE ResQ standalone service
- [backend/resq_service/ARCHITECTURE.md](backend/resq_service/ARCHITECTURE.md) - ResQ full architecture
- [backend/.env.example](backend/.env.example) - Environment configuration template
