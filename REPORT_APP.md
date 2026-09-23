# GOne — LifeLink AI · Mobile Application Report

> **Document Type:** Source-code status report  
> **Generated:** September 2026  
> **Project Name:** GOne / LifeLink AI  
> **App Package Name:** `lifelink-ai-plus`  
> **Version:** 1.0.0  
> **App Directory:** `frontend/`

---

## 1. Project overview

This repository contains a full-stack emergency health system built around a React Native / Expo mobile app, a FastAPI backend, and a Python AI triage module. The codebase is organized around a mobile-first emergency workflow, but the current implementation state is best described as a feature-rich prototype with partial live backend integration.

The app is designed for:

- emergency wallet and QR-based medical identity
- SOS event creation and tracking
- hospital discovery and ranking
- medical record handling
- readiness scoring
- AI-assisted emergency context processing
- admin dashboard flows

The actual implementation in this workspace includes real UI screens, state stores, API-layer stubs, and backend routers, but several flows still rely on mock or in-memory logic rather than fully production-grade live data wiring.

---

## 2. Current architecture

```text
GOne / LifeLink AI
├── frontend/                  # Expo + React Native mobile app
│   ├── app/                  # File-based routes and screen entry points
│   ├── src/                  # State, services, constants, UI components
│   └── assets/               # App assets
├── backend/                  # FastAPI application
│   ├── app/                  # Models, routers, services, database layer
│   ├── uploads/              # Medical file storage
│   ├── .env.example          # Backend config template
│   └── lifelink_ai.db        # SQLite fallback database
├── backend/gone_ai_module/   # AI triage/analysis module
├── IMPLEMENTATION_PLAN.md    # Product and implementation planning
├── REPORT_APP.md             # This app/report document
├── REPORT_ADMIN_DASHBOARD.md # Admin dashboard report
├── start.ps1                 # Local launch helper
├── package.json              # Root automation scripts
└── README.md                 # Project overview
```

---

## 3. Technology stack

| Layer | Technology | Notes from this workspace |
|---|---|---|
| App framework | Expo | Used in [frontend/package.json](frontend/package.json) |
| Mobile runtime | React Native | Version 0.86.3 |
| Language | TypeScript | App code is TypeScript-based |
| Routing | Expo Router | File-based app routing in [frontend/app](frontend/app) |
| State | Zustand | Used in [frontend/src/store](frontend/src/store) |
| API wrapper | custom `fetch` layer | Implemented in [frontend/src/services/http.ts](frontend/src/services/http.ts) |
| Auth storage | AsyncStorage + SecureStore | Used in auth/profile flows |
| Voice | Agora + speech recognition | Implemented in [frontend/src/services](frontend/src/services) |
| QR | react-native-qrcode-svg | Used in wallet screen |
| Location | expo-location | Present in app code |
| Documents | expo-document-picker, expo-image-picker | Used for medical records flow |
| Security | biometrics + secure storage | Present in [frontend/src/store/useAuthStore.ts](frontend/src/store/useAuthStore.ts) |
| Backend | FastAPI | Entry in [backend/app/main.py](backend/app/main.py) |
| DB | SQLAlchemy + SQLite fallback | Configured in backend database layer |
| AI layer | Python module | Located in [backend/gone_ai_module](backend/gone_ai_module) |

---

## 4. Frontend structure

The app files show a real mobile app shell with screens for the core user journey:

- [frontend/app/index.tsx](frontend/app/index.tsx) — redirect logic
- [frontend/app/_layout.tsx](frontend/app/_layout.tsx) — root layout and session hydration
- [frontend/app/(auth)/login.tsx](frontend/app/(auth)/login.tsx) — login/register and biometrics flow
- [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx) — home dashboard summary cards
- [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx) — user profile and voice assistant flow
- [frontend/app/(tabs)/wallet.tsx](frontend/app/(tabs)/wallet.tsx) — offline emergency wallet and instructions
- [frontend/app/sos/emergency.tsx](frontend/app/sos/emergency.tsx) — SOS trigger flow
- [frontend/app/sos/provide-info.tsx](frontend/app/sos/provide-info.tsx) — symptom entry
- [frontend/app/sos/track.tsx](frontend/app/sos/track.tsx) — tracking / dispatch status page

The app includes both app-level navigation and route-based screens. This confirms the project is not a mock-only shell; it is a functioning mobile UX scaffold with a defined emergency workflow.

---

## 5. Actual app behavior observed in code

### Authentication
The auth flow in [frontend/src/store/useAuthStore.ts](frontend/src/store/useAuthStore.ts) includes:

- login and registration
- biometric unlock support
- token session restore
- logout handling

The app also stores a biometric login record using `expo-secure-store` on native devices, and falls back to web-safe behavior when not supported.

### Home dashboard
The home screen in [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx) presents summary cards for:

- readiness score
- medical records
- nearby hospitals
- emergency wallet

This is implemented as a dashboard and is not just static placeholder text.

### Profile and emergency wallet
Both the profile and wallet screens are implemented and wired to Zustand stores.

- [frontend/src/store/useProfileStore.ts](frontend/src/store/useProfileStore.ts) loads cached wallet data and refreshes readiness.
- [frontend/src/store/useAuthStore.ts](frontend/src/store/useAuthStore.ts) performs session management.
- [frontend/app/(tabs)/wallet.tsx](frontend/app/(tabs)/wallet.tsx) shows the emergency wallet card and QR guidance.

### SOS flow
The app includes a dedicated SOS flow with emergency confirmation, symptom input, and tracking screens. The code is present and structured, but the project still uses a mix of real UI logic and mock/mock-like API state handling.

---

## 6. State and data-layer reality

The frontend uses various Zustand stores for app state:

- [frontend/src/store/useAuthStore.ts](frontend/src/store/useAuthStore.ts)
- [frontend/src/store/useProfileStore.ts](frontend/src/store/useProfileStore.ts)
- [frontend/src/store/useEmergencyStore.ts](frontend/src/store/useEmergencyStore.ts)
- [frontend/src/store/useHospitalStore.ts](frontend/src/store/useHospitalStore.ts)
- [frontend/src/store/useRecordStore.ts](frontend/src/store/useRecordStore.ts)

These stores are real and active. However, the service layer shows a hybrid pattern: there are real HTTP utilities and backend-facing methods, but a large portion of the app still behaves like a mock-driven app (seed data, in-memory state, and fallback logic are clearly present).

This means the codebase is closer to a realistic MVP than a fully production-integrated system.

---

## 7. API layer and backend integration

The frontend service layer is in [frontend/src/services](frontend/src/services):

- [frontend/src/services/http.ts](frontend/src/services/http.ts) — request wrapper with token injection
- [frontend/src/services/api.ts](frontend/src/services/api.ts) — API methods for auth, profile, records, hospitals, SOS, and admin flows
- [frontend/src/services/aiService.ts](frontend/src/services/aiService.ts) — local readiness and symptom logic
- [frontend/src/services/recommendationEngine.ts](frontend/src/services/recommendationEngine.ts) — hospital ranking logic
- [frontend/src/services/mockData.ts](frontend/src/services/mockData.ts) — seeded demo data

The backend entrypoint is [backend/app/main.py](backend/app/main.py), which wires routers for users, emergency wallets, SOS, contacts, responses, notifications, medical records, hospitals, doctors, ambulances, and voice.

This confirms the backend architecture is intended to support the app, but full end-to-end production wiring is not yet fully validated across all flows.

---

## 8. Backend implementation status

The backend is a real FastAPI application with a structured API, including:

- user operations
- wallet management
- SOS handling
- emergency response workflow
- notifications
- hospitals
- medical records
- voice endpoints

The entry file [backend/app/main.py](backend/app/main.py) shows a live app startup and router registration, and the backend database layer includes SQLite fallback and schema migration logic.

The project is therefore beyond a mock-only idea; it already includes a real backend foundation.

---

## 9. AI module status

The AI module exists under [backend/gone_ai_module](backend/gone_ai_module) and is documented in its own README. It is described as a tri-tier emergency intelligence layer:

- Tier 1: Gemini (optional)
- Tier 2: local Ollama fallback
- Tier 3: deterministic regex-based fallback

This is a meaningful implementation, but the module documentation itself notes known issues and a non-final production status for one fallback classifier edge case. That should be treated as an implementation reality, not as a fully production-hardened AI layer.

---

## 10. Real-time voice and admin features

The project includes code for:

- Agora-based voice flow in [frontend/src/services/agora.native.ts](frontend/src/services/agora.native.ts)
- speech recognition in [frontend/src/services/speechRecognition.ts](frontend/src/services/speechRecognition.ts)
- emergency admin workflow and dashboard screens in [frontend/app/admin](frontend/app/admin)

These flows are implemented in the codebase, but they are still part of an active MVP structure rather than a fully deployed production system.

---

## 11. Important project reality check

The status of the application is best summarized as:

- functional UI and structure are present
- backend routes and services are present
- AI component exists and is integrated in design
- some screens and services are backed by demo/mock data
- some flows are still partially connected or simulated
- production readiness requires backend validation, environment configuration, API hardening, and end-to-end data integration cleanup

This is a strong prototype / MVP foundation, not a final production-ready emergency platform.

---

## 12. Conclusion

The GOne / LifeLink AI mobile app is a real, multi-layer emergency response project with concrete implementation across the mobile app, backend API, and AI module. The app demonstrates a credible emergency health product direction and contains substantial code for key workflows.

However, the codebase currently reflects an active development stage: many flows are implemented with realistic UI and logic, but some parts still depend on seed data, local mock logic, or incomplete backend integration. In other words, the project is feature-rich and well structured, but not yet fully production-hardened across the full emergency pipeline.

*This report reflects the current source code state of the GOne / LifeLink AI project as reviewed in September 2026.*
