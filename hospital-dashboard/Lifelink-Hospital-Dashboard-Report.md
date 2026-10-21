# LifeLink Hospital Dashboard Report

> **Document type:** Source-verified technical and feature report  
> **Repository:** `lifelink-hospital-dashboard`  
> **Verified:** September 23, 2026  
> **Implementation phase:** Phase 4 hospital-facing web client with a provisional Phase 5 API adapter

## 1. Verification Summary

The attached report does **not** match this folder in several important ways. This repository contains a Vite React web application, not an Expo React Native screen at `/admin`. The complete working experience is the browser-based mock provider; the FastAPI integration is prepared but explicitly provisional.

| Attached report claim | Source-verified repository behavior |
|---|---|
| React Native / Expo SDK 57 | React 19, TypeScript, Vite, React Router, and browser APIs |
| Single `/admin` route | Routes include `/login`, `/signup`, `/dashboard`, `/new-emergencies`, `/ongoing-cases`, `/completed-cases`, `/cases/:id`, `/emergencies/:id`, and `/resources` |
| 3-second polling for a single admin screen | New Emergencies and Ongoing Cases poll every 3 seconds; Dashboard also polls emergency queues every 3 seconds. No SSE or WebSocket feed is enabled |
| Palghar hospitals and integer IDs `1` to `4` | Mock hospitals use string IDs `HSP-001` to `HSP-004` and Mumbai locations |
| Bcrypt hospital authentication | Mock mode uses demo credentials and browser storage; newly registered mock passwords are SHA-256 hashed with a random salt. API authentication is delegated to the backend token contract |
| `/sos/:id/assign-ambulance` and `/sos/:id/assign-doctor` | The current API adapter uses `/sos/:id/ambulance-assignment` and `/sos/:id/doctor-assignment` |
| Backend AI, voice calls, email, and database services are included | Those services are not present in this frontend repository; the dashboard consumes allocation and priority data supplied by its provider |
| Completed status releases resources in the backend service | Mock mode releases assigned resources locally; API mode attempts resource release and delegates authoritative state to the backend |

## 2. Purpose and System Boundary

This application is the hospital operations console for a multi-hospital emergency-response platform. An authenticated hospital can review emergency requests allocated to it, make an accept/reject decision, assign hospital resources, follow a route, and progress accepted cases.

The dashboard does not:

- Create citizen SOS incidents.
- Choose or rank hospitals.
- Select a replacement hospital after rejection.
- Send citizen notifications.
- Own the authoritative emergency lifecycle or persistence layer in API mode.
- Display a citizen's unrestricted medical record.

The intended system boundary is:

```text
GOne Citizen App -> FastAPI Backend -> AI / Hospital Matching -> Hospital Dashboard
```

The frontend receives hospital-allocated emergency handoffs. Backend and allocation teams own SOS creation, triage, allocation, notification, authorization, authoritative state, and concurrency rules.

## 3. Technology Stack

| Layer | Technology | Repository evidence |
|---|---|---|
| UI | React 19 | `react` and `react-dom` dependencies |
| Language | TypeScript | `tsconfig.json`, typed domain contracts |
| Build tool | Vite 8 | `vite.config.ts`, `npm run dev`, `npm run build` |
| Routing | React Router 7 | `src/App.tsx` |
| Styling | Tailwind CSS v4 plugin plus project CSS | `tailwindcss`, `@tailwindcss/vite`, `src/index.css` |
| Icons | Lucide React | `lucide-react` |
| Charts | Recharts | Dashboard activity chart |
| Maps | Leaflet and React Leaflet | Emergency map and markers |
| Road routing | OSRM-compatible public service | `src/services/routing.ts`, `VITE_OSRM_BASE_URL` |
| Data providers | Mock provider or API provider | Selected by `VITE_DATA_MODE` |
| Test scripts | Node/Vite smoke and contract tests | `tests/verify.mjs`, `tests/api-contract.mjs` |

## 4. Application Routes and Access Control

`src/App.tsx` protects the operational routes with `ProtectedRoute` and `AppShell`. Unauthenticated users are redirected to `/login`.

| Route | Purpose | Access |
|---|---|---|
| `/login` | Hospital sign-in | Public |
| `/signup` | Hospital registration | Public |
| `/dashboard` | Operational overview, metrics, queues, activity, resources | Protected |
| `/new-emergencies` | Pending allocated requests requiring a hospital decision | Protected |
| `/ongoing-cases` | Accepted active cases | Protected |
| `/completed-cases` | Completed-case archive | Protected |
| `/cases/:id` | Emergency detail alias | Protected |
| `/emergencies/:id` | Emergency detail route | Protected |
| `/resources` | Beds, doctors, and ambulance management | Protected |

The root route redirects to `/dashboard`; unknown routes also redirect to `/dashboard`.

Hospital identity is scoped through the authenticated session and passed to provider methods. The integration contract requires the backend to derive authorization from the authenticated hospital principal rather than trusting a client-supplied hospital ID.

## 5. Runtime and Data Modes

The selected provider is configured in `src/config/runtime.ts`:

```env
VITE_DATA_MODE=mock
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_OSRM_BASE_URL=https://router.project-osrm.org
```

- `mock` is the safe default and provides the complete demo without a backend.
- `api` selects the prepared API adapter and central HTTP client.
- The default API base URL in the current source is `https://lifelink-backend-1tzq.onrender.com` unless overridden by `VITE_API_BASE_URL`.
- `.env.example` recommends `http://localhost:8000/api/v1` and warns that API routes are provisional.

The service layer and provider contracts keep pages independent of the selected data source:

```text
React pages/components
        |
Application services
        |
Selected provider set
      /       \
 Mock       API adapter
   |             |
Browser      HTTP client
storage      FastAPI proposal
```

## 6. Authentication and Registration

### Mock mode

Four demo accounts are defined in `src/data/mockData.ts`. The mock session stores the current hospital ID in `localStorage` under `lifelink-demo-hospital-session-v1`. Registered mock accounts are persisted in the mock operational state, while the plaintext password is excluded from the stored record.

Hospital registration validates fields, rejects duplicate license/email combinations, creates a new string hospital ID, and returns an `APPROVED` mock registration record. New registered hospitals start with zero beds, doctors, and ambulances until resources are added.

### API mode

The API provider calls `POST /hospitals/login`, stores the access token through `tokenStore`, and stores the mapped hospital session in browser `sessionStorage`. The central HTTP client sends `Authorization: Bearer <token>` and maps common API errors. Production token storage, refresh, logout, CSRF protection, and session policy remain backend integration decisions.

## 7. Dashboard Features

The overview page loads hospital metrics, new emergencies, ongoing emergencies, activity points, and resources. It provides:

- Pending emergency count and critical-case count.
- Ongoing case count.
- Available and total ambulance counts.
- Prototype average response time.
- Emergency and ICU bed availability.
- Available doctor counts, including emergency-related doctors.
- Activity chart data supplied by the provider.
- Priority dispatch queue and ongoing response preview.
- Links to new, ongoing, and completed case views.
- Resource status panels.

The dashboard does not include the attached report's hospital-ID selector bar. The active hospital comes from the authenticated session.

## 8. Emergency Queues and Polling

### New Emergencies

`/new-emergencies` displays allocated requests with search and priority filters: All, Critical, High, Medium, and Low. It refreshes on initial load and every 3 seconds.

### Ongoing Cases

`/ongoing-cases` loads accepted operational cases and refreshes every 3 seconds. Its implementation also fetches completed data for queue/archive synchronization.

### Dashboard

`/dashboard` performs an initial parallel load and then polls new, ongoing, and completed emergency data every 3 seconds. A local `DATA_CHANGED_EVENT` also refreshes relevant mock views after mutations.

There is no polling implementation for the complete application-wide event bus, and no SSE or WebSocket implementation in this phase. Polling is not a claim that the backend is real-time beyond the request interval.

## 9. Emergency Data Model

The frontend `Emergency` type supports:

- Stable string `id` and optional `sosId`.
- Hospital ID, request status, emergency type, symptoms, urgency, severity, and operational status.
- Priority score, level, and reasons.
- Authorized patient handoff fields such as name, age, gender, blood group, conditions, allergies, medications, emergency contacts, and consent reference.
- Location coordinates, address, area, city, accuracy, timestamp, and source.
- Global SOS status and allocation metadata such as match rank, distance, travel time, capability match, freshness, reason, and model version.
- Assignment references for ambulance and doctor.
- Created, updated, allocated, accepted, assigned, and completed timestamps.
- Rejection reason and timeline events.

The frontend treats patient data as an emergency handoff, not as a full citizen account or unrestricted medical record.

## 10. Emergency Lifecycle

The visible hospital workflow is:

```text
RECEIVED
   -> ACCEPTED or REJECTED
   -> AMBULANCE_ASSIGNED
   -> EN_ROUTE
   -> PATIENT_PICKED_UP
   -> ARRIVED
   -> COMPLETED
```

The global/citizen lifecycle is separate and may include `created`, `location_acquired`, `triaged`, `contacts_notified`, `facility_matched`, `dispatched`, `en_route`, `arrived`, and `closed`. `statusMapper.ts` provides the provisional translation boundary.

### Accept

Accepting a pending emergency changes the hospital decision/request state to accepted and moves it to ongoing cases. The mock provider records the acceptance and timeline event. The API adapter sends the hospital ID to the proposed backend endpoint.

### Reject

Rejecting requires a reason in the UI. The mock provider marks the request rejected and removes it from the new queue. Reallocation is not performed by the frontend; the backend/orchestration layer owns any replacement-hospital decision.

### Resource assignment

Accepted cases can be assigned an available ambulance and doctor belonging to the current hospital. Assignment updates the case timeline and resource state in mock mode. In API mode, assignment calls are delegated through the adapter and must be validated authoritatively by the backend.

### Status progression

The detail page exposes actions for `EN_ROUTE`, `PATIENT_PICKED_UP`, `ARRIVED`, and `COMPLETED`, subject to the current case state. Completing a mock case releases the ambulance and decrements the assigned doctor's active case count. API mode archives a local completed copy and attempts to make assigned resources available, but the backend remains authoritative.

## 11. Emergency Detail Experience

The detail page includes:

- Patient handoff and known conditions/allergies.
- AI-assisted priority score, severity, and reasons, with a disclaimer that the score does not replace clinical assessment.
- Patient and hospital map markers.
- Ambulance marker when assigned.
- OSRM route, approximate distance, route duration, and prototype ambulance ETA.
- Fallback dashed route when OSRM is unavailable.
- Assignment controls for ambulances and doctors.
- Timeline of case activity.
- Accept, reject, and status-advance actions.
- Loading, error, not-found, busy, toast, and empty states.

Map estimates are prototype routing data, not live traffic, certified navigation, or live ambulance GPS. Ambulance movement in mock mode is state-based.

## 12. Hospital Resources

The `/resources` page manages hospital-scoped:

- General beds, ICU beds, and emergency beds, each with total, occupied, and available values.
- Ambulances with vehicle number, driver name, driver phone, status, and location label.
- Doctors with name, department, specialization, phone, status, and current case count.

Supported resource operations are create, update, delete, list, and assignment. Mock validation prevents invalid occupancy values, duplicate vehicle numbers, removal of resources used by active cases, and unsafe status changes for active assignments. Completing a case releases its assigned resources.

## 13. API Adapter and Endpoint Status

The adapter in `src/providers/api/apiProviders.ts` is not proof that a matching backend exists. The repository documentation labels these paths as provisional and says to confirm them before enabling API mode.

### Implemented adapter calls

| Operation | Current adapter path/method | Notes |
|---|---|---|
| Login | `POST /hospitals/login` | Maps token and hospital response |
| Hospital list/detail | `GET /hospitals`, `GET /hospitals/{id}` | Used to map hospital data |
| New emergencies | `GET /sos/` | Client filters pending/unhandled records |
| Ongoing emergencies | `GET /sos/` | Client filters accepted/in-progress records |
| Completed emergencies | `GET /sos/completed?hospital_id={id}` | Also probes `/sos/{id}` for IDs 1 through 30 when needed |
| Emergency detail | `GET /sos/{id}` | Maps backend SOS shape |
| Accept | `POST /sos/{id}/accept` | Body includes numeric `hospital_id` |
| Reject | `POST /sos/{id}/reject` | Body includes numeric `hospital_id` and `reason` |
| Status update | `PATCH /sos/{id}/status` | Body contains mapped status |
| Hospital beds | `PUT /hospitals/{id}` | Sends total and occupied bed fields |
| Doctors | `GET/POST/PUT/DELETE /hospitals/{id}/doctors/` | Adapter falls back to local storage on failures |
| Ambulances | `GET/POST/PUT/DELETE /hospitals/{id}/ambulances/` | Adapter falls back to local storage on failures |
| Ambulance assignment | `POST /sos/{id}/ambulance-assignment` | Body contains `ambulance_id` |
| Doctor assignment | `POST /sos/{id}/doctor-assignment` | Body contains `doctor_id` |

The API contract document separately proposes cleaner hospital-scoped paths such as `/hospital/emergencies/...` and `/hospital/resources/...`. Those proposals must not be presented as current backend facts.

## 14. Backend Contract Expectations

The frontend expects a backend that provides:

- Hospital authentication and session restoration.
- Hospital-scoped authorization.
- Allocated emergency requests and authorized patient handoffs.
- Server-side validation of accept/reject, assignment, and status transitions.
- Authoritative timestamps, audit timeline events, and final state.
- Resource availability and freshness metadata.
- Stable opaque IDs rather than assumptions about sequential integers.
- Structured errors containing a code, safe message, optional details, and request ID.

The backend owns SOS creation, AI triage, hospital matching, notifications, persistence, idempotency, concurrency control, and citizen communication. None of those services are implemented in this frontend folder.

## 15. AI, Voice, Email, and Notifications

The dashboard renders AI-assisted priority fields when supplied in its emergency data model and clearly labels them as operational support. It does not contain:

- Gemini, Ollama, or a deterministic G-ONE triage pipeline.
- Bland AI voice-call integration.
- Resend/SMTP email delivery.
- Emergency-contact notification services.
- FastAPI routers, SQLAlchemy models, migrations, or backend database schemas.

The attached report's descriptions of those systems may belong to another repository or backend project, but they cannot be verified from this folder and are not part of this dashboard implementation.

## 16. Mock Hospitals and Demo Data

| Hospital | ID | Email | Password | Location |
|---|---|---|---|---|
| CityCare Hospital | `HSP-001` | `citycare@lifelink.demo` | `CityCare@123` | Juhu, Mumbai |
| Metro General Hospital | `HSP-002` | `metro@lifelink.demo` | `Metro@123` | Sion, Mumbai |
| Lifeline Medical Centre | `HSP-003` | `lifeline@lifelink.demo` | `Lifeline@123` | Powai, Mumbai |
| Harbourview Emergency Hospital | `HSP-004` | `harbourview@lifelink.demo` | `Harbour@123` | Colaba, Mumbai |

The mock data includes hospital-specific emergencies, doctors, ambulances, bed capacity, activity series, routes, priority scores, and patient handoffs. These values are simulated and must not be treated as live capacity or clinical data.

## 17. Environment and Local Setup

Requirements:

- Node.js 20 or newer is recommended.
- npm.
- A modern browser.
- Internet access for map tiles and the public OSRM demo service.

Commands:

```bash
npm install
npm run dev
npm run build
npm test
npm run preview
```

The normal demo runs without a backend or `.env` file. The production build is written to `dist/`.

## 18. Verification and Test Coverage

`npm test` runs:

1. `tests/verify.mjs`: mock login for all demo hospitals, tenant isolation, bed validation, doctor and ambulance CRUD, assignment, lifecycle progression, resource release, registration, duplicate rejection, password handling, persistence, and reset behavior.
2. `tests/api-contract.mjs`: mocked API login, authorization header, registration path, resource verbs, encoded resource IDs, and principal-scoped path checks.

The API contract test uses a mocked fetch and does not prove that a live FastAPI server implements the proposed endpoints. Browser-level verification is documented separately in `docs/verification.md`.

## 19. Known Limitations and Risks

- Mock authentication and browser storage are not production-secure authentication.
- Mock cases, resources, metrics, capacity, patient handoffs, and ambulance movement are simulated.
- API endpoint names and response shapes are provisional until confirmed with the backend team.
- API adapter fallbacks can make a failed backend mutation appear locally successful; production integration should return authoritative errors instead.
- There is no live SOS event stream; the current queue refresh mechanism is polling.
- OSRM is public, approximate, rate-limited, and not live emergency navigation.
- The dashboard does not provide live ambulance GPS.
- Allocation ETA and OSRM route ETA are separate concepts.
- AI priority supports operations and does not replace clinical judgment.
- The application does not contain the backend security, database, notification, voice, or AI implementation described in the attached report.

## 20. Source Files and Ownership Map

| Area | Main source locations |
|---|---|
| Routes and shell | `src/App.tsx`, `src/components/layout/` |
| Auth context and services | `src/context/AuthContext.tsx`, `src/services/authService.ts`, `src/services/tokenStore.ts` |
| Domain types | `src/types/index.ts` |
| Provider contracts | `src/providers/contracts.ts` |
| Mock behavior | `src/providers/mock/mockProviders.ts`, `src/services/mockStore.ts`, `src/data/mockData.ts` |
| API adapter | `src/providers/api/apiProviders.ts`, `src/services/httpClient.ts` |
| Emergency operations | `src/pages/`, `src/services/emergencyService.ts`, `src/components/emergencies/` |
| Resources | `src/pages/Resources.tsx`, `src/services/resourceService.ts`, `src/components/resources/` |
| Maps and routing | `src/components/maps/`, `src/services/routing.ts`, `src/utils/map.ts` |
| Integration proposal | `docs/backend-integration.md` |
| Verification notes | `docs/verification.md`, `tests/` |

## Conclusion

This folder is a functioning hospital-facing React web dashboard for a simulated multi-hospital emergency workflow, with a clean provider/service boundary for future FastAPI integration. The attached report describes a broader and materially different React Native plus backend system. The report above is the corrected repository-specific version: it documents what is implemented, what is mocked, what is provisional, and which backend capabilities are outside this folder.