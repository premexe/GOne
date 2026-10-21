# Proposed Hospital Dashboard API Contract

> **Status:** Phase 4 integration proposal. These endpoint names and JSON shapes do not claim that the FastAPI backend already implements them. Confirm and version the final contract with the backend and allocation teams before enabling `VITE_DATA_MODE=api`.

## 1. Purpose and system boundary

This document defines what the LifeLink hospital-facing web client needs from the backend. The dashboard consumes emergencies already allocated to its authenticated hospital. It does not create citizen SOS incidents, rank hospitals, choose replacement hospitals, send citizen notifications, or persist authoritative lifecycle state.

```text
GOne Citizen App → FastAPI Backend → AI / Hospital Matching → Hospital Dashboard
```

The frontend's current `hospitalId` parameter exists only to isolate local mock data. In API mode the authenticated backend must derive the hospital principal from the session/token. It must not trust `?hospitalId=...` for authorization.

## 2. General conventions

- Base path: proposed `/api/v1`
- Payload format: JSON
- Resource identifiers: stable opaque strings; UUID-compatible strings are preferred
- Timestamps: ISO 8601 with timezone, ideally UTC (`2026-08-31T10:15:30Z`)
- Enums: explicit, documented, and validated server-side
- Authorization: authenticated hospital principal; return only permitted hospital data
- State ownership: the server validates, persists, and returns authoritative state
- Mutation safety: reject duplicate or invalid transitions consistently; the UI disables a pending action but does not implement server idempotency
- Privacy: emergency handoff data only, not a citizen's full account or full record history

## 3. Functional operations

The URLs below are proposed examples. The functional requirements are the contract that matters.

| Function | Proposed operation | Purpose |
|---|---|---|
| Hospital login | `POST /auth/hospital/login` | Authenticate an authorized hospital account |
| Hospital logout | `POST /auth/logout` | End/revoke the current session where applicable |
| Current session | `GET /auth/session` | Return session and current hospital identity |
| Current hospital | `GET /hospital` | Return profile, location, capabilities, and capacity freshness |
| Hospital metrics | `GET /hospital/metrics` | Return hospital-scoped operational metrics |
| Hospital activity | `GET /hospital/activity` | Return dashboard activity series |
| New emergencies | `GET /hospital/emergencies/new` | Return allocated requests awaiting a decision |
| Ongoing emergencies | `GET /hospital/emergencies/ongoing` | Return accepted active cases |
| Emergency detail | `GET /hospital/emergencies/{emergency_id}` | Return one authorized emergency handoff |
| Accept | `POST /hospital/emergencies/{emergency_id}/accept` | Persist the hospital's acceptance and return updated state |
| Reject | `POST /hospital/emergencies/{emergency_id}/reject` | Persist reason; backend may orchestrate reallocation |
| Ambulance assignment | `POST /hospital/emergencies/{emergency_id}/ambulance-assignment` | Validate and confirm a hospital ambulance assignment |
| Doctor assignment | `POST /hospital/emergencies/{emergency_id}/doctor-assignment` | Validate and confirm a clinician assignment |
| Status update | `PATCH /hospital/emergencies/{emergency_id}/status` | Validate a hospital operational transition |
| Timeline | `GET /hospital/emergencies/{emergency_id}/timeline` | Return server audit/lifecycle events |
| Ambulances | `GET /hospital/resources/ambulances` | Return only the authenticated hospital's fleet |
| Doctors | `GET /hospital/resources/doctors` | Return only the authenticated hospital's clinicians |

The provider adapters in `src/providers/api` centralize these proposed routes. Phase 5 should change adapters—not pages—when the backend team finalizes URLs.

## 4. Authentication and session expectations

The client needs login, logout, current-session restoration, current hospital identity, token/session expiration, and a clear unauthorized response. The exact production strategy—HTTP-only cookies, access tokens, refresh flow, CSRF protection, and token storage—must be decided with the backend team.

Phase 4's API adapter has a provisional session-token abstraction. `sessionStorage` is not presented as production-secure authentication. Mock login continues using local demo storage.

## 5. State ownership

| Event | Owner |
|---|---|
| SOS creation | Citizen app / backend |
| Location acquisition | Citizen app / backend |
| Triage | Backend |
| Hospital matching | Backend / AI allocation layer |
| Hospital allocation | Backend / AI allocation layer |
| Hospital notification | Backend |
| Accept / Reject decision | Hospital action, validated and persisted by backend |
| Ambulance assignment | Hospital action, validated and persisted by backend |
| Doctor assignment | Hospital action, validated and persisted by backend |
| Operational status update | Hospital action, validated and persisted by backend |
| Emergency persistence | Backend |
| Citizen notification | Backend |
| Final case state | Backend |

On rejection the dashboard must not select another hospital. The backend/orchestration layer decides whether and where to reallocate.

## 6. Global SOS vs hospital operational status

These are different state machines. Do not replace one with the other.

| Global/citizen lifecycle (backend-owned) | Related hospital operational context | Notes |
|---|---|---|
| `created` | None yet | SOS exists before allocation |
| `location_acquired` | None yet | Location came from citizen/backend, not hospital browser GPS |
| `triaged` | None yet | Severity/triage belongs to backend logic |
| `contacts_notified` | None required | Citizen communication is backend-owned |
| `facility_matched` | `RECEIVED`, `UNDER_REVIEW`, `ACCEPTED` | Hospital has been notified/allocated |
| `dispatched` | `AMBULANCE_ASSIGNED` | Indicative mapping only |
| `en_route` | `EN_ROUTE`, `PATIENT_PICKED_UP` | Backend decides the final mapping |
| `arrived` | `ARRIVED` | Hospital arrival is recorded |
| `closed` | `COMPLETED` | Final authoritative state is server-owned |

The UI keeps its existing visible workflow:

`RECEIVED → ACCEPTED / REJECTED → AMBULANCE_ASSIGNED → EN_ROUTE → PATIENT_PICKED_UP → ARRIVED → COMPLETED`

`src/services/statusMapper.ts` is a deliberately small provisional translation seam. Final backend enums may be changed there without renaming the hospital UI.

## 7. Shared identifiers

The projects should agree on opaque stable string IDs:

- `user_id`
- `patient_id`
- `sos_id`
- `emergency_id`
- `hospital_id`
- `provider_id`
- `ambulance_id`
- `doctor_id`
- `notification_id`
- `timeline_event_id`

Frontend code must not assume identifiers are sequential integers.

## 8. Timestamps and freshness

Relevant server timestamps include `created_at`, `updated_at`, `allocated_at`, `accepted_at`, `assigned_at`, `completed_at`, `captured_at`, and `availability_updated_at`. They must be ISO 8601 values. In API mode the frontend displays server times; it does not generate authoritative emergency times.

Availability should include:

- value/count
- `availability_updated_at`
- `availability_source`
- verification status such as `verified`, `unverified`, or `stale`

Mock values must never be represented as live verified hospital capacity.

## 9. Contract examples

All examples are proposals for discussion, not existing endpoint guarantees.

### 9.1 Hospital

```json
{
  "id": "HSP-001",
  "provider_id": "provider_9c7f",
  "name": "CityCare Hospital",
  "email": "operations@citycare.example",
  "status": "connected",
  "address": {
    "line": "Juhu Scheme",
    "city": "Mumbai",
    "region": "Maharashtra"
  },
  "coordinates": { "latitude": 19.1192, "longitude": 72.8465 },
  "capabilities": ["emergency", "icu", "cardiology"],
  "specialities": ["Emergency Medicine", "Cardiology"],
  "capacity": {
    "beds": { "available": 12, "total": 20 },
    "icu_beds": { "available": 4, "total": 8 },
    "availability_updated_at": "2026-08-31T10:14:00Z",
    "availability_source": "hospital_system",
    "verification_status": "verified"
  }
}
```

### 9.2 Emergency allocated to a hospital

```json
{
  "id": "emg_01J8Y7G5K8",
  "sos_id": "sos_01J8Y7FZZ1",
  "allocated_hospital_id": "HSP-001",
  "allocation_status": "notified",
  "request_status": "pending",
  "workflow_status": "received",
  "emergency_type": "Cardiac Emergency",
  "symptoms": ["chest pain", "shortness of breath"],
  "urgency": "immediate",
  "severity": "critical",
  "created_at": "2026-08-31T10:15:30Z",
  "allocated_at": "2026-08-31T10:16:04Z",
  "location": {
    "latitude": 19.1136,
    "longitude": 72.8697,
    "accuracy_meters": 18,
    "captured_at": "2026-08-31T10:15:28Z",
    "source": "citizen_device",
    "address": "Andheri East, Mumbai, Maharashtra"
  },
  "patient_handoff": { "patient_id": "patient_7dc1", "display_name": "Rahul Sharma" }
}
```

### 9.3 Patient emergency handoff

```json
{
  "patient_id": "patient_7dc1",
  "display_name": "Rahul Sharma",
  "age": 58,
  "blood_group": "B+",
  "allergies": ["Penicillin"],
  "medications": ["Metformin"],
  "conditions": ["Hypertension", "Diabetes"],
  "critical_notes": ["Emergency handoff only"],
  "emergency_contacts": [
    { "name": "Neha Sharma", "relationship": "Spouse", "phone": "+91-00000-00000" }
  ],
  "consent_reference": "consent_sos_01J8Y7FZZ1"
}
```

Only fields permitted for the allocated hospital should be included. Do not return credentials, unrelated uploads, the citizen's full profile, or unrestricted medical history.

### 9.4 Hospital resources

```json
{
  "hospital_id": "HSP-001",
  "availability_updated_at": "2026-08-31T10:14:00Z",
  "availability_source": "hospital_system",
  "ambulances": [
    { "id": "amb_82e1", "vehicle_number": "LL-A03", "status": "available", "driver_name": "Arjun Nair" }
  ],
  "doctors": [
    { "id": "doctor_4f20", "display_name": "Dr. Aditi Mehta", "speciality": "Emergency Medicine", "status": "available", "active_case_count": 0 }
  ],
  "beds": { "available": 12, "total": 20 },
  "icu_beds": { "available": 4, "total": 8 }
}
```

### 9.5 Allocation result

```json
{
  "hospital_id": "HSP-001",
  "match_rank": 1,
  "priority_score": 94,
  "severity_score": 0.93,
  "distance_km": 4.7,
  "estimated_travel_minutes": 12,
  "capability_match": 0.98,
  "availability_score": 0.84,
  "freshness": {
    "updated_at": "2026-08-31T10:14:00Z",
    "source": "hospital_system",
    "verification_status": "verified"
  },
  "reason": ["cardiology capability", "available ICU bed"],
  "model_version": "allocation-model-to-be-confirmed",
  "allocated_at": "2026-08-31T10:16:04Z"
}
```

Allocation metadata is optional and flexible. The dashboard must not depend on speculative model fields. Allocation ETA and dashboard OSRM route ETA remain separate values.

### 9.6 Accept response

```json
{
  "emergency_id": "emg_01J8Y7G5K8",
  "hospital_decision": "accepted",
  "request_status": "accepted",
  "workflow_status": "accepted",
  "accepted_at": "2026-08-31T10:17:22Z",
  "updated_at": "2026-08-31T10:17:22Z",
  "version": 4
}
```

### 9.7 Resource assignment

```json
{
  "emergency_id": "emg_01J8Y7G5K8",
  "assignment": {
    "type": "ambulance",
    "resource_id": "amb_82e1",
    "vehicle_number": "LL-A03",
    "status": "assigned",
    "assigned_at": "2026-08-31T10:18:03Z"
  },
  "workflow_status": "ambulance_assigned",
  "updated_at": "2026-08-31T10:18:03Z",
  "version": 5
}
```

If the resource became unavailable between selection and submission, return a conflict error and the authoritative current resource state.

### 9.8 Status update

```json
{
  "emergency_id": "emg_01J8Y7G5K8",
  "previous_workflow_status": "ambulance_assigned",
  "workflow_status": "en_route",
  "global_sos_status": "en_route",
  "updated_at": "2026-08-31T10:19:10Z",
  "version": 6
}
```

### 9.9 Emergency timeline event

```json
{
  "id": "event_01J8Y8A11R",
  "emergency_id": "emg_01J8Y7G5K8",
  "type": "workflow_status_changed",
  "status": "en_route",
  "timestamp": "2026-08-31T10:19:10Z",
  "actor_type": "hospital",
  "actor_id": "HSP-001",
  "metadata": {
    "ambulance_id": "amb_82e1",
    "source": "hospital_dashboard"
  }
}
```

### 9.10 API error

```json
{
  "code": "RESOURCE_ALREADY_ASSIGNED",
  "message": "This ambulance is no longer available.",
  "details": {
    "resource_id": "amb_82e1",
    "current_status": "assigned"
  },
  "request_id": "req_01J8Y8DD92"
}
```

The central HTTP client parses this shape and retains `code`, `details`, HTTP status, and `request_id` while exposing the user-safe message to the service/UI layer.

## 10. Frontend ↔ backend field mapping

### Hospital

| Dashboard model | Expected backend field |
|---|---|
| `Hospital.id` | `id` / `hospital_id` |
| `providerId` | `provider_id` |
| `name` | `name` |
| `email` | `email` |
| `latitude`, `longitude` | `coordinates.latitude`, `coordinates.longitude` |
| `address`, `city` | `address.line`, `address.city` |
| `capabilities` | `capabilities` |
| `specialities` | `specialities` |
| `emergencyBeds` | `capacity.beds` |
| `icuBeds` | `capacity.icu_beds` |
| `availabilityUpdatedAt` | `capacity.availability_updated_at` |
| `availabilitySource` | `capacity.availability_source` |
| `availabilityVerificationStatus` | `capacity.verification_status` |

### Emergency and handoff

| Dashboard model | Expected backend field |
|---|---|
| `Emergency.id` | `id` / `emergency_id` |
| `sosId` | `sos_id` |
| `hospitalId` / `allocatedHospitalId` | `allocated_hospital_id` |
| `requestStatus` | `request_status` |
| `status` | `workflow_status` |
| `globalSosStatus` | `global_sos_status` |
| `type` | `emergency_type` |
| `symptoms` | `symptoms` |
| `urgency` | `urgency` |
| `priority.level` | `severity` / confirmed priority enum |
| `priority.score` | `priority_score` |
| `patient` | `patient_handoff` |
| `patient.id` | `patient_handoff.patient_id` |
| `patient.name` | `patient_handoff.display_name` |
| `location.accuracyMeters` | `location.accuracy_meters` |
| `location.capturedAt` | `location.captured_at` |
| `allocation` | `allocation` |
| `allocationEstimatedTravelMinutes` | `allocation.estimated_travel_minutes` |
| `routeEstimatedTravelMinutes` | Client OSRM result; do not overwrite allocation ETA |
| `assignedAmbulance.id` | `ambulance_id` / assignment resource ID |
| `assignedDoctor.id` | `doctor_id` / assignment resource ID |
| `timeline` | `timeline` / timeline endpoint |

### Resources and metrics

| Dashboard model | Expected backend field |
|---|---|
| `Ambulance.id` | `id` / `ambulance_id` |
| `Ambulance.vehicleNumber` | `vehicle_number` |
| `Ambulance.status` | `status` |
| `Doctor.id` | `id` / `doctor_id` |
| `Doctor.name` | `display_name` |
| `Doctor.specialization` | `speciality` |
| `Doctor.currentCases` | `active_case_count` |
| `DashboardStats.newEmergencies` | `new_emergencies` |
| `DashboardStats.ongoingCases` | `ongoing_cases` |
| `DashboardStats.criticalCases` | `critical_active_cases` |
| `DashboardStats.averageResponseTimeMinutes` | `average_response_time_minutes` |

Phase 5 should add explicit DTO-to-domain mappers if the backend uses snake_case. Pages should continue consuming the existing domain model.

## 11. Refresh and real-time readiness

Phase 4 provides `emergencyService.refresh(hospitalId)` as a stable refresh seam. The current mock client remains local and synchronous after simulated delays. Phase 5 may call the same service layer from manual refresh, polling, Server-Sent Events, or WebSocket invalidation after the backend team chooses a strategy. Do not place stream logic inside individual cards.

## 12. Mapping and navigation data

Patient coordinates come from the backend emergency handoff. The hospital browser must not request the patient's GPS. Hospital coordinates come from the authenticated hospital profile. The existing display route remains Leaflet + OpenStreetMap + OSRM with a dashed fallback.

Two ETA sources must remain distinguishable:

- Allocation/matching ETA: backend or allocation model estimate
- Display route ETA: dashboard OSRM estimate

Neither should be described as live traffic unless a future provider contract explicitly supports it.

## 13. Phase 5 — Real Backend Integration Checklist

Send this checklist to the backend teammate:

- [ ] Backend base URL and API version prefix
- [ ] Hospital login endpoint and request shape
- [ ] Authentication response shape
- [ ] Cookie/token, refresh, expiration, logout, and CSRF strategy
- [ ] Current-session and hospital identity shape
- [ ] Hospital profile, capacity, metrics, and freshness endpoints
- [ ] New allocated emergencies endpoint
- [ ] Ongoing emergencies endpoint
- [ ] Emergency-detail endpoint and privacy-approved handoff fields
- [ ] Accept operation and response
- [ ] Reject operation, reason rules, and response
- [ ] Ambulance listing and assignment operation
- [ ] Doctor listing and assignment operation
- [ ] Workflow status-update operation and allowed transitions
- [ ] Timeline operation and event shape
- [ ] Allocation output schema and which fields hospitals may see
- [ ] Final global SOS, request, decision, resource, and workflow enums
- [ ] Consistent API error schema and HTTP status rules
- [ ] Concurrency/version-conflict behavior
- [ ] Real-time strategy: polling, SSE, or WebSocket
- [ ] CORS configuration for the dashboard origin
- [ ] Development/staging test credentials and non-production sample data
- [ ] OpenAPI document or generated contract snapshot

---

## Version 5.x enhancement: resource management and prototype hospital onboarding

This section supersedes earlier read-only resource assumptions. Existing Phase 4
routing, emergency lifecycle, OSRM integration and four demo accounts remain.

### Implemented frontend and mock behavior

- `/resources`: general, ICU and emergency bed totals and occupied counts, computed
  availability, doctor CRUD and ambulance CRUD with status and driver fields.
- Native accessible modal editors provide Save/Cancel, disabled saving controls,
  validation and error feedback. Removal requires confirmation. Assigned resources
  cannot be removed while their case is active; status changes on active resources
  must go through the case workflow.
- `/dashboard`: pending requests appear first, sorted by the existing priority
  service. Up to three are shown with a link to the full queue. Critical/high
  pending cards and the pending navigation count have a slow attention pulse.
  Reduced-motion CSS disables that pulse.
- Dashboard availability comes from `resourceService.getResources`, in both modes.
  No new resource summary is independently hardcoded. General-bed baseline is zero
  because Phase 4 supplied no general-bed data; staff can enter the real capacity.
- `/signup`: hospital and administrator information, optional location, initial
  capacity and password confirmation. In Mock Mode, a successful submission
  automatically creates an approved hospital workspace and login account.
- New mock hospitals receive the next available `HSP-NNN` ID, zero operational
  beds, no doctors, no ambulances and no emergencies. Submitted capacity remains
  registration metadata; staff confirm live prototype data in `/resources`.
- The administrator password is stored only as a salted SHA-256 hash in browser
  mock state, never as plaintext. This is prototype persistence, not production
  authentication. Existing four demo accounts retain their original credentials.
- Mock data uses the existing `lifelink-demo-operational-state-v3` local storage
  key. Old records are migrated by filling missing hospital, account, resource
  and registration fields.
  Changes survive navigation and refresh when local storage is available. If
  browser storage is unavailable, the existing in-memory fallback applies.
- Reset demo data restores the four demo hospitals and removes locally registered
  hospital accounts, their resources and active session. Reset is hidden in API
  mode and uses an in-app confirmation dialog.

### Domain models

`src/types/index.ts` is authoritative for frontend field names.

```ts
type HospitalApprovalStatus =
  | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
interface BedResource { total: number; occupied: number; available: number }
interface HospitalResourceSummary {
  hospitalId: string;
  beds: Record<'general' | 'icu' | 'emergency', BedResource>;
  doctors: Doctor[];
  ambulances: Ambulance[];
  updatedAt: string; // ISO 8601
}
```

All three bed categories are separate capacities. `general` excludes ICU and
emergency beds. All counts are non-negative integers; occupied <= total;
available = total - occupied. Registration captures capacity only and does not
claim that all beds are free. No active resource inventory is created for a
pending hospital.

Doctor: `id`, `hospitalId`, `name`, optional `department`, `specialization`, optional
`phone`, `status` (`AVAILABLE`, `BUSY`, `OFF_DUTY`), `currentCases`. Current-case counts
and ownership are provider/backend controlled, never editable form inputs.
Emergency doctors are currently classified by “emergency” in department or
specialization; agree a canonical department code with the allocation team before
production use. All available doctors remain assignable as in Phase 4.

Ambulance: `id`, `hospitalId`, `vehicleNumber`, `driverName`, optional `driverPhone`,
`status`, existing `locationLabel` and optional `registrationNumber`. Statuses keep
Phase 4 `AVAILABLE`, `ASSIGNED`, `EN_ROUTE`, `TRANSPORTING`, `UNAVAILABLE` and add
`MAINTENANCE`, `OFFLINE`. Unassigned driver details are optional. Mock vehicle
numbers are unique within a hospital, compared case-insensitively.

Registration input: hospitalName, licenseNumber, hospitalType, address, city, state,
pinCode, emergencyPhone, hospitalEmail; optional website, latitude, longitude;
adminName, designation, adminEmail, adminPhone, password; generalBeds, icuBeds,
emergencyBeds, ambulanceCount. The response omits password and includes `id`,
`status`, `submittedAt` and, when assigned, `hospitalId`. Confirm password is
client-only and is never sent. Mock Mode returns `APPROVED`; the API may retain
`PENDING_APPROVAL` until the real backend/admin workflow is implemented.

### Provisional API contract (not an implemented backend)

The adapter retains Phase 4's authenticated `/hospital` convention rather than
introducing caller-controlled hospital ownership. New endpoint constants live in
`src/config/endpoints.ts`; existing emergency endpoints remain together in the
API provider. Adapt DTO field names and routes once FastAPI OpenAPI is final.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/auth/hospital/register` | HospitalRegistrationInput | HospitalRegistration; backend approval policy remains server-controlled |
| GET | `/hospital/resources` | — | HospitalResourceSummary |
| PATCH | `/hospital/resources` | `{ beds: { general: {total, occupied}, icu: {total, occupied}, emergency: {total, occupied} } }` | HospitalResourceSummary |
| GET | `/hospital/resources/doctors` | — | Doctor[] |
| POST | `/hospital/resources/doctors` | DoctorInput | HospitalResourceSummary |
| PATCH | `/hospital/resources/doctors/{id}` | DoctorInput | HospitalResourceSummary |
| DELETE | `/hospital/resources/doctors/{id}` | — | HospitalResourceSummary |
| GET | `/hospital/resources/ambulances` | — | Ambulance[] |
| POST | `/hospital/resources/ambulances` | AmbulanceInput | HospitalResourceSummary |
| PATCH | `/hospital/resources/ambulances/{id}` | AmbulanceInput | HospitalResourceSummary |
| DELETE | `/hospital/resources/ambulances/{id}` | — | HospitalResourceSummary |

Mutation endpoints deliberately return the FULL authoritative resource snapshot,
including DELETE (HTTP 200 JSON, not 204). The UI replaces state with that response;
it does not synthesize saved values from submitted inputs. If the final backend
uses 204 or returns an individual record, update the adapter to refetch the full
snapshot before resolving the service call. `id` path values are URL encoded.
Existing `/auth/hospital/login`, `/hospital`, metrics, activity and emergency
routes are retained; none of these paths asserts that a deployed backend exists.

### Freshness, allocation and concurrency

`updatedAt` updates on resource CRUD and mock assignment/lifecycle mutations.
The resource page displays the returned timestamp. The backend should generate
this timestamp and audit actor, and reconcile it with Phase 4
`availabilityUpdatedAt`, availability source and verification metadata. Editing
mock resources does not imply VERIFIED availability. AI allocation can consume
numeric `beds.*.available` and count AVAILABLE ambulance/doctor records; avoid
parsing display strings. The response snapshot is the UI's source of truth.

There is no multi-user synchronization or realtime subscription in this phase.
The backend should validate atomically and eventually support resource versions
or ETags with 409/412 conflict responses. Current error UI preserves the draft on
failure. Never overwrite a conflicting update merely because a client submitted it.

### Backend security and approval responsibilities

Frontend session comparisons and mock hospital scoping help prevent accidental
cross-hospital operations; LocalStorage is NOT a security boundary. The server
must derive hospital identity from the authenticated principal, authorize every
read/mutation/assignment, reject ownership fields, and filter response records.
If final routes use `/hospitals/{hospital_id}`, validate that path identity against
the token. Never grant access from a form value or cached hospital identity.

The backend must hash passwords using its production authentication system, avoid
password logging, validate organization/license uniqueness and contact ownership,
rate-limit signup/login, and enforce approval before emergency access. Approval
transitions: PENDING_APPROVAL → APPROVED or REJECTED; APPROVED → SUSPENDED;
reinstatement/reapplication policies require an authorized admin workflow.
No admin approval implementation is included here. Mock Mode bypasses manual
approval only for the frontend prototype. In API Mode, pending/rejected/suspended
accounts must not receive active hospital permissions. Backend controls staff
roles, audit trails, resource ownership, active-assignment constraints, and
transactional updates under concurrent case assignment.

### Verification

Run `npm run build`, `node tests/verify.mjs`, and `node tests/api-contract.mjs`.
See `docs/verification.md` for checks actually performed and remaining browser and
live-backend checks. Transport tests use an in-process fetch stub, not FastAPI.
