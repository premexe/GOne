# GOne - LifeLink AI+ Hospital Admin Dashboard Report

> **Document Type:** Technical and Feature Report
> **Generated:** October 2026
> **Project Name:** GOne / LifeLink AI+
> **Component:** Hospital Emergency Admin Dashboard
> **File Location:** frontend/app/admin/index.tsx
> **Route:** /admin

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
9. [Backend API Endpoints Used](#9-backend-api-endpoints-used)
10. [Backend Services Used](#10-backend-services-used)
11. [Database Models](#11-database-models)
12. [Hospital Resource Management](#12-hospital-resource-management)
13. [Ambulance and Doctor Assignment](#13-ambulance-and-doctor-assignment)
14. [Email and Notification Integration](#14-email-and-notification-integration)
15. [G-ONE ResQ AI Integration](#15-g-one-resq-ai-integration)
16. [Backend Architecture](#16-backend-architecture)
17. [Database Schema](#17-database-schema)
18. [Environment Configuration](#18-environment-configuration)
19. [Backend Dependencies](#19-backend-dependencies)
20. [Security Model](#20-security-model)
21. [Hospital Account Provisioning](#21-hospital-account-provisioning)

---

## 1. Overview

The **Hospital Emergency Admin Dashboard** is the command-and-control interface for hospital emergency triage staff. It is embedded directly inside the LifeLink AI+ mobile app and runs at the /admin route.

### Purpose

Hospital administrators use this dashboard to:
- **Monitor** all incoming SOS alerts in real time (3-second polling).
- **Triage and respond** to emergency cases by accepting or rejecting each SOS.
- **Track the full dispatch lifecycle** through 5 defined milestones.
- **Progress cases** manually: Accepted -> Patient Picked Up -> Arrived at Hospital -> Completed.
- **Review completed cases** with full patient history and dispatch timeline.

### Who Uses It

- Emergency room triage nurses and coordinators.
- Hospital dispatch officers.
- Ambulance coordination staff.

---

## 2. Architecture Position

```
+--------------------------------------------------+
|         LifeLink AI+ Mobile App                  |
|                                                  |
|  [Patient App]  |  [Admin Dashboard /admin]      |
|  - SOS Trigger  |  - Live SOS Queue              |
|  - Track Screen |  - Accept / Reject             |
|  - Wallet / QR  |  - Dispatch Progression        |
+--------------------------------------------------+
                      |
                      | REST API (shared backend)
                      v
+--------------------------------------------------+
|  FastAPI Backend (https://lifelink-backend-1tzq.onrender.com) |
|  /sos/  /hospitals/  /ambulances/  /doctors/     |
|  PostgreSQL (Supabase) + SQLite fallback         |
|  G-ONE ResQ Engine   Resend Email                |
+--------------------------------------------------+
```

The Admin Dashboard shares the same FastAPI backend and src/services/api.ts service layer as the patient-facing app. There is no separate admin server.

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | React Native (Expo SDK 57) | Cross-platform |
| **Language** | TypeScript | Strict typing |
| **Routing** | Expo Router | Route: /admin |
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
| Password hashing | BCrypt via passlib | BCrypt via passlib |

### Hospital Login Flow

1. Hospital staff opens /admin.
2. Enters hospital email + password.
3. POST /hospitals/login validates against hospitals.email + hospitals.password_hash.
4. Returns access_token + hospital metadata.
5. Token stored in-app; hospital ID pre-filled in dashboard.

---

## 5. Dashboard Features

### Hospital ID Selector Bar

```
[ HOSPITAL ID: ] [ 1 ] [ SYNC ]
```
- Configurable hospital ID input for multi-hospital staff.
- SYNC button forces immediate data refresh.
- Default: process.env.EXPO_PUBLIC_HOSPITAL_ID || '1'.

### Active Queue Tab

- Shows all currently active SOS alerts assigned to or pending acceptance by this hospital.
- Red count badge shows number of pending emergencies.
- Auto-refreshes every 3 seconds via setInterval.
- Pull-to-refresh supported via RefreshControl.

### Completed Cases Tab

- Shows all resolved/completed SOS cases for the hospital.
- Green count badge shows total completed cases.
- Useful for post-shift audit and case review.

### SOS Admin Card Fields

| Field | Description |
|---|---|
| Patient Name | From SOS record or Patient #<user_id> fallback |
| Patient Phone | Shown with phone emoji for quick callback |
| Status Badge | Color-coded: NEW SOS / ACCEPTED / PICKED UP / AT HOSPITAL / COMPLETED |
| Emergency Details | Patient-described or AI-extracted description |
| GPS Coordinates | Latitude and longitude (or "GPS location pending") |
| AI Classification | AI emergency understanding (e.g., CARDIAC, STROKE) |
| AI Severity | CRITICAL / HIGH / MODERATE |
| Case Activity Milestones | Visual 5-step stepper with timestamps |
| Action Buttons | Context-sensitive: Accept / Confirm Pickup / Mark Arrived / Complete |

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
    | Admin: ASSIGN AMBULANCE
    v
[AMBULANCE_ASSIGNED]  dispatch_status = AMBULANCE_ASSIGNED
    |
    | Admin: CONFIRM EN ROUTE
    v
[EN_ROUTE]  dispatch_status = EN_ROUTE, ambulance traveling
    |
    | Admin: CONFIRM PATIENT PICKUP
    v
[PICKED_UP]  dispatch_status = PATIENT_PICKED_UP
    |
    | Admin: MARK ARRIVED AT HOSPITAL
    v
[ARRIVED]  dispatch_status = ARRIVED_AT_HOSPITAL
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
| ACCEPTED | Hospital accepted the SOS, ER bed reserved |
| AMBULANCE_ASSIGNED | Ambulance assigned to case |
| EN_ROUTE | Ambulance en route to patient GPS location |
| PATIENT_PICKED_UP | Patient secured in ambulance |
| ARRIVED_AT_HOSPITAL | Patient at emergency bay |
| COMPLETED | Case closed, resources released |

### Rejection Flow

- REJECT creates a SOSRejection record with clinical reason.
- SOS stays ACTIVE -- other hospitals can still accept it.
- Patient app shows rejection in rejectedHospitals list.
- Multiple hospitals can reject; first to accept wins the case.
- Backend automatically reroutes to next closest available hospital.

---

## 7. Real-Time Polling Architecture

```typescript
useEffect(() => {
  loadData();                              // initial load on mount
  const timer = setInterval(loadData, 3000); // poll every 3 seconds
  return () => clearInterval(timer);       // cleanup on unmount
}, [hospitalId]);
```

### loadData() - Parallel Fetch

```typescript
const [live, completed] = await Promise.all([
  api.getAdminSOSAlerts(hospitalId),       // GET /sos/?status=ACTIVE
  api.getCompletedSOSAlerts(hospitalId),   // GET /sos/completed
]);
```

Both lists are fetched in parallel using Promise.all for minimal latency. This gives a maximum polling overhead of one API round-trip per 3 seconds.

---

## 8. UI Components and Layout

### Screen Layout

```
+--------------------------------------------------+
| Emergency Admin   Triage Control & Dispatch  [X] | <- Header + Close
+--------------------------------------------------+
| HOSPITAL ID: [1]                         [SYNC]  | <- Selector Bar
+--------------------------------------------------+
| [ACTIVE QUEUE (3)]  |  [COMPLETED CASES (12)]    | <- Tab Bar
+--------------------------------------------------+
|  [Siren] Patient Name                [NEW SOS]   |
|  Phone: +91 XXXXXXX                              |
|  EMERGENCY DETAILS: Chest pain, difficulty...    |
|  [MapPin] 19.69712, 72.76601                     |
|  AI: CARDIAC - CRITICAL                          |
|                                                  |
|  CASE ACTIVITY & MILESTONES                      |
|  [green] 1. SOS Broadcast Received     10:32     |
|  [grey]  2. Hospital Admission Accepted Pending  |
|  [grey]  3. Ambulance Assigned         Pending   |
|  [grey]  4. Patient Picked Up          Pending   |
|  [grey]  5. Arrived at Hospital Bay    Pending   |
|                                                  |
|  [ACCEPT EMERGENCY]  [REJECT (with reason)]      |
+--------------------------------------------------+
```

---

## 9. Backend API Endpoints Used

| Method | Endpoint | Description |
|---|---|---|
| GET | /sos/ | List all active SOS alerts (3s polling) |
| GET | /sos/completed | List completed SOS alerts |
| POST | /sos/{id}/accept | Accept SOS case, link hospital |
| POST | /sos/{id}/reject | Reject with clinical reason |
| PATCH | /sos/{id}/status | Update dispatch milestone |
| GET | /hospitals/ | Hospital list and bed counts |
| GET | /ambulances/ | Ambulance availability |
| GET | /doctors/ | Doctor availability |
| POST | /hospitals/login | Hospital admin authentication |

---

## 10. Backend Services Used

| Service | File | Purpose |
|---|---|---|
| SOS Service | backend/app/services/sos_service.py | SOS lifecycle, hospital assignment |
| Emergency Orchestration | backend/app/services/emergency_orchestration_service.py | Hospital rerouting on rejection |
| Emergency Response | backend/app/services/emergency_response_service.py | Dispatch milestone management |
| Notification Service | backend/app/services/notification_service.py | In-app alerts to patient |
| Email Service | backend/app/services/email_service.py | Emergency contact email dispatch |
| G-ONE ResQ Service | backend/app/services/gone_resq_service.py | AI triage data on SOS card |

---

## 11. Database Models

### Hospital

| Column | Type | Notes |
|---|---|---|
| hospital_id | PK Integer | Auto-increment |
| name | String | Hospital full name |
| email | String, unique | Admin login |
| password_hash | String | BCrypt |
| phone | String | Emergency line |
| address | String | Physical address |
| latitude, longitude | Float | GPS for distance ranking |
| total_beds | Integer | Total hospital bed capacity |
| available_beds | Integer | Currently available general beds |
| icu_beds | Integer | Total ICU beds |
| available_icu_beds | Integer | Currently available ICU beds |
| oxygen_beds | Integer | Oxygen-supported beds |
| specialties | Text | Comma-separated specialty list |

### SOSRejection

| Column | Type | Notes |
|---|---|---|
| rejection_id | PK Integer | |
| sos_id | FK -> sos_requests | |
| hospital_id | FK -> hospitals | Rejecting hospital |
| reason | Text | Clinical rejection reason |
| created_at | DateTime | UTC timestamp |

---

## 12. Hospital Resource Management

The admin dashboard displays live resource counts fetched from the hospital record:

- **Total Beds** vs **Available General Beds**
- **ICU Beds** vs **Available ICU Beds**
- **Oxygen-Supported Emergency Beds**

When a case is accepted, available_beds is decremented. When a case is completed or the ambulance drops off the patient, the bed is marked available again.

---

## 13. Ambulance and Doctor Assignment

When a hospital accepts an SOS:

1. Backend queries available ambulances (is_available = true) for this hospital.
2. Nearest available ambulance is auto-assigned (assigned_ambulance_id on SOS).
3. Ambulance record: is_available set to false.
4. Backend optionally assigns an available emergency doctor (assigned_doctor_id on SOS).
5. Doctor record: is_available set to false.
6. On case COMPLETED: ambulance and doctor records revert to is_available = true.

---

## 14. Email and Notification Integration

### Resend SMTP (email_service.py)

When the G-ONE ResQ call ends (POST /voice/resq/handover), the backend:
1. Compiles the full multi-turn transcript.
2. Generates a structured clinical handover summary.
3. Dispatches an email to all emergency contacts for the patient via Resend SMTP.
4. Saves transcript to sos_requests.call_transcript and call_summary.

### In-App Notifications (notification_service.py)

- Patient receives push-style in-app notifications on key dispatch milestones.
- Hospital accepts -> patient is notified.
- Ambulance en route -> patient is notified with estimated arrival time.
- Case completed -> patient is notified.

---

## 15. G-ONE ResQ AI Integration

The admin dashboard SOS card surfaces AI-generated data from the G-ONE ResQ engine:

- **ai_emergency_understanding:** Clinical category (e.g., "CARDIAC EMERGENCY - Possible heart attack").
- **ai_severity:** CRITICAL / HIGH / MODERATE -- displayed as a color-coded badge.
- **call_summary:** Structured clinical handover (viewable in completed case detail).
- **call_transcript:** Full dialogue log available in completed case view.

This gives hospital triage staff critical patient context before the ambulance arrives, enabling faster ER preparation.

---

## 16. Backend Architecture

### FastAPI Router: backend/app/routers/sos.py (5.4 KB)

Key routes handled:
- POST /sos/ -- create SOS, rank hospitals by distance, send initial notifications.
- GET /sos/ -- list SOS alerts with patient details and AI data.
- POST /sos/{id}/accept -- accept with hospital assignment and bed decrement.
- POST /sos/{id}/reject -- reject and trigger rerouting orchestration.
- PATCH /sos/{id}/status -- advance dispatch milestone.

### FastAPI Router: backend/app/routers/hospitals.py (7.9 KB)

- GET /hospitals/ -- list all hospitals with full bed counts.
- POST /hospitals/login -- hospital admin authentication returning JWT.
- PATCH /hospitals/{id} -- update bed availability (called on accept/complete).

---

## 17. Database Schema

### sos_requests (key admin-relevant columns)

| Column | Type | Description |
|---|---|---|
| sos_id | PK Integer | |
| user_id | FK users | Patient |
| latitude, longitude | Float | Patient GPS |
| description | Text | Symptoms |
| status | Enum | ACTIVE, ACCEPTED, RESOLVED, CANCELLED |
| dispatch_status | Enum | SEARCHING -> COMPLETED |
| accepted_hospital_id | FK hospitals | Hospital that accepted |
| assigned_ambulance_id | FK ambulances | Assigned ambulance |
| assigned_doctor_id | FK doctors | Assigned ER doctor |
| rejected_hospital_ids | Text | JSON list of rejecting hospital IDs |
| ai_emergency_understanding | String | AI-classified emergency type |
| ai_severity | String | CRITICAL / HIGH / MODERATE |
| call_transcript | Text | Full G-ONE ResQ dialogue |
| call_summary | Text | Clinical handover summary |
| created_at | DateTime | UTC |

---

## 18. Environment Configuration

| Variable | Required | Purpose |
|---|---|---|
| DATABASE_URL | Recommended | PostgreSQL connection (SQLite fallback if absent) |
| JWT_SECRET_KEY | Yes | HS256 signing secret |
| GEMINI_API_KEY | Recommended | Primary AI provider for ResQ triage |
| SMTP_HOST / SMTP_PASSWORD | Recommended | Resend email delivery |
| AGORA_APP_ID / AGORA_APP_CERTIFICATE | Optional | Agora RTC in-app calling tokens |

Frontend EAS preview build: EXPO_PUBLIC_API_URL automatically set to https://lifelink-backend-1tzq.onrender.com.

---

## 19. Backend Dependencies (requirements.txt)

| Package | Purpose |
|---|---|
| fastapi | REST API framework |
| uvicorn[standard] | ASGI server |
| gunicorn | Production process manager |
| sqlalchemy | ORM |
| psycopg2-binary | PostgreSQL driver |
| python-dotenv | Environment variable loading |
| pydantic / pydantic-settings | Request/response validation |
| httpx | Async HTTP client |
| pyjwt / python-jose | JWT generation and verification |
| python-multipart | File upload handling |
| passlib / bcrypt | Password hashing |
| pdf2image / pillow / pypdf / pytesseract | OCR pipeline |
| email-validator | Email format validation |
| google-genai | Google Gemini AI provider |
| agora-token-builder | Agora RTC token generation |

---

## 20. Security Model

- All SOS and hospital routes require a valid JWT Bearer token.
- Hospital JWT includes role: "hospital" claim to distinguish admin routes.
- Passwords hashed with BCrypt (passlib).
- All personal data routes validate the authenticated principal matches the requested resource.
- CORS configured to accept all origins (suitable for mobile app; restrict in production).
- API keys (Gemini, Agora, Resend, Bland) stored only in backend .env, never in frontend or Git.
- EAS build injects only the backend URL (EXPO_PUBLIC_*); no secrets are included in the APK.

---

## 21. Hospital Account Provisioning

Hospital admin accounts are **not auto-seeded** and must be provisioned through the proper setup flow. No shared or predictable credentials are distributed in this documentation.

### Provisioning a Hospital Admin Account

Use the authenticated admin API to create a hospital record, then issue credentials directly to the responsible hospital staff member:

```powershell
# Example: create a hospital record via the backend API
curl -X POST https://<backend-url>/hospitals/ \
  -H "Content-Type: application/json" \
  -d '{"name": "<Hospital Name>", "address": "...", "email": "<staff-email>", "password": "<strong-password>", ...}'
```

> **Security policy:** Hospital credentials must be strong, unique per institution, rotated on staff changes, and never stored in documentation or version control.

### Seeding Palghar Hospital Network (Reference Data Only)

To load real Palghar district hospital geography (names, coordinates) as reference data — **without creating any login accounts** — run:

```powershell
.venv\Scripts\python.exe backend/seed_palghar_hospitals.py
```

This inserts hospital records with realistic coordinates for distance-ranking. Credentials must still be provisioned separately per hospital.