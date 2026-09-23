# GOne — LifeLink AI · Mobile Application Report

> **Document Type:** Technical & Feature Report  
> **Generated:** September 2026  
> **Project Name:** GOne / LifeLink AI  
> **App Package Name:** `lifelink-ai-plus`  
> **Version:** 1.0.0  
> **App Directory:** `frontend/`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Project Structure](#4-frontend-project-structure)
5. [Screens & User Flows](#5-screens--user-flows)
6. [State Management](#6-state-management)
7. [API Integration & Services](#7-api-integration--services)
8. [G-ONE AI Features](#8-g-one-ai-features)
9. [Real-Time Voice Calling (Agora)](#9-real-time-voice-calling-agora)
10. [Emergency SOS Workflow](#10-emergency-sos-workflow)
11. [Emergency Wallet & QR](#11-emergency-wallet--qr)
12. [Medical Records & OCR](#12-medical-records--ocr)
13. [Hospital Discovery](#13-hospital-discovery)
14. [Notifications System](#14-notifications-system)
15. [Readiness Score Engine](#15-readiness-score-engine)
16. [Authentication & Security](#16-authentication--security)
17. [Backend Connection](#17-backend-connection)
18. [Admin Dashboard Connection](#18-admin-dashboard-connection)
19. [Environment Configuration](#19-environment-configuration)
20. [Key Dependencies](#20-key-dependencies)

---

## 1. Project Overview

**GOne (LifeLink AI)** is a cross-platform mobile emergency-health companion built with Expo / React Native. It is designed to assist individuals in medical emergencies by:

- Maintaining an **offline-readable Emergency Wallet** with critical medical data (blood group, allergies, medications, conditions, emergency contacts) that works even without internet.
- Storing and summarizing **medical records** using OCR-powered AI.
- Discovering and ranking **nearby hospitals** by distance, specialty, and real-time bed availability.
- Triggering a fully orchestrated **SOS emergency workflow** with GPS location sharing, AI triage, AI voice call via Bland AI, and email alerts to emergency contacts.
- Tracking the **live status** of a dispatched ambulance and assigned doctor.
- Presenting a **Readiness Score** that gamifies health preparedness.
- Providing a curated **Safety Feed / Learning module** with first-aid and preparedness tips.

The app targets Android and iOS (built with Expo SDK 57) and can also be exported as a web app.

---

## 2. Architecture Diagram

```
+---------------------------------------------------------------+
|              LifeLink AI Mobile App (Expo / RN)               |
|                                                               |
|  +----------+ +----------+ +------------+ +--------------+   |
|  |  Auth    | |  Profile | |   SOS /    | |  Hospitals   |   |
|  |  Screen  | |  Screen  | |  Emergency | |  Discovery   |   |
|  +----------+ +----------+ +------------+ +--------------+   |
|  +----------+ +----------+ +------------+ +--------------+   |
|  | Medical  | |Emergency | | Readiness  | | Safety Feed  |   |
|  | Records  | |  Wallet  | |   Score    | | (Learn)      |   |
|  +----------+ +----------+ +------------+ +--------------+   |
|                                                               |
|  Zustand Stores: Auth | Profile | Hospital | Records | SOS   |
|  Services:  api.ts | aiService | agora | speechRecognition   |
|                                                               |
+---------------------------+-----------------------------------+
                            | HTTPS REST API (JWT Bearer)
                            v
+---------------------------------------------------------------+
|        FastAPI Backend  (backend/)  Port 8000                 |
|  PostgreSQL via Supabase  OCR (Tesseract)  G-ONE AI Module    |
|  Agora RTC Token Generator  Bland AI Voice  Resend Email      |
+---------------------------------------------------------------+
```

---

## 3. Technology Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Framework** | Expo | ^57.0.0 |
| **Language** | TypeScript | ~5.9.2 |
| **UI Framework** | React Native | 0.86.3 |
| **Router** | Expo Router (file-based) | ~57.0.22 |
| **State Management** | Zustand | ^4.5.2 |
| **HTTP Client** | Custom http.ts wrapper | fetch-based with auth injection |
| **Auth Storage** | expo-secure-store + AsyncStorage | JWT token persisted across sessions |
| **Voice Calling** | Agora RTC (react-native-agora) | ^4.6.4 |
| **QR Code** | react-native-qrcode-svg | ^6.3.12 |
| **Animations** | react-native-reanimated | 4.5.1 |
| **Gestures** | react-native-gesture-handler | ~2.32.0 |
| **Icons** | lucide-react-native | ^1.33.0 |
| **Location** | expo-location | ~57.0.19 |
| **Camera / Docs** | expo-image-picker, expo-document-picker | ~57.0.x |
| **Haptics** | expo-haptics | ~57.0.3 |
| **Biometrics** | expo-local-authentication | ~57.0.3 |
| **Speech Recognition** | expo-speech-recognition | ^57.0.0 |
| **SVG** | react-native-svg | 15.15.4 |
| **Web View** | react-native-webview | 13.16.1 |

---

## 4. Frontend Project Structure

```
frontend/
├── app/                          # Expo Router file-system routing
│   ├── _layout.tsx               # Root layout (auth gate + navigation shell)
│   ├── index.tsx                 # App entry redirect
│   ├── (auth)/
│   │   └── login.tsx             # Login / Registration screen
│   ├── (tabs)/                   # Bottom tab navigation
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home / Dashboard (Summary cards)
│   │   ├── hospitals.tsx         # Hospital discovery & ranking
│   │   ├── profile.tsx           # User profile, wallet editor, Agora voice
│   │   └── wallet.tsx            # Emergency Wallet + QR code view
│   ├── admin/
│   │   └── index.tsx             # Hospital Admin Dashboard
│   ├── hospitals/                # Hospital detail routes
│   ├── learn/                    # Safety Feed / Education module
│   ├── notifications/            # Notifications list
│   ├── readiness/                # Readiness score detail
│   ├── records/                  # Medical records CRUD
│   └── sos/
│       ├── emergency.tsx         # SOS trigger + confirmation
│       ├── provide-info.tsx      # Symptom input before SOS
│       └── track.tsx             # Live tracking + dispatch timeline
│
├── src/
│   ├── components/               # Shared components (SummaryCard, StatusBadge, etc.)
│   ├── constants/
│   │   └── theme.ts              # Design system: COLORS, TYPOGRAPHY, SPACING
│   ├── services/
│   │   ├── api.ts                # Unified API client (750+ lines)
│   │   ├── http.ts               # Base HTTP fetch wrapper with auth header injection
│   │   ├── aiService.ts          # Local AI helpers (triage, readiness scoring)
│   │   ├── agora.native.ts       # Agora RTC native implementation
│   │   ├── agora.web.ts          # Agora stub for web builds
│   │   ├── speechRecognition.ts  # Cross-platform speech recognition
│   │   ├── recommendationEngine.ts  # Hospital ranking algorithm
│   │   └── mockData.ts           # In-memory seed data (offline fallback)
│   ├── store/
│   │   ├── useAuthStore.ts       # Authentication & session state
│   │   ├── useEmergencyStore.ts  # Active SOS request state + polling
│   │   ├── useHospitalStore.ts   # Hospital list, search, filter state
│   │   ├── useProfileStore.ts    # User profile + readiness score
│   │   └── useRecordStore.ts     # Medical records list state
│   └── types/                    # TypeScript type definitions
│
├── assets/                       # Static assets (icons, splash, profile photo)
├── .env                          # Environment variables (EXPO_PUBLIC_*)
├── app.json                      # Expo app configuration
├── eas.json                      # EAS Build configuration
├── package.json
└── tsconfig.json
```

---

## 5. Screens & User Flows

### 5.1 Authentication — `(auth)/login.tsx`

- **Login** form with email and password fields.
- **Registration** form with name, email, phone, and password.
- On successful login, a **JWT access token** is persisted to `AsyncStorage`.
- Session restoration on app launch via `restoreSession()` in `api.ts`.

### 5.2 Home Dashboard — `(tabs)/index.tsx`

The central hub displaying four interactive `SummaryCard` components:

| Card | Data Source | Action |
|---|---|---|
| **Readiness Score** | `useProfileStore` | Navigate to `/readiness` |
| **Medical Records** | `useRecordStore` | Navigate to `/records` |
| **Nearby Hospitals** | `useHospitalStore` | Navigate to `/(tabs)/hospitals` |
| **Emergency Wallet** | `useProfileStore` | Navigate to `/(tabs)/wallet` |

- Time-based greeting (Good morning / afternoon / evening).
- Notification bell badge linking to `/notifications`.
- Quick link to Safety Feed (`/learn`).

### 5.3 Hospitals Tab — `(tabs)/hospitals.tsx`

- Fetches the hospital list from the backend (`GET /hospitals`).
- **Search bar** filters hospitals by name or specialty in real time.
- **Specialty filter pills:** cardiac, trauma, ICU, general, pediatrics.
- **View toggle:** List view vs. Map view.
- Each hospital card shows: name, address, specialty badges, bed availability (General / ICU / Emergency), distance, ETA, rating.

### 5.4 Profile Screen — `(tabs)/profile.tsx`

- Displays and edits: Full Name, Blood Group, Date of Birth, Phone Number.
- **Allergies** and **Medications** management with add/remove tags.
- **Emergency Contacts** management: Add contact via modal; delete contacts.
- **Agora In-App Voice Call:** Launches AI-assisted emergency voice check-in via Agora RTC SDK. Questions are spoken via TTS, responses captured via Speech Recognition, transcript posted to `/voice/agora-finish`.
- **Logout** button clears token and resets all stores.

### 5.5 Emergency Wallet — `(tabs)/wallet.tsx`

- Displays fully offline-readable card with:
  - Blood group, allergies, medications, chronic conditions.
  - Emergency contacts list.
  - Emergency notes.
- **QR Code** generation encoding entire wallet payload as JSON — scannable by first responders without internet.
- Profile completeness status indicator.

### 5.6 SOS Emergency Flow

#### Step 1: `sos/emergency.tsx` — SOS Trigger
- Large, prominent SOS trigger button with haptic feedback.
- Requests and captures GPS location via `expo-location`.
- Confirms emergency with user consent before dispatching.
- Falls back to `/emergency/trigger` orchestration endpoint if direct `POST /sos/` fails.

#### Step 2: `sos/provide-info.tsx` — Symptom Input
- Free-text and guided symptom entry before or during SOS.
- Passes symptoms and description to the SOS creation payload.

#### Step 3: `sos/track.tsx` — Live Tracking
- Polls the backend for the active SOS status every few seconds.
- Shows a **live dispatch timeline stepper:**
  1. SOS Broadcast Received
  2. Hospital Admission Accepted
  3. Patient Picked Up by Ambulance
  4. Arrived at Hospital Emergency Bay
  5. Case Completed & Patient Admitted
- Displays assigned hospital name, ambulance vehicle number, driver name & phone, assigned doctor details.
- Location updates via `PATCH /sos/:id/location` sent automatically.
- Option to resolve/cancel SOS from the user side.

### 5.7 Medical Records — `records/`

- Lists all uploaded documents.
- Upload via file picker (`expo-document-picker`) or image picker (`expo-image-picker`).
- AI Summary Panel: on-device AI overview of the document with extracted allergies, medications, conditions, key findings from OCR.

### 5.8 Readiness Score — `readiness/`

- Numeric readiness percentage (0–100%).
- Lists missing profile fields actionably.
- Sparkline history chart.
- Quick-action links to complete missing sections.

### 5.9 Safety Feed — `learn/`

- Curated health and safety tips, first aid, CPR basics, emergency preparedness articles.

### 5.10 Notifications — `notifications/`

- Fetches all notifications from `GET /notifications/`.
- Displays message, channel (SMS/PUSH), timestamp.
- Marks notifications as READ via `PUT /notifications/:id`.

---

## 6. State Management

All global state is managed via **Zustand** stores — no Context Provider needed.

### `useAuthStore.ts`
| State/Action | Description |
|---|---|
| `user: User | null` | Currently logged-in user |
| `isAuthenticated: boolean` | Auth gate flag |
| `login(email, password)` | Calls backend, stores token |
| `register(name, email, phone, password)` | Registers then auto-logs in |
| `logout()` | Clears token + state |
| `restoreSession()` | Checks saved token on launch |
| `updateUser(partial)` | Syncs profile changes |

### `useProfileStore.ts`
| State/Action | Description |
|---|---|
| `profile: EmergencyProfile | null` | Wallet data |
| `readinessScore: ReadinessScore | null` | Computed readiness |
| `fetchProfileAndReadiness()` | Loads wallet + score |
| `updateProfile(partial)` | Updates wallet |
| `addEmergencyContact(...)` | Adds contact |
| `removeEmergencyContact(id)` | Removes contact |

### `useEmergencyStore.ts`
| State/Action | Description |
|---|---|
| `activeRequest: EmergencyRequest | null` | Current SOS |
| `isLoading: boolean` | Loading flag |
| `createEmergencyRequest(...)` | Sends SOS |
| `pollActiveRequest()` | Polls live status |
| `resolveRequest(sosId)` | Ends SOS |
| `updateLocation(sosId, lat, lng)` | Sends GPS update |

### `useHospitalStore.ts`
| State/Action | Description |
|---|---|
| `hospitals: Hospital[]` | Ranked hospital list |
| `searchQuery: string` | Filter text |
| `viewMode: 'list'|'map'` | Toggle |
| `fetchHospitals()` | Loads from backend |

### `useRecordStore.ts`
| State/Action | Description |
|---|---|
| `documents: MedicalDocument[]` | Records list |
| `fetchDocuments()` | Loads from backend |
| `uploadDocument(...)` | Uploads file |
| `getDocumentSummary(id)` | AI summary |

---

## 7. API Integration & Services

### `src/services/http.ts`
- Wraps `fetch` with automatic `Authorization: Bearer <token>` header injection.
- Base URL from `EXPO_PUBLIC_API_URL` or auto-detected Expo LAN IP.
- Handles 401 responses by triggering logout.

### `src/services/api.ts` (750+ lines)

| Category | Methods |
|---|---|
| **Auth** | `login`, `register`, `restoreSession`, `logout`, `getMe`, `updateMe` |
| **Profile / Wallet** | `getEmergencyProfile`, `updateEmergencyProfile` |
| **Emergency Contacts** | `createEmergencyContact`, `deleteEmergencyContact` |
| **Documents** | `getDocuments`, `uploadDocument`, `getDocumentSummary` |
| **Hospitals** | `getNearbyHospitals`, `getHospitalById` |
| **SOS** | `createEmergencyRequest`, `getActiveEmergencyRequest`, `updateEmergencyLocation`, `resolveEmergencyRequest`, `getMyCompletedEmergencyRequests` |
| **Admin SOS** | `getAdminSOSAlerts`, `getCompletedSOSAlerts`, `acceptSOSAlert`, `rejectSOSAlert`, `updateSOSDispatchStatus` |
| **Notifications** | `getNotifications`, `markNotificationRead` |
| **Readiness** | `getReadinessScore` |

### `src/services/aiService.ts`
- `calculateReadinessScore(profile, docCount)` — rule-based.
- `classifySymptomUrgency(symptoms)` — maps to tiers (critical/high/moderate/low) + required specialties.
- `summarizeMedicalDocument(title, type)` — on-device summary.

### `src/services/recommendationEngine.ts`
- `rankHospitalsForEmergency(hospitals, lat, lng, specialty?, urgency?)` — multi-factor scored ranking with auto-generated recommendation reason.

---

## 8. G-ONE AI Features

| Feature | Description |
|---|---|
| **AI Triage** | On SOS creation, backend runs G-ONE AI pipeline using emergency description + patient wallet + medical records |
| **Tier 1: Gemini** | Google `google-genai` — primary model. Produces emergency understanding, severity, required capability, full report |
| **Tier 2: Ollama** | Local LLM fallback |
| **Tier 3: Deterministic Rules** | Keyword-based rules — always succeeds |
| **Severity Levels** | CRITICAL / HIGH / MODERATE / LOW / UNKNOWN |
| **AI Health Summary** | Structured patient context sent to accepting hospital |
| **AI Emergency Report** | Full formatted incident report stored in SOS record |
| **On-Device AI** | `aiService.ts` provides local triage + readiness scoring offline |

---

## 9. Real-Time Voice Calling (Agora)

### Implementation
- **Native:** `src/services/agora.native.ts` — `react-native-agora` SDK.
- **Web:** `src/services/agora.web.ts` — stub.

### Flow
1. User on Profile screen with active SOS → taps "Emergency Voice Check-In"
2. App fetches Agora RTC token from `POST /voice/agora-token`
3. Joins emergency Agora channel
4. TTS speaks AI-generated triage questions
5. `expo-speech-recognition` captures spoken answers
6. Transcript assembled → posted to `POST /voice/agora-finish`
7. Backend persists transcript to SOS record → triggers email alert to emergency contacts

### Environment Variables (Backend)
| Variable | Purpose |
|---|---|
| `AGORA_APP_ID` | Agora Console App ID |
| `AGORA_APP_CERTIFICATE` | Token signing certificate |
| `AGORA_SECONDARY_CERTIFICATE` | Rotation key |
| `AGORA_TOKEN_TTL` | 3600 seconds |

---

## 10. Emergency SOS Workflow

```
Patient triggers SOS
       |
       v
POST /sos/  (lat, lng, description, patient_name)
       |
       +---> G-ONE AI Triage (async, backend)
       |     - Gemini / Ollama / Rules triage
       |     - Severity classification
       |     - Required capability matching
       |
       +---> Bland AI Voice Call (async thread, backend)
       |     - Calls patient phone number
       |     - Real-time AI conversation
       |     - Records transcript + findings
       |     - Triggers Resend email to emergency contacts
       |
       +---> Hospital Triage Board (Admin Dashboard)
             - SOS appears in ACTIVE QUEUE
             - Hospital accepts or rejects
             - Ambulance assigned (EN_ROUTE)
             - Doctor assigned
             - Dispatch milestones updated

App polls GET /sos/my-active every 3s
       |
       +--> track.tsx shows live milestones & assigned resources
```

---

## 11. Emergency Wallet & QR

### Data Model
```typescript
interface EmergencyProfile {
  bloodGroup: string           // "O+"
  allergies: string[]          // ["Penicillin", "Pollen"]
  medications: string[]        // ["Metformin 500mg"]
  conditions: string[]         // ["Type 2 Diabetes"]
  emergencyNotes: string
  organDonor: boolean
  emergencyContacts: EmergencyContact[]
}
```

### QR Code
- Encodes entire EmergencyProfile as JSON.
- Generated entirely on-device — no server round-trip.
- Works fully **offline** for first-responder scanning.
- Rendered with `react-native-qrcode-svg`.

### Persistence
- Wallet fetched from `GET /wallet/:userId`, updated via `PUT /wallet/:userId`.
- Contacts managed via `/emergency-contacts/` CRUD.

---

## 12. Medical Records & OCR

### Upload Flow
1. File selected via `expo-document-picker` or `expo-image-picker`
2. `FormData` posted to `POST /medical-records/upload`
3. Backend stores file in `backend/uploads/medical_records/`
4. App fires `POST /medical-records/record/:id/process-ocr` in background
5. OCR via **Tesseract** (`pytesseract`) + **Pillow** + **pdf2image** + **Poppler**
6. Extracted text stored in `medical_records.ocr_text`

### Record Types
`report` | `prescription` | `scan` | `other`

---

## 13. Hospital Discovery

### Ranking Algorithm

Each hospital is scored as: `distance + specialty + beds + ICU + rating`

| Factor | Source |
|---|---|
| Distance (km, inverse) | User GPS vs. hospital lat/lng |
| Specialty match | Query specialty vs. hospital specialties array |
| Available beds | `availableBeds / bedCapacity` ratio |
| ICU availability | `icuBeds.available` |
| Rating | Hospital rating field |

### Data
- Fetched from `GET /hospitals` including: general beds, ICU beds, oxygen/emergency beds with occupancy.
- 4 demo hospitals pre-seeded: CityCare, Metro General, Lifeline Medical Centre, Harbourview Emergency Hospital.

---

## 14. Notifications System

| Aspect | Detail |
|---|---|
| **Source** | `GET /notifications/` |
| **Channels** | SMS, PUSH |
| **Recipient Types** | EMERGENCY_CONTACT, HOSPITAL |
| **Status Flow** | PENDING → SENT → DELIVERED (or FAILED) |
| **Mark Read** | `PUT /notifications/:id` |
| **UI** | Bell icon with red badge dot on Home screen |

---

## 15. Readiness Score Engine

### Scoring Logic
```
+15  blood group set
+15  at least one emergency contact
+20  at least one medical document uploaded
+15  allergies documented
+15  medications documented
+10  conditions documented
+5   emergency notes filled
+5   organ donor preference set
───
100  Maximum score
```

The `ReadinessScore` object includes a `missingFields` array for actionable display.

---

## 16. Authentication & Security

| Aspect | Implementation |
|---|---|
| **Token Storage** | JWT in `AsyncStorage` — key: `lifelink_access_token` |
| **Token Injection** | `Authorization: Bearer <token>` header in all API calls |
| **Session Restore** | `restoreSession()` on launch: reads token → validates via `GET /users/:id` |
| **Token Expiry** | 30 minutes (configurable: `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) |
| **401 Handling** | Auto logout + token deletion |
| **Biometrics** | `expo-local-authentication` for Face ID / Fingerprint re-auth |
| **Secure Store** | `expo-secure-store` for higher-security storage |
| **Algorithm** | HS256 JWT via `python-jose` on backend |

---

## 17. Backend Connection

### Base URL Resolution (`src/services/http.ts`)
```
EXPO_PUBLIC_API_URL  (from .env, used in production/web)
OR
http://<LAN-IP>:8000  (auto-detected from Expo hostUri for Expo Go on device)
```

### Full API Endpoint Map

| Endpoint | Method | Purpose |
|---|---|---|
| `/users/login` | POST | Authenticate user |
| `/users/` | POST | Register new user |
| `/users/:id` | GET / PUT | Fetch / update profile |
| `/wallet/:userId` | GET / PUT | Emergency wallet |
| `/emergency-contacts/` | GET / POST | List / add contacts |
| `/emergency-contacts/:id` | DELETE | Remove contact |
| `/medical-records/:userId` | GET | Fetch records |
| `/medical-records/upload` | POST | Upload document |
| `/medical-records/record/:id/process-ocr` | POST | Trigger OCR |
| `/hospitals` | GET | List all hospitals |
| `/sos/` | POST | Create SOS alert |
| `/sos/my-active` | GET | Poll active SOS |
| `/sos/my-completed` | GET | Completed SOS history |
| `/sos/:id/location` | PATCH | Update GPS |
| `/sos/:id/resolve` | PUT | Patient-side resolve |
| `/sos/:id/accept` | POST | Hospital accept (admin) |
| `/sos/:id/reject` | POST | Hospital reject (admin) |
| `/sos/:id/status` | PATCH | Update dispatch status (admin) |
| `/notifications/` | GET | Fetch notifications |
| `/notifications/:id` | PUT | Mark as read |
| `/voice/agora-token` | POST | Get Agora RTC token |
| `/voice/agora-finish` | POST | Submit voice transcript |
| `/emergency/trigger` | POST | Fallback SOS orchestration |

---

## 18. Admin Dashboard Connection

The Admin Dashboard (`app/admin/index.tsx`) is bundled **inside the same mobile app** at route `/admin`.

- Uses the same `api.ts` service layer.
- Hospital admins authenticate with credentials from the `hospitals` table (separate from `users`).
- Dashboard polls `GET /sos/?hospital_id=<id>` every **3 seconds** for live SOS alerts.
- Hospital ID configurable via in-dashboard input field.

**Full Admin Dashboard documentation: `REPORT_ADMIN_DASHBOARD.md`**

---

## 19. Environment Configuration

### `frontend/.env`
```env
# Backend API URL (auto-detected in Expo Go; fallback for production/web)
EXPO_PUBLIC_API_URL=http://localhost:8000

# Agora App ID for in-app voice calling
EXPO_PUBLIC_AGORA_APP_ID=<your-agora-app-id>
```

> For Expo Go on a physical device on the same LAN, the backend URL is auto-detected. Set `EXPO_PUBLIC_API_URL` to your deployed backend URL for production.

---

## 20. Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ^57.0.0 | Expo SDK |
| `react-native` | 0.86.3 | Core mobile framework |
| `expo-router` | ~57.0.22 | File-system navigation |
| `zustand` | ^4.5.2 | State management |
| `react-native-agora` | ^4.6.4 | In-app voice calling |
| `expo-location` | ~57.0.19 | GPS access |
| `expo-document-picker` | ~57.0.2 | File upload |
| `expo-image-picker` | ~57.0.19 | Camera / gallery |
| `expo-speech-recognition` | ^57.0.0 | Voice input |
| `expo-local-authentication` | ~57.0.3 | Biometrics |
| `expo-secure-store` | ~57.0.4 | Encrypted storage |
| `expo-haptics` | ~57.0.3 | Tactile feedback |
| `react-native-qrcode-svg` | ^6.3.12 | Emergency wallet QR |
| `react-native-reanimated` | 4.5.1 | Animations |
| `lucide-react-native` | ^1.33.0 | Icons |
| `@react-native-async-storage/async-storage` | 2.2.0 | Token + wallet cache |
| `typescript` | ~5.9.2 | Type safety |

---

*This report was generated from source code analysis of the GOne / LifeLink AI project — September 2026.*
