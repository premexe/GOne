# GOne - LifeLink AI+ Mobile App Report

> **Document Type:** Technical and Feature Report
> **Generated:** October 2026
> **Project Name:** GOne / LifeLink AI+
> **Component:** React Native / Expo Mobile Application
> **Repository:** frontend/

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [App Entry and Navigation Structure](#3-app-entry-and-navigation-structure)
4. [Frontend Structure](#4-frontend-structure)
5. [Authentication and Profile](#5-authentication-and-profile)
6. [Home Dashboard](#6-home-dashboard)
7. [Emergency Wallet and QR Identity](#7-emergency-wallet-and-qr-identity)
8. [SOS Emergency Flow](#8-sos-emergency-flow)
9. [G-ONE ResQ Voice Call Modal](#9-g-one-resq-voice-call-modal)
10. [Hospital Discovery](#10-hospital-discovery)
11. [Medical Records](#11-medical-records)
12. [Readiness and Education](#12-readiness-and-education)
13. [Hospital Admin Dashboard](#13-hospital-admin-dashboard)
14. [State and Data Layer](#14-state-and-data-layer)
15. [API and Backend Integration](#15-api-and-backend-integration)
16. [AI Triage Service (Frontend)](#16-ai-triage-service-frontend)
17. [Network Configuration](#17-network-configuration)
18. [EAS Build and Distribution](#18-eas-build-and-distribution)
19. [Implementation Status](#19-implementation-status)

---

## 1. Overview

The LifeLink AI+ mobile application is a production-targeted React Native app built with Expo SDK 57. It targets both patient users and hospital triage administrators through a single unified application bundle.

Key objectives:
- Enable 1-tap emergency SOS dispatch with GPS and hospital matching.
- Provide G-ONE ResQ: a hands-free AI voice triage companion.
- Store and display an offline-readable emergency medical wallet with QR code.
- Surface a hospital admin command center for ER triage staff.
- Deliver a readiness score, medical records management, and first-aid education.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Expo SDK 57 (Managed Workflow) | Cross-platform iOS / Android / Web |
| **Runtime** | React Native 0.86.3 (Fabric / Hermes) | Performance-optimized runtime |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **Routing** | Expo Router 57 | File-based navigation (app/ directory) |
| **State** | Zustand 4.5.2 | Lightweight global state management |
| **Storage** | AsyncStorage + SecureStore | Persistent tokens and cached wallet |
| **Biometrics** | expo-local-authentication | Fingerprint / Face ID unlock |
| **Location** | expo-location | GPS acquisition for SOS dispatch |
| **Speech STT** | expo-speech-recognition | Native Android/iOS + Web Speech fallback |
| **Speech TTS** | expo-speech | Multi-language voice output |
| **In-App Audio** | react-native-agora 4.6.4 | Agora RTC calling (no telephone required) |
| **QR Code** | react-native-qrcode-svg 6.3.12 | Emergency wallet QR generation |
| **Icons** | lucide-react-native 1.33.0 | Medical and control icons |
| **Documents** | expo-document-picker, expo-image-picker | Medical records upload |
| **HTTP Client** | fetch (wrapped in src/services/http.ts) | 90-second timeout for cold-start |

---

## 3. App Entry and Navigation Structure

```
app/
|-- _layout.tsx              Root layout: session hydration, redirect logic, SafeAreaProvider
|-- index.tsx                Splash redirect: authenticated -> (tabs), unauthenticated -> (auth)
|-- (auth)/
|   `-- login.tsx            Login + registration + biometric unlock flow
|-- (tabs)/
|   |-- _layout.tsx          Bottom tab navigator (Home, Hospitals, Profile, Wallet)
|   |-- index.tsx            Home dashboard: readiness score, SOS button, nearby hospitals
|   |-- hospitals.tsx        Filtered / ranked hospital list
|   |-- profile.tsx          User profile editor + settings
|   `-- wallet.tsx           Offline emergency wallet + QR code
|-- sos/
|   |-- emergency.tsx        SOS confirmation and GPS acquisition
|   |-- provide-info.tsx     Symptom and condition input
|   |-- resq.tsx             G-ONE ResQ voice companion screen
|   `-- track.tsx            Live 5-stage dispatch tracker with map
|-- admin/
|   `-- index.tsx            Hospital emergency command-center dashboard
|-- hospitals/
|   `-- [id].tsx             Hospital detail view
|-- records/
|   |-- index.tsx            Medical records list
|   `-- [id].tsx             Medical record detail view with OCR summary
|-- readiness/
|   `-- index.tsx            Readiness score breakdown and action items
|-- learn/
|   |-- index.tsx            First-aid education article list
|   `-- [id].tsx             Article detail view
`-- notifications/
    `-- index.tsx            In-app notification feed
```

---

## 4. Frontend Structure

The application source is split between the Expo Router app/ directory (screens) and src/ (shared utilities):

```
src/
|-- components/
|   |-- BottomNav.tsx           Custom bottom navigation component
|   |-- DetailHeader.tsx        Back-button header for detail screens
|   |-- EditorialCard.tsx       Learn section content card
|   |-- EmergencyVoiceCall.tsx  Agora RTC in-app voice call UI
|   |-- GOneResQCallModal.tsx   Full G-ONE ResQ voice triage modal (56 KB)
|   |-- SOSButton.tsx           Pulsating emergency SOS button
|   |-- StatusBadge.tsx         Dispatch status badge (colour-coded)
|   |-- SummaryCard.tsx         Dashboard summary information card
|   |-- TimelineStepper.tsx     5-stage dispatch milestone timeline
|   |-- TrendChart.tsx          Health trend visualization
|   `-- WalletCard.tsx          Emergency wallet display card
|-- services/
|   |-- api.ts                  All REST API methods (auth, profile, SOS, hospitals, admin)
|   |-- http.ts                 Fetch wrapper (token injection, 90s timeout, error handling)
|   |-- emergencyAiTriage.ts    3-layer AI triage engine (Backend -> Gemini -> Local)
|   |-- agora.native.ts         Agora RTC native implementation
|   |-- agora.web.ts            Agora RTC web stub
|   |-- aiService.ts            Readiness scoring and local symptom logic
|   |-- speechRecognition.ts    Speech recognition abstraction layer
|   |-- recommendationEngine.ts Hospital ranking and matching logic
|   `-- mockData.ts             Seeded demo data for development
|-- store/
|   |-- useAuthStore.ts         Authentication: login, register, biometrics, session restore
|   |-- useEmergencyStore.ts    Active SOS state, dispatch status, location tracking
|   |-- useHospitalStore.ts     Hospital list and selected hospital state
|   |-- useProfileStore.ts      User profile + emergency wallet state
|   `-- useRecordStore.ts       Medical records list and upload state
|-- constants/
|   `-- theme.ts                COLORS, SPACING, TYPOGRAPHY tokens
`-- types/
    `-- (shared TypeScript interfaces)
```

---

## 5. Authentication and Profile

### app/(auth)/login.tsx

- Login form with email/password validation.
- Registration form with name, email, phone, password.
- Biometric unlock via expo-local-authentication (fingerprint/FaceID).
- Stores session token in AsyncStorage; biometric credential in SecureStore.
- Session restore on app start via useAuthStore hydration in root layout.

### src/store/useAuthStore.ts

- login(), register(), logout() actions.
- biometricLogin() using stored credentials.
- restoreSession() called on app mount.
- Token forwarded to http.ts via setToken().

### app/(tabs)/profile.tsx (30 KB)

- Edit full name, phone number, date of birth, blood group.
- Upload profile photo via expo-image-picker.
- Change password form.
- Emergency wallet editor (blood group, allergies, medications, conditions, notes).
- Emergency contacts manager (add/remove).
- Settings: notifications, biometric toggle.
- Logout button.

---

## 6. Home Dashboard

### app/(tabs)/index.tsx

- **Emergency Readiness Score:** 0-100% calculated from profile completeness, emergency contacts added, and medical documents uploaded. Color-coded (red < 40%, amber < 70%, green >= 70%).
- **Giant SOS Button (SOSButton.tsx):** Pulsating red button. On tap: requests GPS permission, acquires coordinates, navigates to app/sos/emergency.tsx.
- **Nearby Hospitals:** Top 3 ranked hospitals with distance, ETA, ICU beds, general beds.
- **Emergency Wallet Quick-Access Card:** Displays blood group and key allergies.
- **Medical Records Count:** Quick link to records screen.

---

## 7. Emergency Wallet and QR Identity

### app/(tabs)/wallet.tsx

- **Offline Emergency Card:** Full blood group, allergies, chronic conditions, current medications, emergency notes -- displayed even without internet via AsyncStorage cache.
- **Dynamic QR Code (react-native-qrcode-svg):** Encodes critical medical identity. Scannable by first responders or bystanders without unlocking the phone.
- **Emergency Contacts Directory:** Tap-to-call buttons for family members and physicians.
- **WalletCard.tsx component:** Handles the styled card display.

---

## 8. SOS Emergency Flow

### Step 1: app/sos/emergency.tsx

- SOS confirmation screen with emergency type selection.
- GPS acquisition via expo-location.
- Consent confirmation before dispatching.
- Calls POST /sos/ with GPS coordinates and description.

### Step 2: app/sos/provide-info.tsx

- Symptom text input and condition checklist.
- Updates the SOS record with additional context.

### Step 3: app/sos/resq.tsx

- Launches the G-ONE ResQ voice companion session.
- Shows GOneResQCallModal.tsx for the full AI triage experience.

### Step 4: app/sos/track.tsx (37 KB)

- Live 5-stage dispatch milestone tracker.
- Real-time GPS location updates to backend.
- Hospital ETA display.
- Ambulance driver details when assigned.
- "While Ambulance is En Route" survival checklist (interactive checkboxes).
- TimelineStepper.tsx component for visual dispatch stages.

---

## 9. G-ONE ResQ Voice Call Modal

### src/components/GOneResQCallModal.tsx (56 KB)

The largest and most complex component in the app. Implements:

- Full-screen voice triage experience.
- **Continuous hands-free loop:** Auto-listens when AI finishes speaking, auto-submits on silence detection.
- **Real-time transcript feed:** Chat bubbles with timestamps for both patient and AI turns.
- **5-bar audio visualizer:** Animated frequency bars reactive to voice output.
- **Language auto-detection:** Detects Marathi / Hindi / English from transcript.
- **Hybrid input:** Text bar + Send button for noisy environments.
- **"While Ambulance is En Route" card:** High-visibility amber card with survival actions.
- **End Call:** Triggers POST /voice/resq/handover to generate clinical handover and dispatch emails.

### Three-Layer AI Provider (src/services/emergencyAiTriage.ts)

1. **Cloud Backend:** POST /voice/resq/turn (G-ONE ResQ gone_resq_service.py with Gemini/Groq/Deterministic).
2. **Direct Gemini API:** Direct google/generative-ai call (zero cold-start, streaming).
3. **Local Protocol Engine:** Hardcoded clinical protocols for 9 emergency categories (100% offline).

---

## 10. Hospital Discovery

### app/(tabs)/hospitals.tsx (12 KB)

- Fetches hospital list from GET /hospitals/.
- Filters by distance, ICU availability, specialties.
- Distance-ranked display with bed counts and ETA.

### app/hospitals/[id].tsx (9 KB)

- Full hospital detail: address, contact, bed breakdown, specialties.
- Map view with hospital location.
- "Select as Emergency Hospital" action.

---

## 11. Medical Records

### app/records/index.tsx (7.8 KB)

- Lists all uploaded medical documents.
- Upload via expo-document-picker (PDF, images).
- Shows processing status (pending, OCR complete, error).

### app/records/[id].tsx (5.3 KB)

- Full medical record detail.
- OCR extracted text display.
- AI clinical summary.
- Download / view original file.

---

## 12. Readiness and Education

### app/readiness/index.tsx (7.7 KB)

- Readiness score breakdown: which items are complete, which are missing.
- Actionable missing item links (add emergency contact, upload record, fill wallet).

### app/learn/index.tsx (2.6 KB)

- Curated first-aid education article list.

### app/learn/[id].tsx (3.0 KB)

- Article detail with formatted content and images.

---

## 13. Hospital Admin Dashboard

### app/admin/index.tsx (23 KB)

- Accessible at route /admin.
- 3-second setInterval polling of GET /sos/ for active emergencies.
- SOS queue cards: patient name, phone, coordinates, distance, AI classification, severity.
- Accept: POST /sos/{id}/accept (assigns bed, updates status).
- Reject: POST /sos/{id}/reject (with reason; auto-reroutes patient).
- Dispatch progression: PATCH /sos/{id}/status through 5 lifecycle stages.
- Completed case archive with full patient history.
- Bed capacity display: total, general available, ICU, ICU available, oxygen beds.

---

## 14. State and Data Layer

| Store | Key Actions | Persistence |
|---|---|---|
| useAuthStore.ts | login, register, biometricLogin, restoreSession, logout | AsyncStorage + SecureStore |
| useEmergencyStore.ts | createSOS, updateLocation, updateStatus, resolveEmergency | In-memory + API |
| useHospitalStore.ts | fetchHospitals, setSelectedHospital | In-memory |
| useProfileStore.ts | fetchProfile, updateProfile, fetchWallet, updateWallet | In-memory + AsyncStorage cache |
| useRecordStore.ts | fetchRecords, uploadRecord, processOCR | In-memory |

---

## 15. API and Backend Integration

### src/services/http.ts

- Wraps fetch with Bearer token injection.
- Dynamic API URL: Expo Go -> follows laptop Wi-Fi IP automatically; production -> EXPO_PUBLIC_API_URL.
- 90-second timeout (AbortController) to handle Render cold starts.
- Structured error parsing from FastAPI JSON responses.

### src/services/api.ts (27 KB)

Comprehensive API method set:
- Auth: login, register, getUser, updateUser, uploadProfilePhoto
- Wallet: getWallet, updateWallet
- Contacts: getEmergencyContacts, addContact, removeContact
- Records: getRecords, uploadRecord, processOCR
- Hospitals: getHospitals, getHospital
- SOS: createSOS, getActiveSOS, getCompletedSOS, updateSOSLocation, resolveEmergency
- Admin: getAllSOS, acceptSOS, rejectSOS, updateDispatchStatus
- Voice: getResqProtocols, sendResqTurn, sendResqHandover, getTranscript

---

## 16. AI Triage Service (Frontend)

### src/services/emergencyAiTriage.ts (22 KB)

Multi-layer architecture:

1. **Backend Layer:** Calls /voice/resq/turn on the FastAPI server (includes Gemini/Groq/deterministic fallback chain on backend).
2. **Direct Gemini Layer:** Directly calls Google Gemini API when backend is unavailable.
3. **Local Layer:** Comprehensive hardcoded protocol engine for 9 emergency categories with English, Hindi, and Marathi responses. Never fails, fully offline.

Clinical protocol definitions are stored in CLINICAL_PROTOCOLS constant, covering: CARDIAC, STROKE, BREATHING, CHOKING, BLEEDING, BURNS, TRAUMA, NEUROLOGICAL, GENERAL_EMERGENCY.

### src/services/aiService.ts (4.6 KB)

- Local readiness score calculation.
- Symptom classification for quick pre-SOS triage.

### src/services/recommendationEngine.ts (2.7 KB)

- Hospital ranking by distance, bed availability, and specialty match.

---

## 17. Network Configuration

### Backend URL Resolution (src/services/http.ts)

Priority order:
1. EXPO_PUBLIC_API_URL (if set and not localhost on device).
2. Expo Go hostUri (auto-detected local network IP in development).
3. Default: https://gone-backend.onrender.com.

EAS preview builds override via eas.json env to: https://lifelink-backend-1tzq.onrender.com

### Android Cleartext Traffic

- "usesCleartextTraffic": true in frontend/app.json -> android for local HTTP development.
- Production uses HTTPS exclusively.

### Permissions (app.json)

- android.permission.USE_BIOMETRIC
- android.permission.USE_FINGERPRINT
- android.permission.RECORD_AUDIO
- NSSpeechRecognitionUsageDescription (iOS)
- NSMicrophoneUsageDescription (iOS)
- FaceID permission (iOS via expo-local-authentication plugin)

---

## 18. EAS Build and Distribution

### frontend/eas.json

| Profile | Type | Distribution | Backend URL |
|---|---|---|---|
| development | Dev client | Internal | (local) |
| preview | APK | Internal | https://lifelink-backend-1tzq.onrender.com |
| production | AAB | Store | (auto-increment version) |

### Build Command

```powershell
cd frontend
npx eas-cli build --platform android --profile preview
```

- EAS CLI version requirement: >= 24.7.0
- Version source: remote (EAS manages build numbers)
- EAS Project: https://expo.dev/accounts/premexe/projects/lifelink-ai-plus/builds

---

## 19. Implementation Status

| Area | Status | Notes |
|---|---|---|
| Authentication (JWT + Biometrics) | Complete | Login, register, biometric, session restore |
| Home Dashboard | Complete | Readiness score, SOS button, hospital cards |
| Emergency Wallet | Complete | Offline display, QR code, contact directory |
| SOS Flow | Complete | Full 4-step flow: confirm, info, resq, track |
| G-ONE ResQ Voice Modal | Complete | Hands-free, 3-layer AI, chat feed, visualizer |
| Hospital List / Detail | Complete | Distance ranked, bed counts, specialty filter |
| Admin Dashboard | Complete | 3s polling, accept/reject, 5-stage progression |
| Medical Records | Complete | Upload, OCR, AI summary |
| Readiness Screen | Complete | Score breakdown, actionable items |
| Learn / Education | Complete | Article list and detail |
| Notifications | Complete | In-app feed |
| Agora RTC Calling | Integrated | Token generation on backend, native client |
| EAS Build | In Progress | Preview APK build running at time of this report |

The application is a functional, feature-complete MVP. All core emergency workflows are implemented and connected to the FastAPI backend. Some edge cases in the admin dashboard and hospital assignment flow may benefit from further integration testing with live data.