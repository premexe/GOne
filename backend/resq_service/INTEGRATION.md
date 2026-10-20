# G-ONE ResQ integration

This folder is the supplied G-ONE ResQ repository. It is mounted into the existing G-ONE FastAPI backend, so the web client and WebSocket use the same deployment and host.

## Local run

```powershell
cd C:\Users\Admin\OneDrive\Desktop\GOne\backend\resq_service
Copy-Item .env.example .env
..\..\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://127.0.0.1:8000/resq/` for the bundled voice interface. The WebSocket endpoint is `ws://127.0.0.1:8000/ws/emergency`; the health check is `http://127.0.0.1:8000/api/v1/health`.

For a phone or deployed frontend, expose the G-ONE backend over HTTPS and use `wss://<your-gone-host>/ws/emergency`.

## Environment

Copy `.env.example` to `.env` and set only the services you use:

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOST` | No | Keep `0.0.0.0` for local LAN/container access. |
| `PORT` | No | The integrated service runs with the main G-ONE API port. |
| `GEMINI_API_KEY` | Recommended | Primary genuine AI response provider. Keep this server-only. |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash`. |
| `GROQ_API_KEY` | Optional | Secondary provider when Gemini is unavailable/quota-limited. |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile`. |
| `SARVAM_API_KEY` | Optional | Server-side speech-to-text credential; it is not needed when a browser/device does transcription. |
| `SARVAM_MODEL` | No | Default: `saaras:v3`. |
| `GONE_BACKEND_URL` | Required only for real handover | Base URL of the existing G-ONE backend. |
| `GONE_HANDOVER_ENDPOINT` | Required only for real handover | Endpoint that accepts the ResQ handover JSON. |
| `USE_MOCK_HANDOVER` | Yes initially | Keep `true` until the main backend exposes and authenticates a matching handover endpoint. |

Never put Gemini, Groq, or Sarvam keys in Expo `EXPO_PUBLIC_*` variables, source code, or Git.

## Current scope

The supplied repository supports English, Hindi, and Hinglish protocol analysis, Gemini/Groq fallback, a safe deterministic fallback, and browser/device text-to-speech. It does not provide “any language” recognition out of the box. Sarvam is included for Indian-language transcription, but a mobile/audio upload bridge is still needed before raw microphone audio is sent to it. Do not use this prototype as a replacement for local emergency services or clinical advice.
