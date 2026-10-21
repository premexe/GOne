# G-ONE Project Structure

G-ONE has three deployable parts. Keep changes inside the matching folder.

```text
GOne/
├── frontend/             G-ONE patient mobile app (Expo / EAS)
│   ├── app/              Screen routes: auth, tabs, SOS, records
│   └── src/              Shared UI, API client, stores, voice service
├── backend/              G-ONE API and ResQ voice service (FastAPI / Render)
│   ├── app/              Routers, models, services, security
│   └── resq_service/     WebSocket emergency voice agent
├── hospital-dashboard/   Hospital operations dashboard (Vite / Render Static Site)
├── README.md             Existing project overview
└── PROJECT_STRUCTURE.md  This deployment and maintenance guide
```

## What remains in use

- `frontend/app/sos/resq.tsx`: the only in-app emergency voice screen.
- `frontend/src/services/speechRecognition.ts`: native speech-to-text for installed builds.
- `frontend/src/components/WalletCard.tsx`: QR emergency card for signed-in users.
- `backend/resq_service/`: G-ONE ResQ WebSocket AI handover workflow.
- `hospital-dashboard/`: separate hospital admin deployment.

## Removed legacy paths

The previous unreferenced voice call modal, local browser Gemini fallback, Agora wrapper, and duplicate client triage engine were removed. Voice AI now goes through the backend so no provider key is shipped in the app.

## Environment ownership

| Location | Allowed values |
| --- | --- |
| `frontend/.env` | `EXPO_PUBLIC_API_URL` only; never API or database secrets |
| `backend/.env` | Gemini, Groq, Sarvam, database, email, and JWT secrets |
| Render backend environment | Same backend values used in production |
| `hospital-dashboard/.env` | `VITE_API_BASE_URL`, dashboard configuration only |

## Deployment targets

- Patient app: EAS build from `frontend/`.
- API + ResQ + QR public card: Render service with root directory `backend/`.
- Hospital dashboard: Render Static Site with root directory `hospital-dashboard/`.

Keep the existing Android package ID, EAS project ID, Render URLs, and database names until a planned migration. Changing them would break installed-app updates or deployed integrations.
