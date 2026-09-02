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

## 13. UI/UX and design system

### 13.1 Product experience principles

LifeLink AI must feel calm and readable during routine use, then become direct and unmistakable during an active emergency. The interface should:

- Prioritize the next safe action over dense information, especially in SOS flows.
- Keep health information scannable with short labels, plain language, and clear source/status indicators.
- Preserve user control: ask permission in context, explain why data is needed, and confirm high-impact actions.
- Work with poor connectivity: show cached data, last-updated time, retry actions, and clear "not yet sent" states rather than pretending an action succeeded.
- Never represent a simulated hospital match, notification, dispatcher, or ambulance status as confirmed real-world activity.

### 13.2 Visual themes and colour tokens

Use the existing `frontend/src/constants/theme.ts` tokens as the single source of truth. Components must consume tokens rather than hard-code colours. The theme has two intentional modes.

#### Calm mode (default)

| Token | Hex | Use |
| --- | --- | --- |
| `COLORS.bg` | `#FFFFFF` | Main screen background |
| `COLORS.surface` | `#F7F9FA` | Cards, grouped form areas, low-emphasis containers |
| `COLORS.ink` | `#0B2545` | Primary text and high-emphasis icons |
| `COLORS.muted` | `#64748B` | Secondary text, labels, metadata |
| `COLORS.brand` | `#0E7C86` | Primary actions, links, active navigation, focus treatment |
| `COLORS.border` | `#EDF1F4` | Dividers, card borders, input outlines |

#### Feature colours

| Area | Background | Accent | Meaning |
| --- | --- | --- | --- |
| Readiness | `#DFF3E3` | `#2E9E5B` | Preparedness, successful completion |
| Medical records | `#E3EEFB` | `#2E6FA6` | Documents, uploads, summaries |
| Hospitals | `#FCEEDB` | `#E8A33D` | Location, facility search, caution |
| Emergency wallet | `#EDE7F6` | `#6B4FA0` | Personal emergency information and QR handoff |

#### Semantic status colours

| Status | Hex | Required companion text/icon |
| --- | --- | --- |
| Success / confirmed | `#2E9E5B` | Check icon and a label such as "Sent" or "Complete" |
| Pending / warning | `#E8A33D` | Clock/alert icon and a label such as "Pending" or "Needs attention" |
| Error / urgent action | `#D7263D` | Error/alert icon and a specific recovery action |

Colour must never be the sole indication of status. Use labels, icons, and, where practical, a status badge shape.

#### Emergency mode (active SOS only)

| Token | Hex | Use |
| --- | --- | --- |
| `COLORS.emergency.bg` | `#0A0E14` | Full-screen emergency background |
| `COLORS.emergency.cardBg` | `#161F2B` | SOS timeline and detail cards |
| `COLORS.emergency.border` | `#263445` | Emergency card separation |
| `COLORS.emergency.text` | `#F5F7FA` | High-contrast emergency text |
| `COLORS.emergency.pulseRed` | `#FF3B4E` | Active SOS / cancel-confirmation actions only |
| `COLORS.emergency.pulseAmber` | `#FFB03B` | Waiting or degraded emergency state |
| `COLORS.emergency.pulseGreen` | `#3BDB7A` | Confirmed delivery or safe completion |

Emergency mode must be entered only after the user confirms SOS activation. It should use large text, high contrast, a prominent current status, timestamped updates, a call-emergency-services action, and an explicit exit/cancel path when cancellation is permitted.

### 13.3 Typography, spacing, and shape

- Typography scale: title `28`, heading `22`, subheading `17`, body `15`, caption `13` (React Native density-independent pixels).
- Use `COLORS.ink` for headings and important data; use `COLORS.muted` only for secondary content. Do not use tiny or low-contrast text for health or SOS status.
- Standard content padding is `20`; card corner radius is `24`; button/input corner radius is `16`.
- Use an 8-point spacing rhythm around the base tokens: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`.
- Keep interactive controls at least 44 x 44 points, with larger (52–56 point) primary and emergency actions.
- Use consistent icon sizes: 16 for inline labels, 20 for navigation/actions, 24 for card actions, and 32–42 for key feature or emergency symbols.

### 13.4 Navigation and screen rules

- The login screen is the initial unauthenticated route; authenticated users enter the dashboard. Do not leave a blank root route.
- The bottom navigation should expose only the primary daily destinations: dashboard, hospitals, wallet, and profile. Secondary views (records, readiness, learning, SOS details) open through clear in-screen actions and include a back affordance.
- Preserve navigation state after transient network failures; do not return users to login for a single failed API request.
- Use a consistent detail header with a back action, clear title, and only task-relevant actions.
- On web, constrain dense content to a readable centred column while retaining responsive full-width emergency controls. Ensure keyboard navigation and visible focus styling.

### 13.5 Feature-level UX requirements

| Feature | Required UI behavior |
| --- | --- |
| Login and session | Show clear authentication progress and failure messages. Biometrics unlock a stored session; provide an alternate supported sign-in path. |
| Dashboard | Present a small set of actionable summary cards: readiness, records, hospitals, and wallet. Each card shows a current value, short explanation, and destination. |
| Wallet | Separate essential responder-visible facts from private notes. Show cache/last-sync status, edit/save feedback, contact completeness, consent copy, and a QR view with sharing warning. |
| Medical records | Show file name, type, date, processing state, and safe summary status. Provide upload validation before submission; distinguish queued, processing, complete, and failed OCR. |
| Hospitals | Ask for location only when needed, explain its use, show a manual location fallback, ranking reasons, travel/freshness information, and a clear disclaimer for unverified availability. |
| Readiness | Explain the score with completed and missing items. Never present a score without showing the actionable factors behind it. |
| Learn | Display reviewed content metadata, last review date, emergency disclaimer, and readable article hierarchy. |
| SOS | Use a confirmation step before activation, haptic/visual acknowledgement after activation, permission and manual-location fallbacks, a timestamped event timeline, per-contact delivery state, retry/help actions, and emergency-call affordance. |

### 13.6 State, feedback, and error design

Every remote-data screen needs deliberate loading, empty, offline, error, and success states.

- **Loading:** use skeleton cards or in-place activity indicators; never replace a whole populated screen with a spinner during refresh.
- **Empty:** explain what is missing and provide one primary next action (for example, "Add emergency contact").
- **Offline:** show the cached-data indicator, last successful sync time, and which actions will queue or cannot be completed.
- **Error:** display a short user-safe message with Retry. Technical details and request IDs belong in logs/support details, not the primary copy.
- **Success:** show brief inline confirmation after save/upload/notification; do not rely only on a disappearing toast for critical outcomes.
- **Destructive or high-risk actions:** confirm deletion, logout, SOS cancellation, and irreversible sharing. Put the consequence in the confirmation copy.

### 13.7 Accessibility and inclusive design

- Meet WCAG AA contrast for text and interactive controls; test both Calm and Emergency modes.
- Support system font scaling without clipped cards, labels, or primary buttons.
- Provide `accessibilityLabel`, role, state, and hint for icon-only controls, QR sharing, SOS status, and navigation.
- Keep logical screen-reader and keyboard focus order; move focus to new error/confirmation content where supported.
- Do not depend on colour, gesture, vibration, audio, or biometrics alone; provide equivalent visual and manual controls.
- Use clear language and avoid clinical claims. Localize all display strings, dates, numbers, emergency numbers, and phone formats for the target region.

### 13.8 Frontend implementation standards

- Keep tokens in `src/constants/theme.ts`; extend it with named semantic tokens (for example, `textPrimary`, `textSecondary`, `actionPrimary`, `statusSuccess`) before introducing new raw hex values.
- Build and reuse primitives for `AppButton`, `StatusBadge`, `SummaryCard`, `DetailHeader`, form fields, empty states, loading skeletons, error panels, and offline banners.
- Keep business/API state in typed services and stores; keep transient UI state (sheet visibility, field focus, animation) local to components.
- Use Expo environment variables for API endpoints. `EXPO_PUBLIC_API_URL` must use `http://127.0.0.1:8000` for local web development; a physical device must use the computer's LAN address or a secure tunnel, never the device's own `localhost`.
- Validate and format fields close to the input, but treat server validation/errors as authoritative.
- Test the same UI on Android, iOS where supported, and web; do not ship a screen that renders blank or has an unresolved route/module dependency.

### 13.9 Backend responsibilities that enable good UX

The backend does not own visual styling, but it must provide predictable state and metadata so the frontend can represent the user experience honestly.

- Return stable resource IDs, ISO 8601 timestamps, explicit lifecycle/status enums, field-level validation errors, and an error `code`, `message`, `details`, and `request_id`.
- Return freshness timestamps and source/reason data for hospital rankings, readiness scores, OCR results, and notifications.
- Expose processing/delivery progress without making the client infer completion from request success alone.
- Support idempotency keys and safe retries for SOS, upload, and notification actions so repeated taps or reconnects do not create misleading duplicate UI states.
- Configure CORS only for authorised web origins and serve the API over HTTPS outside local development.
- Never return password hashes, secret tokens, raw private file paths, unnecessary medical details, or data belonging to another user merely to populate a screen.

### 13.10 UI acceptance checklist

- Every screen uses design tokens, supports loading/empty/error/offline states, and is readable at increased text size.
- Calm and Emergency themes are visually distinct and meet contrast requirements.
- All status colours have text/icon equivalents and all critical actions have explicit feedback.
- QR, medical record, location, biometric, and SOS flows explain permission and data-sharing consequences before the action.
- Browser, Android, and supported iOS builds open every routed screen without a blank screen, 404, or module-resolution error.
- API responses supply the real timestamps, statuses, errors, and source/freshness metadata shown in the interface.
