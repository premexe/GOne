# LifeLink AI+ Multi-Hospital Dashboard

LifeLink is a multi-hospital emergency-response platform. This repository contains the **hospital-facing React web client**: the operational console used by an authenticated hospital to review allocated emergency requests, accept or reject them, assign its resources, follow road routes, and progress accepted cases.

Phase 4 intentionally preserves the approved Phase 3 interface. Its main change is internal: pages now depend on stable application services backed by either mock providers or future FastAPI providers.

```text
GOne Citizen App
       ↓
FastAPI Backend
       ↓
AI / Hospital Matching
       ↓
Hospital Dashboard (this repository)
```

The frontend does **not** create SOS incidents or choose hospitals. The backend/allocation layer will tell the authenticated dashboard which emergencies it is allowed to receive.

## Current Phase 4 functionality

- Four mock hospital accounts with protected, persisted sessions
- Hospital-specific dashboard, emergencies, ambulances, doctors, beds, ICU capacity, and maps
- New Emergencies queue for pending allocated requests
- Ongoing Cases queue for accepted operational cases
- Accept/reject flow with rejection reason
- Ambulance and doctor assignment with availability validation
- Workflow progression: `ACCEPTED → AMBULANCE_ASSIGNED → EN_ROUTE → PATIENT_PICKED_UP → ARRIVED → COMPLETED`
- Completed-case removal, dashboard metric updates, and resource release
- Mock workflow persistence across refresh and demo-data reset
- Leaflet + OpenStreetMap map with hospital, patient, and simulated ambulance markers
- OSRM road-following routes, approximate route distance/ETA, and graceful dashed fallback
- Responsive existing LifeLink interface, action feedback, empty states, and API-ready loading/error states
- Provider/service architecture for later FastAPI integration
- Central HTTP client and normalized API error support
- Additive integration-ready domain fields for SOS state, allocation metadata, patient handoff, timestamps, and availability freshness

## Data architecture

```text
React pages and components
          ↓
Application services
          ↓
Selected provider set
       ↙             ↘
Mock providers     API providers
       ↓             ↓
Phase 3 demo data  Central HTTP client
                     ↓
                 FastAPI (Phase 5)
```

Key folders:

- `src/services/` — stable application services, HTTP client, token abstraction, routing, and status mapper
- `src/providers/mock/` — current complete Phase 3 demo behavior
- `src/providers/api/` — proposed FastAPI adapter seams; endpoints must be confirmed in Phase 5
- `src/providers/contracts.ts` — provider interfaces used by both modes
- `src/types/` — UI domain types plus optional integration-ready fields
- `docs/backend-integration.md` — proposed backend contract and Phase 5 handoff checklist

The existing `src/services/api.ts` remains as a compatibility facade, so the approved pages did not need a visual rewrite.

## Requirements

- Node.js 20 or newer recommended
- npm (included with Node.js)
- A modern browser
- Internet access for OpenStreetMap tiles and the public OSRM demo route service

## Run locally in mock mode

No backend and no `.env` file are required for the normal demo.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

To create an explicit local environment file, copy `.env.example` to `.env`. Keep `VITE_DATA_MODE=mock`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DATA_MODE` | `mock` | Selects `mock` or the prepared `api` provider set |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Proposed FastAPI base URL; used only in API mode |
| `VITE_OSRM_BASE_URL` | `https://router.project-osrm.org` | Existing Phase 3 road-routing provider |

Example:

```env
VITE_DATA_MODE=mock
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_OSRM_BASE_URL=https://router.project-osrm.org
```

Do not enable `VITE_DATA_MODE=api` until the backend contract and endpoint paths have been confirmed. The API adapter routes are clearly marked as Phase 5 proposals.

## Demo hospital accounts

These are mock credentials only.

| Hospital | Hospital ID | Email | Password |
|---|---|---|---|
| CityCare Hospital | HSP-001 | `citycare@lifelink.demo` | `CityCare@123` |
| Metro General Hospital | HSP-002 | `metro@lifelink.demo` | `Metro@123` |
| Lifeline Medical Centre | HSP-003 | `lifeline@lifelink.demo` | `Lifeline@123` |
| Harbourview Emergency Hospital | HSP-004 | `harbourview@lifelink.demo` | `Harbour@123` |

Each account sees different hospital-specific emergencies, resources, capacity, operational metrics, and hospital coordinates.

## Application routes

| Route | Purpose |
|---|---|
| `/login` | Mock hospital sign-in |
| `/dashboard` | Hospital-specific overview |
| `/new-emergencies` | Pending allocated emergency requests |
| `/ongoing-cases` | Accepted active hospital responses |
| `/emergencies/:id` | Hospital-scoped emergency details and workflow |
| `/resources` | Hospital-specific ambulance, doctor, bed, and ICU availability |

Protected routes redirect unauthenticated users to `/login`.

## Build and preview

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Demo workflow

1. Sign in as CityCare Hospital.
2. Open **New Emergencies** and select `EMG-1043`.
3. Review the emergency handoff, patient location, hospital location, and OSRM route.
4. Accept the case; it moves from New Emergencies to Ongoing Cases.
5. Assign an available ambulance and doctor.
6. Progress through En Route, Patient Picked Up, Arrived, and Completed.
7. Confirm the case leaves Ongoing Cases and assigned resources are released.
8. Refresh during the workflow to confirm mock state persists.
9. Use **Reset Demo Data** in the sidebar to restore the initial state.
10. Log out and sign in as another hospital to verify hospital isolation.

## Map and ETA notes

The dashboard keeps the Phase 3 mapping stack:

- Leaflet / React Leaflet
- OpenStreetMap tiles
- public OSRM-compatible demo routing

If OSRM is unavailable, the map and markers still render and the route falls back to a dashed approximate line. Route/ETA information is prototype routing data, not live traffic, certified navigation, or live ambulance GPS. Ambulance marker movement is state-based mock tracking.

Future allocation ETA and dashboard OSRM ETA are separate concepts. The domain model supports both so one source does not overwrite the other.

## Integration responsibility boundaries

- GOne owns citizen interaction, SOS activation, emergency wallet, citizen permissions, and citizen-facing tracking.
- FastAPI owns authentication/authorization, SOS creation, allocation/orchestration, persistence, audit state, notifications, idempotency, and authoritative lifecycle state.
- The AI/allocation layer owns hospital matching/recommendation calculations.
- This dashboard owns hospital review/actions and renders the authoritative state returned by its service provider.

The dashboard never communicates directly with the citizen app.

## Backend integration contract

See [docs/backend-integration.md](docs/backend-integration.md) for:

- functional auth, hospital, resource, and emergency operations
- proposed JSON examples
- frontend-to-backend field mappings
- global SOS vs hospital workflow ownership
- shared identifiers and ISO timestamp expectations
- privacy and availability-freshness requirements
- the exact Phase 5 checklist to send to the backend teammate

## Current limitations

- Mock hospital login is not production authentication.
- Mock sessions and workflow data use browser storage for demonstration; localStorage is not production-secure authentication or authoritative persistence.
- Mock emergencies, capacities, availability, metrics, patient handoffs, and ambulance movement are simulated.
- Mock capacity is not verified live hospital capacity.
- The public OSRM service can be unavailable or rate-limited, and its ETA is approximate.
- The map does not represent live ambulance GPS or live emergency traffic/navigation.
- Allocation fields are optional integration-ready placeholders unless supplied by the real backend.
- API provider endpoints and token/session handling are proposed seams pending the backend contract.
- No polling, SSE, or WebSocket feed is enabled in Phase 4.
- Real FastAPI integration, authoritative authorization, DTO mapping, and concurrency rules belong to Phase 5.
- The production bundle emits a non-blocking size advisory; this does not prevent build or local use.

## Technology

React, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons, Recharts, Leaflet, React Leaflet, OpenStreetMap, and OSRM.

## Phase 5 — Resource management and hospital registration

This package extends the Phase 4 dashboard without replacing its visual system.
Use the original demo accounts above. Run `npm ci` then `npm run dev`.

- Resources now supports bed editing and doctor/ambulance CRUD with confirmation.
- Overview puts pending emergencies first and derives availability from Resources.
- Login links to `/signup`; new hospitals remain pending and do not get demo access.
- Passwords entered at signup are never persisted by mock mode.
- General beds start at zero (Phase 4 had no general-bed baseline).
- Reset demo data resets cases/resources AND clears pending demo applications.

Tests: `node tests/verify.mjs` and `node tests/api-contract.mjs`.
See `docs/backend-integration.md` for the new provisional contract, and
`docs/verification.md` for completed checks and the browser testing limitation.
