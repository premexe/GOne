# GOne (LifeLink AI) Implementation Plan

## 1. Purpose and outcomes

GOne is a mobile emergency-health companion. It helps a person maintain an offline emergency wallet, store medical records, find suitable nearby hospitals, and trigger an SOS workflow that shares critical information with trusted contacts and responders.

The production release should provide:

- Secure account access and protected health data.
- A reliable, offline-readable emergency wallet and QR handoff.
- Medical-record upload, retrieval, OCR, and clinically safe summaries.
- Location-aware hospital discovery and explainable facility matching.
- A dependable SOS workflow with consent, emergency contacts, notifications, and status tracking.
- A maintainable Expo mobile app backed by a documented, tested FastAPI API.

## 2. Current implementation baseline

### Client

- Expo Router / React Native application in `frontend/`.
- Zustand state stores for authentication, wallet/profile, records, hospitals, and emergencies.
- Screens already exist for login, dashboard, wallet, profile, records, hospitals, readiness, education, and SOS.
- `AsyncStorage` persists an offline wallet cache.
- Hospital ranking, readiness scoring, triage, and document summaries are currently local heuristics.
- `src/services/api.ts` is an in-memory mock API, so most screens are not connected to the FastAPI backend.

### Server

- FastAPI application in `backend/` with SQLAlchemy, JWT/password utilities, and PostgreSQL configuration through `DATABASE_URL`.
- Existing modules cover users, emergency wallets, SOS, emergency contacts, emergency responses, notifications, orchestration, and medical records.
- Medical-record files are stored locally under `backend/uploads/medical_records`; OCR endpoints are present.
- The API currently creates tables at application startup and has no migration, deployment, observability, test, or environment-template setup.

### Primary delivery gap

The main work is to replace client mocks with authenticated API integration, close authorization and reliability gaps in the server, and make the emergency workflow safe to operate in production.

## 3. Target architecture

```text
Expo mobile app
  ├─ Secure token storage and offline wallet cache
  ├─ API client, typed feature services, Zustand stores
  └─ Location, biometrics, camera/document picker, QR presentation
          │ HTTPS
          ▼
FastAPI API
  ├─ Auth and authorization
  ├─ User, wallet, record, contact, SOS, notification services
  ├─ Hospital search/matching and readiness services
  └─ Background jobs for OCR and delivery retries
          │
          ├─ PostgreSQL (transactional data)
          ├─ Private object storage (medical files)
          ├─ Notification provider (SMS/push/email)
          └─ Maps/places and optional AI providers
```

## 4. Scope by feature

| Area | Production behavior | Main implementation work |
| --- | --- | --- |
| Authentication | Register, login, token refresh/logout, biometrics as local re-authentication | Secure JWT flow, refresh-token handling, device token storage, session expiry UX |
| Profile and wallet | Maintain blood group, allergies, medications, conditions, notes, contacts, and a responder-safe QR view | Align client and API models; sync/cache rules; validation; minimal QR payload and consent |
| Medical records | Upload, list, view/download, OCR and summaries | Private object storage, MIME/size validation, async OCR, record status and error handling |
| Readiness | Show an explainable preparedness score and actionable missing items | Move scoring to a versioned shared/server rule set and return score details/history |
| Hospitals | Discover nearby facilities and rank suitable options | Provider integration, facility/availability data model, location permissions, ranking and explanations |
| SOS | Confirm emergency, send location/wallet and notify contacts, match a facility, show live status | Idempotent orchestration, delivery tracking, background workers, clear failure/retry states |
| Learn | Curated, reviewed safety content | CMS/static content source, metadata, versioning, clinical review |

## 5. Data and API contract plan

### 5.1 Normalize the domain model

Keep the existing server entities and add or refine these concepts:

- `users`: identity, contact details, consent flags, account status, timestamps.
- `emergency_wallets`: blood group, allergies, medications, conditions, notes, and version.
- `emergency_contacts`: contact details, verification state, priority, and notification consent.
- `medical_records`: metadata, object-storage key, processing status, OCR text, summary, timestamps.
- `emergency_responses` / `sos`: symptoms, urgency, current location, match, lifecycle, idempotency key, and audit data.
- `notifications`: recipient, channel, delivery provider ID, state, attempt count, and error reason.
- `hospitals` and availability snapshots: provider identifier, coordinates, services, verified attributes, and freshness.
- `readiness_snapshots`: score, rule-set version, explanation, and computed time.
- `audit_events`: access to protected data, SOS activity, consent changes, and administrative actions.

Use UUIDs externally (or consistently map the existing integer IDs) and ISO 8601 UTC timestamps. Define enums for record type, OCR status, urgency, SOS status, and notification state. Add database constraints, indexes for `user_id`, SOS status/time, and geospatial/provider lookups, and a migration for every schema change.

### 5.2 Establish API conventions

- Version public routes under `/api/v1` and expose OpenAPI documentation only as appropriate for each environment.
- Require an access token for every personal-data route; never trust a user ID supplied in the route without comparing it to the authenticated principal.
- Return a consistent error shape (`code`, `message`, `details`, `request_id`) and pagination envelope.
- Use multipart upload endpoints for record files; use pre-signed upload/download URLs when object storage is adopted.
- Accept an `Idempotency-Key` for SOS creation and other externally triggered actions.
- Generate TypeScript API types from OpenAPI or maintain a single contract package to prevent client/server drift.

### 5.3 Complete feature endpoints

Retain and harden the existing route families (`/users`, `/wallet`, `/medical-records`, `/sos`, `/emergency-contacts`, `/emergency-response`, `/notifications`, `/emergency`). Add the missing contract surface:

- `GET/PATCH /me`, registration, login, refresh, logout, and account deletion.
- `GET/PATCH /me/wallet` and contact CRUD scoped to the authenticated user.
- Record upload, list, metadata retrieval, controlled download, processing status, and delete/archive.
- `GET /hospitals/nearby` with latitude, longitude, required capability, radius, and freshness filters.
- `POST /sos` to create an emergency operation and `GET /sos/{id}` for its timeline; support cancellation only before dispatch and only with an auditable reason.
- `GET /readiness` and `GET /readiness/history`.
- `GET /safety-tips` and item details.
- A narrow, expiring responder handoff endpoint only if the QR use case requires online access. Do not encode full medical data or long-lived credentials in a QR code.

## 6. Implementation phases

### Phase 0 — Project foundations

1. Create `README` setup instructions, architecture notes, `.env.example` files, and a local Docker Compose environment for API, PostgreSQL, and optional worker services.
2. Replace `Base.metadata.create_all()` with Alembic migrations and a controlled startup/lifespan routine.
3. Add application configuration for environment, CORS, database, JWT keys/TTLs, object storage, notification and maps providers. Fail fast for required production secrets.
4. Add structured logging, request IDs, health (`/healthz`) and readiness (`/readyz`) checks, and non-sensitive error reporting.
5. Decide and document data retention, deletion, consent, and incident-response requirements before handling real health data.

**Exit criteria:** a new developer can start the full local stack from documentation; migrations apply cleanly; CI can run lint, type checks, and tests.

### Phase 1 — Security and identity

1. Review all current routers for ownership checks. In particular, protect user update/delete and any list endpoint that reveals another user's data.
2. Implement password policy, registration, login, short-lived access tokens, refresh-token rotation/revocation, and logout.
3. Store mobile tokens in platform-secure storage; use `expo-local-authentication` only to unlock an existing local session, never as backend identity by itself.
4. Add rate limits and anti-enumeration behavior to login, registration, password-reset, and SOS endpoints.
5. Enforce HTTPS, restrictive CORS, secure headers, secret rotation, dependency scanning, and audit logging.

**Exit criteria:** protected endpoints reject anonymous and cross-user access; authentication tests cover expiry, refresh, and revocation.

### Phase 2 — Client/API integration

1. Replace `frontend/src/services/api.ts` mock state with an HTTP client that sets the base URL by Expo environment, attaches tokens, handles refresh once, and maps errors to user-safe messages.
2. Split the client API into typed auth, wallet, records, contacts, hospitals, SOS, readiness, and content modules.
3. Update Zustand stores to load, mutate, refresh, and expose error/empty/offline states from those modules.
4. Add React Query (or a deliberate equivalent) for request caching, retries, invalidation, and mutation state; keep Zustand for UI/session state.
5. Build a development-only seed account/data flow rather than shipping mock records in production builds.

**Exit criteria:** every existing main screen reads and writes the API; mock service data is not reachable in production.

### Phase 3 — Emergency wallet and contacts

1. Align the frontend `EmergencyProfile` with the server wallet/contact schemas and support arrays consistently (structured JSON/related tables rather than lossy strings).
2. Validate medical fields and Indian/international phone numbers as product requirements dictate; normalize but preserve display formatting.
3. Make the local wallet cache encrypted where platform support permits, versioned, TTL-aware, and refreshed after server mutations.
4. Generate a minimal QR payload: version, opaque short-lived handoff ID or explicitly consented essential fields, checksum/signature, and no access token.
5. Add wallet completeness indicators, edit history if required, contact verification, and consent copy explaining emergency sharing.

**Exit criteria:** the wallet works without connectivity from the last valid local cache, and a QR code cannot disclose data beyond the user’s explicit sharing choice.

### Phase 4 — Medical records and AI assistance

1. Replace local file persistence with encrypted private object storage; retain only storage keys and metadata in PostgreSQL.
2. Restrict supported types, inspect file signatures, set upload limits, malware-scan uploads, and prevent public bucket access/path traversal.
3. Move OCR to a worker queue; represent `queued`, `processing`, `completed`, and `failed` states and allow safe retry.
4. Add a provider abstraction for OCR and any clinical-summary model. Summaries must be clearly labelled as informational, preserve source traceability, include confidence/limitations, and never make emergency diagnoses.
5. Let users correct or remove extracted data; do not automatically overwrite their wallet from OCR output.

**Exit criteria:** record upload/retrieval is authorized and resilient, and OCR/summaries have visible status and safe failure behavior.

### Phase 5 — Hospitals, readiness, and education

1. Select a licensed maps/places and routing provider; obtain user location only with contextual permission and a manual-location fallback.
2. Define the source and freshness SLA for specialty and bed/ICU availability. Do not present inferred availability as real-time verified capacity.
3. Run hospital ranking on the server with distance, travel time, capability, availability freshness, and urgency. Return ranked reasons and source timestamps.
4. Move readiness calculation to a versioned backend service, return the missing fields/rules, and persist snapshots for charts.
5. Move safety tips to a reviewed content source and include author/reviewer, review date, locale, and emergency disclaimer.

**Exit criteria:** rankings are reproducible and transparent; all health content has an identifiable review process.

### Phase 6 — SOS orchestration and notifications

1. Design the SOS state machine: `created → location_acquired → triaged → contacts_notified → facility_matched → dispatched/en_route → arrived → closed`, plus recoverable `failed` states.
2. Create one transactional SOS operation using an idempotency key; record every attempted notification and matching action.
3. Obtain precise location only with consent, show its accuracy/timestamp, and allow an address/manual fallback. Do not block a critical SOS solely because location fails.
4. Send notifications through a provider adapter with retries, delivery callbacks, opt-out rules, and a safe contact message containing only necessary data.
5. Replace simulated timeline advancement in the client with polling, server-sent events, or WebSockets. Show exact confirmed versus pending states; never simulate dispatch or responder arrival as fact.
6. Add an emergency-call action appropriate to the deployment region and prominent copy that the app does not replace local emergency services.

**Exit criteria:** repeated taps do not create duplicate incidents, failures are visible/actionable, and the timeline reflects server-confirmed events.

### Phase 7 — Quality, release, and operations

1. Add backend unit/service tests, API integration tests against PostgreSQL, migration tests, authorization tests, and contract tests.
2. Add frontend unit tests for stores/services and end-to-end tests for login, wallet offline mode, upload, and SOS confirmation/failure paths.
3. Configure linting, formatting, TypeScript strict mode, Python type/lint checks, dependency/security scans, and CI quality gates.
4. Build staging and production environments with separate credentials, encrypted backups, rollback procedures, monitoring, alerts, and on-call ownership.
5. Complete accessibility, localization, privacy, legal, and clinical review; perform a penetration test before any real-user release.
6. Run a limited pilot with synthetic/test emergency routing unless response partners and operational agreements are in place.

**Exit criteria:** release checklist, tested rollback, monitoring dashboards, privacy/security approvals, and a successful staging rehearsal are complete.

## 7. Frontend work breakdown

- Add app bootstrap that restores secure session, hydrates the offline wallet, and routes unauthenticated users to login.
- Replace guest/mock login with registration/login and explicit guest/demo mode only in development.
- Add loading, retry, error, empty, permission-denied, and offline variants for every data screen.
- Use document and image pickers to select files, submit multipart/pre-signed uploads, display processing state, and open authorized downloads.
- Integrate `expo-location` with permission rationale, accuracy and freshness display, and manual entry fallback.
- Protect private views when the app backgrounds; add biometric re-authentication based on a user setting.
- Ensure touch targets, screen-reader labels, dynamic text, color contrast, and no-color-only status indicators across the emergency flow.
- Keep the emergency wallet locally usable even when server calls, maps, or notification providers are unavailable.

## 8. Backend work breakdown

- Create a settings module, FastAPI lifespan, CORS policy, global exception handlers, and structured response/error middleware.
- Add Alembic, repositories/services with transaction boundaries, and database seed fixtures for development/test only.
- Audit existing password/JWT code for algorithm, issuer/audience, lifetime, and secret handling; add refresh token persistence/revocation.
- Apply authorization dependencies consistently to every user-scoped route; remove or restrict broad user-list access.
- Implement a background worker/queue for OCR, notification retries, readiness snapshots, and hospital data refreshes.
- Add provider interfaces and fake adapters for notifications, maps, OCR, and AI so integration tests do not call external services.
- Store files outside the repository and serve them only through authorization checks or expiring signed URLs.
- Capture audited security events without logging medical content, tokens, passwords, raw file contents, or precise locations unnecessarily.

## 9. Testing matrix

| Scenario | Required checks |
| --- | --- |
| Auth | invalid credentials, rate limits, expired/revoked token, refresh rotation, cross-account access denial |
| Wallet | validation, offline cache restore, sync conflict, QR payload expiration/minimization |
| Records | allowed/blocked file types, size limits, ownership, upload failure, OCR lifecycle, authorized download |
| Hospital | denied location, stale availability, manual location, deterministic ranking and reason text |
| SOS | double tap/idempotency, missing location, no contacts, provider timeout, retry, state transitions, cancellation rules |
| Accessibility | screen reader, large text, contrast, keyboard/web navigation where supported |
| Reliability | API restart, worker retry, database migration/rollback, degraded external provider |
| Security | authorization matrix, input validation, injection/path traversal, secret leakage, dependency scan |

## 10. Delivery order and milestones

1. **Foundation:** configuration, migrations, local stack, CI, logging, health checks.
2. **Secure core:** identity, authorization review, typed API client, user/profile/wallet synchronization.
3. **Records:** secure storage, upload/retrieval, async OCR, safe summary presentation.
4. **Decision support:** hospitals, readiness, reviewed learning content.
5. **SOS beta:** idempotent orchestration, contacts, notification provider, real status updates, operational rehearsal.
6. **Release readiness:** full test matrix, security/privacy/clinical review, staging load/failure tests, pilot.

Each milestone should end with a demo against staging, automated tests passing, acceptance criteria signed off, and updated API/operational documentation.

## 11. Key risks and decisions to resolve early

- **Emergency-service scope:** confirm whether the product only informs personal contacts or has formal responder/hospital partnerships. Do not claim dispatch without an operational agreement.
- **Healthcare compliance:** identify target jurisdictions and obligations (consent, data residency, retention, breach process, deletion rights) before production data collection.
- **Medical AI:** select a reviewed use case, provider, human-review policy, and safety evaluation. AI output must not substitute professional or emergency advice.
- **Hospital capacity:** use a licensed/verified source and show data freshness; otherwise label capacity information as unavailable or estimated.
- **Offline data:** choose the exact fields retained on device, encryption approach, cache expiry, and behavior after logout/device compromise.
- **Notifications:** verify contact consent, regional SMS rules, provider reliability, pricing, delivery receipts, and fallback channels.
- **Hosting:** choose region, backups, key management, object storage, worker platform, and observability budget.

## 12. Definition of done

A production feature is complete only when it has a documented API contract; input and authorization controls; loading/error/offline UX; automated tests; accessibility review; logs/metrics without sensitive data; deployment and rollback instructions; and product, privacy, and safety sign-off where it handles health or emergency data.
