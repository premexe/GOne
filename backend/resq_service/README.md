# G-ONE ResQ

## Voice-First Emergency Response Companion

G-ONE ResQ is a standalone voice-first emergency assistance service designed to work as the AI/voice companion for the G-ONE emergency-response ecosystem.

It listens to a patient's speech, understands the reported emergency, retrieves available patient context, provides protocol-bound first-aid guidance, and prepares a structured handover for the G-ONE backend.

> **Prototype safety note:** G-ONE ResQ is an engineering prototype. It is not a medical device or a replacement for emergency services or qualified medical professionals. Protocol content must be clinically reviewed before real-world deployment.

---

## Features

- Voice-first emergency interaction
- Hindi, English and Hinglish support
- Emergency classification
- Severity escalation
- Structured first-aid protocols
- Patient-context integration
- Gemini/Groq provider fallback
- Deterministic fallback when APIs are unavailable
- LLM safety validation
- Emergency session management
- Structured G-ONE handover
- Mock patient and handover services
- WebSocket communication
- Automated tests

---

## Architecture

The complete architecture is documented in [`ARCHITECTURE.md`](ARCHITECTURE.md).

```text
Patient
  |
  v
Web/Mobile Client
  |
  | WebSocket
  v
FastAPI ResQ
  |
  v
Session Manager
  |
  +--> STT
  |
  +--> Patient Context
  |
  v
Emergency Understanding
  |
  v
Protocol Engine
  |
  v
LLM Provider Manager
  |
  +--> Gemini
  +--> Groq
  +--> Deterministic Fallback
  |
  v
Safety Validator
  |
  +--> Voice Response
  |
  +--> Handover
          |
          v
     G-ONE Backend
```

The protocol engine is authoritative for emergency actions. The LLM is used to render approved information conversationally.

---

## Project Structure

```text
gone-resq/
├── README.md
├── ARCHITECTURE.md
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
├── config/
├── protocols/
├── src/
│   └── gone_resq/
│       ├── api/
│       ├── core/
│       ├── domain/
│       ├── stt/
│       ├── llm/
│       ├── emergency/
│       ├── protocols/
│       ├── patient/
│       ├── conversation/
│       ├── safety/
│       ├── session/
│       ├── handover/
│       └── orchestrator/
├── web/
└── tests/
```

---

## Emergency Categories

The initial MVP supports:

- Severe bleeding
- Cardiac/chest-pain symptoms
- Breathing difficulty
- Choking
- Unconscious/unresponsive person
- Burns
- Trauma/injury
- Neurological symptoms
- General emergency
- Unknown/unclassified emergency

These protocols require clinical review before real-world use.

---

## Provider Strategy

The LLM provider manager follows:

```text
Primary Provider
      |
      | failure / quota / timeout
      v
Secondary Provider
      |
      | failure / quota / timeout
      v
Deterministic Protocol Response
```

Provider model names are configuration values.

Example:

```env
GEMINI_API_KEY=
GEMINI_MODEL=

GROQ_API_KEY=
GROQ_MODEL=
```

Never commit API keys.

---

## Patient Context

During local development, ResQ uses a mock patient provider.

During integration, it requests patient context from the existing G-ONE backend.

Typical information:

- Patient ID
- Name
- Age
- Blood group
- Allergies
- Existing conditions
- Available medication information
- Emergency contacts
- Relevant medical summary

Missing information remains unavailable. ResQ never guesses patient information.

---

## Handover

When escalation criteria are met, ResQ creates a versioned handover payload.

The MVP supports mock/file transport for local testing.

The production integration can use an HTTP endpoint such as:

```text
POST /api/v1/emergency/handover
```

The exact endpoint and authentication method will be finalized with the G-ONE backend team.

---

## Setup

### 1. Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy:

```text
.env.example
```

to:

```text
.env
```

Add the required provider keys and configuration.

Do not commit `.env`.

---

## Running the Application

From `backend/resq_service` (port 8001 avoids the existing G-ONE API on port 8000):

```powershell
Copy-Item .env.example .env
..\..\.venv\Scripts\python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

The WebSocket endpoint is:

```text
ws://127.0.0.1:8001/ws/emergency
```

The exact startup command may be adjusted if the application entry point changes.

---

## Running Tests

From the project root:

```powershell
pytest
```

Tests should not depend on real API availability.

Provider fallback tests should use mock/fake providers so that tests remain deterministic.

---

## Integration with G-ONE

G-ONE ResQ is intentionally independent from the existing G-ONE application.

The existing G-ONE backend remains responsible for:

- Authentication
- Patient identity
- Patient database
- Main application
- Hospital dashboard
- Emergency backend
- Final emergency data storage

ResQ provides:

- Voice interaction
- Speech-to-text integration
- Emergency understanding
- Protocol-bound guidance
- Conversation management
- Safety validation
- Structured emergency handover

Integration should happen through stable APIs rather than direct database access.

---

## Security

- Never commit API keys.
- Never log secrets.
- Minimize patient data sent to external providers.
- Avoid storing raw audio unless explicitly required.
- Use HTTPS/WSS in deployment.
- Authenticate backend communication.
- Validate all incoming data.
- Use synthetic patient data during development.

---

## Development Principles

### Protocol first

The protocol engine determines what actions are allowed.

### LLM second

The LLM converts approved information into natural conversational language.

### Safety before speech

Every generated response is checked before it reaches the patient.

### Graceful degradation

Loss of an external provider must not crash the emergency session.

### No hallucinated patient data

Unavailable patient information remains unavailable.

### Independent service

ResQ remains deployable independently from the main G-ONE application.

---

## Development Flow

```text
Domain Models
    |
    v
Protocols
    |
    v
Provider Layer
    |
    v
Emergency Analyzer
    |
    v
Safety Validator
    |
    v
Session + Orchestrator
    |
    v
STT + WebSocket
    |
    v
Web Voice Client
    |
    v
Handover
    |
    v
G-ONE Integration
```

---

## Medical Disclaimer

G-ONE ResQ is an engineering prototype for emergency-response assistance. It has not been clinically validated. Its protocol content must be reviewed by appropriately qualified medical professionals before real-world use.
