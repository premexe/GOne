# G-ONE ResQ: Voice-First Emergency Response Companion

## Architecture Specification

**Version:** 1.0  
**Status:** MVP Architecture  
**Project:** G-ONE ResQ

---

## 1. Purpose and Scope

G-ONE ResQ is a standalone voice-first emergency assistance service designed to work as the AI/voice companion for the G-ONE emergency-response ecosystem.

It listens to a patient's speech, converts it to text, understands the reported emergency, retrieves available patient context, selects an approved first-aid protocol, generates a natural-language response, validates that response, and prepares a structured handover when escalation criteria are met.

ResQ is intentionally separated from the existing G-ONE application. The existing G-ONE backend remains the system of record for patient and emergency data.

### Safety boundaries

ResQ:

- Does not diagnose diseases.
- Does not prescribe medicines or dosages.
- Does not invent patient information.
- Does not invent actions outside the selected protocol.
- Does not downgrade established emergency severity during an active session.
- Does not treat an LLM response as the source of truth for first-aid actions.
- Uses structured protocols as the authoritative source for permitted guidance.

---

## 2. High-Level Architecture

```text
                         +-----------------------+
                         |      Patient/User     |
                         |   Voice Conversation  |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         |     Web / Mobile UI   |
                         |  Mic + Audio + TTS    |
                         +-----------+-----------+
                                     |
                                  WebSocket
                                     |
                                     v
                  +---------------------------------------+
                  |       G-ONE ResQ FastAPI API          |
                  |       WebSocket / REST Layer          |
                  +-------------------+-------------------+
                                      |
                                      v
                  +---------------------------------------+
                  |            Session Manager            |
                  | Conversation State + Event History   |
                  +----------+------------------+---------+
                             |                  |
                +------------v------+     +----v---------------+
                |    STT Layer      |     | Patient Context    |
                | Sarvam + fallback |     | Provider           |
                +------------+------+     +----+---------------+
                             |                  |
                             +--------+---------+
                                      |
                                      v
                         +-----------------------+
                         | Emergency Understanding|
                         | Rules + LLM Extraction |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         |    Protocol Engine    |
                         |  Authoritative Rules  |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         |    LLM Provider       |
                         | Gemini -> Groq ->     |
                         | Deterministic Fallback|
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         |    Safety Validator   |
                         +-----------+-----------+
                                     |
                         +-----------+-----------+
                         |                       |
                         v                       v
                  +-------------+       +------------------+
                  | Client/TTS  |       | Handover Service |
                  +-------------+       +--------+---------+
                                                |
                                                v
                                         G-ONE Backend
```

---

## 3. Request Flow

Each conversational turn follows this sequence:

```text
Patient speaks
    |
    v
Client captures audio
    |
    v
STT Provider
    |
    v
Transcript + language
    |
    v
Session updated
    |
    v
Emergency Analyzer
    |
    v
Protocol selected
    |
    v
Patient context loaded/updated
    |
    v
Protocol Engine determines approved actions
    |
    v
LLM renders approved information naturally
    |
    v
Safety Validator
    |
    +---- PASS ----> Client/TTS
    |
    +---- FAIL ----> Deterministic approved response
    |
    v
Escalation check
    |
    +---- Required ----> Handover Service
```

The LLM is responsible for conversational wording. It is not the authority for medical actions.

---

## 4. Project Structure

```text
gone-resq/
├── README.md
├── ARCHITECTURE.md
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
│
├── config/
│   ├── providers.yaml
│   └── locale.yaml
│
├── protocols/
│   ├── schema.json
│   ├── severe_bleeding.json
│   ├── cardiac_chest_pain.json
│   ├── breathing_difficulty.json
│   ├── choking.json
│   ├── unconscious_unresponsive.json
│   ├── burns.json
│   ├── trauma_injury.json
│   ├── neurological_symptoms.json
│   └── general_emergency.json
│
├── src/
│   └── gone_resq/
│       ├── api/
│       │   ├── app.py
│       │   ├── websocket.py
│       │   └── schemas.py
│       │
│       ├── core/
│       │   ├── config.py
│       │   ├── exceptions.py
│       │   └── logging.py
│       │
│       ├── domain/
│       │   ├── models.py
│       │   ├── enums.py
│       │   └── events.py
│       │
│       ├── stt/
│       │   ├── base.py
│       │   ├── sarvam.py
│       │   ├── fallback.py
│       │   └── manager.py
│       │
│       ├── llm/
│       │   ├── base.py
│       │   ├── gemini.py
│       │   ├── groq.py
│       │   ├── deterministic.py
│       │   └── manager.py
│       │
│       ├── emergency/
│       │   ├── analyzer.py
│       │   ├── rules.py
│       │   └── models.py
│       │
│       ├── protocols/
│       │   ├── loader.py
│       │   ├── engine.py
│       │   └── models.py
│       │
│       ├── patient/
│       │   ├── base.py
│       │   ├── mock.py
│       │   └── http.py
│       │
│       ├── conversation/
│       │   ├── prompt_builder.py
│       │   └── renderer.py
│       │
│       ├── safety/
│       │   └── validator.py
│       │
│       ├── session/
│       │   └── manager.py
│       │
│       ├── handover/
│       │   ├── service.py
│       │   ├── models.py
│       │   ├── mock.py
│       │   └── http.py
│       │
│       └── orchestrator/
│           └── turn.py
│
├── web/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
└── tests/
    ├── test_emergency_analyzer.py
    ├── test_protocols.py
    ├── test_provider_fallback.py
    ├── test_safety_validator.py
    └── test_handover.py
```

---

## 5. Domain Layer

The domain layer contains application-independent models:

- `PatientContext`
- `EmergencySession`
- `Transcript`
- `EmergencyUnderstanding`
- `EmergencyProtocol`
- `ApprovedActions`
- `LLMResult`
- `HandoverPayload`
- `DeliveryResult`

Missing patient information must be represented as unavailable rather than guessed.

Typical patient context:

```text
PatientContext
├── patient_id
├── name
├── age
├── blood_group
├── allergies
├── existing_conditions
├── medications
├── emergency_contacts
└── medical_reports
```

---

## 6. Speech-to-Text Layer

The STT layer converts patient speech into text.

### Requirements

- Hindi.
- English.
- Hinglish where supported.
- Provider abstraction.
- Timeout and connection handling.
- Language metadata.
- No fabricated transcript when recognition fails.

Recommended flow:

```text
Audio
  |
  v
Primary STT
  |
  +---- success ----> Transcript
  |
  +---- failure ----> STT fallback
```

If transcription confidence is too low, ResQ should ask the patient to repeat the information rather than treating unreliable text as fact.

---

## 7. Emergency Understanding

The emergency analyzer converts conversation into structured emergency information.

Example:

```json
{
  "emergency_type": "severe_bleeding",
  "severity": "critical",
  "symptoms": [
    "heavy bleeding",
    "dizziness"
  ],
  "confidence": 0.91,
  "language": "hinglish"
}
```

### Emergency types

```text
SEVERE_BLEEDING
CARDIAC_CHEST_PAIN
BREATHING_DIFFICULTY
CHOKING
UNCONSCIOUS_UNRESPONSIVE
BURNS
TRAUMA_INJURY
NEUROLOGICAL_SYMPTOMS
GENERAL_EMERGENCY
UNKNOWN
```

### Severity

```text
LOW
MODERATE
HIGH
CRITICAL
UNKNOWN
```

Severity is monotonic during a session:

```text
LOW -> MODERATE -> HIGH -> CRITICAL
```

The analyzer may escalate severity but must not downgrade it.

---

## 8. Protocol Engine

The protocol engine is the authoritative source for emergency actions.

Protocols are stored as structured files instead of being hidden inside prompts.

Each protocol contains:

- `emergency_type`
- `version`
- `approved_actions`
- `critical_actions`
- `contraindications`
- `escalation_condition`
- `source`
- `review_status`

Example:

```json
{
  "emergency_type": "severe_bleeding",
  "version": "1.0",
  "approved_actions": [
    "Apply firm direct pressure to the wound using a clean cloth or sterile dressing."
  ],
  "critical_actions": [
    "Apply firm direct pressure."
  ],
  "contraindications": [
    "Do not remove an embedded object from the wound."
  ],
  "escalation_condition": "Severe or uncontrolled bleeding or signs of deterioration.",
  "source": "First-aid reference; pending clinical review",
  "review_status": "pending_clinical_review"
}
```

The protocol engine decides:

- Which actions are approved.
- Which actions are critical.
- Which actions are prohibited.
- When escalation is required.

The LLM cannot override these decisions.

---

## 9. LLM Provider Architecture

The LLM layer uses a common provider interface.

```text
                 +------------------+
                 | Provider Manager |
                 +--------+---------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
           Gemini                    Groq
           Primary                  Fallback
              |                       |
              +-----------+-----------+
                          |
                          v
                 Deterministic
                    Fallback
```

Common interface:

```python
class LLMProvider:
    async def generate(self, request) -> LLMResult:
        ...
```

The provider manager must:

1. Try the configured primary provider.
2. Detect quota, rate-limit, timeout, connection, and model errors.
3. Move to the next provider.
4. Avoid repeatedly calling an exhausted provider during its cooldown.
5. Use deterministic protocol rendering when all providers fail.
6. Never crash the emergency session because an LLM provider failed.

Model names must be configuration values, not hardcoded assumptions.

Example:

```env
GEMINI_MODEL=
GROQ_MODEL=
```

---

## 10. Deterministic Fallback

The deterministic provider is the final response path.

It does not attempt to behave as a general chatbot.

It renders approved protocol actions directly.

Example:

```text
Approved action:
Apply firm direct pressure to the wound.

Fallback response:
"Please stay calm. Apply firm, continuous pressure directly to the wound using a clean cloth or sterile dressing."
```

This ensures that loss of external APIs does not produce an empty emergency response.

---

## 11. Conversation Layer

The conversation layer makes approved actions sound natural.

The LLM may receive:

- Current transcript.
- Relevant conversation history.
- Emergency type.
- Severity.
- Approved actions.
- Critical actions.
- Contraindications.
- Available patient context.
- Required language.

The generated response must not:

- Diagnose.
- Prescribe medicines.
- Invent dosages.
- Invent patient facts.
- Introduce unsupported procedures.
- Contradict critical protocol actions.

---

## 12. Safety Validator

Every LLM response passes through the safety validator before reaching the patient.

```text
LLM Response
     |
     v
Safety Validator
     |
     +---- PASS ----> Deliver response
     |
     +---- FAIL ----> Deterministic approved response
```

The validator checks:

- Required critical actions are present.
- No prohibited medication/dosage advice.
- No definitive diagnosis claims.
- No unsupported patient facts.
- No unsafe contradiction of the protocol.
- Response is non-empty and meaningful.

---

## 13. Patient Context

ResQ supports patient-data retrieval without directly depending on the internal G-ONE database.

### Local development

Use:

```text
MockPatientContextProvider
```

### Integration

Use:

```text
HTTPPatientContextProvider
```

Example:

```text
ResQ
  |
  | GET /patient/{patient_id}/emergency-context
  v
G-ONE Backend
  |
  v
Patient Context
```

Potential fields:

- Patient ID.
- Name.
- Age.
- Blood group.
- Allergies.
- Existing conditions.
- Available medication information.
- Emergency contacts.
- Relevant medical summary.

Unavailable information must remain unavailable.

---

## 14. Session Management

Every emergency interaction receives a unique session.

```text
EmergencySession
├── session_id
├── patient_id
├── started_at
├── language
├── current_emergency_type
├── current_severity
├── patient_context
├── transcript_history
├── actions_given
├── escalation_status
└── handover_status
```

Session state must persist across voice turns and provide enough information to construct the final handover.

---

## 15. Handover Service

When escalation criteria are met:

```text
Emergency Session
       |
       v
Handover Service
       |
       v
Schema Validation
       |
       v
G-ONE Backend
       |
       v
Hospital Dashboard / Emergency Operations
```

The MVP should support:

```text
MockHandoverTransport
FileHandoverTransport
HTTPHandoverTransport
```

This allows local development before the teammates' backend is available.

---

## 16. Handover Payload

Example:

```json
{
  "schema_version": "1.0.0",
  "session_id": "SES-EXAMPLE",
  "patient_id": "PAT-EXAMPLE",
  "patient": {
    "name": "AVAILABLE_FROM_BACKEND",
    "age": null,
    "blood_group": null,
    "allergies": [],
    "existing_conditions": []
  },
  "emergency": {
    "type": "severe_bleeding",
    "severity": "critical",
    "reason": "Severe uncontrolled bleeding"
  },
  "conversation": {
    "language": "hinglish",
    "summary": "Patient reported severe bleeding.",
    "actions_already_given": []
  },
  "emergency_contacts": [],
  "timestamp": "ISO-8601"
}
```

Do not put fake patient data into production handovers.

---

## 17. WebSocket API

Endpoint:

```text
/ws/emergency
```

Example client message:

```json
{
  "type": "user_speech",
  "session_id": "SES-123",
  "audio": "<audio payload>"
}
```

Example server response:

```json
{
  "type": "assistant_response",
  "session_id": "SES-123",
  "text": "Please stay calm and apply firm pressure to the wound.",
  "language": "en",
  "provider": "gemini",
  "fallback_used": false
}
```

Possible event types:

```text
session_started
transcript
assistant_response
escalation
handover_started
handover_completed
error
session_ended
```

---

## 18. Web Client

The MVP web client provides:

- Start/stop emergency session.
- Microphone access.
- Audio capture.
- Transcript display.
- Assistant response display.
- Browser/device TTS.
- Connection status.
- Escalation status.
- Handover status.

The client remains simple because the existing G-ONE mobile application will eventually become the primary client.

---

## 19. Audio Feedback Protection

The client should reduce self-transcription caused by assistant TTS.

Basic strategy:

```text
Assistant speaks
      |
      v
Pause microphone recognition
      |
      v
TTS finishes
      |
      v
Short cooldown
      |
      v
Microphone resumes
```

Similarity filtering may be added, but it must not discard genuine patient speech simply because it contains common words.

---

## 20. Configuration

Secrets must never be committed.

Example `.env`:

```env
APP_HOST=127.0.0.1
APP_PORT=8000

GEMINI_API_KEY=
GEMINI_MODEL=

GROQ_API_KEY=
GROQ_MODEL=

SARVAM_API_KEY=

GONE_BACKEND_URL=
GONE_HANDOVER_ENDPOINT=

USE_MOCK_PATIENT_CONTEXT=true
USE_MOCK_HANDOVER=true
```

Provider order and model names should be configurable.

---

## 21. Error and Fallback Strategy

```text
                     Request
                        |
                        v
                 Primary Provider
                        |
                 +------+------+
                 |             |
               Success        Error
                 |             |
                 v             v
              Response   Secondary Provider
                               |
                        +------+------+
                        |             |
                      Success        Error
                        |             |
                        v             v
                     Response   Deterministic
                                Protocol Response
```

Provider fallback should cover:

- HTTP 429.
- Quota exhaustion.
- Timeout.
- Connection failure.
- Provider unavailable.
- Model not found.
- Invalid provider configuration.

The system should log provider errors without exposing secrets or unnecessary patient data.

---

## 22. Testing Requirements

### Emergency Analyzer

Test:

- Hindi phrases.
- English phrases.
- Hinglish phrases.
- Severity escalation.
- No severity downgrade.

### Protocol Engine

Test:

- Protocol selection.
- Approved actions.
- Critical actions.
- Contraindications.
- Escalation conditions.

### Provider Manager

Test:

- Primary success.
- Primary failure -> secondary.
- Secondary failure -> deterministic fallback.
- Quota error.
- Model-not-found error.
- Empty API keys.
- No real network dependency in fallback tests.

### Safety Validator

Test:

- Valid response.
- Diagnosis rejection.
- Medication/dosage rejection.
- Unsupported patient fact rejection.
- Missing critical action.
- Deterministic fallback.

### Handover

Test:

- Payload validation.
- Mock transport.
- Idempotency.
- HTTP transport failure.

---

## 23. Integration Contract

The existing G-ONE team should only need stable API contracts.

### Patient context

```text
GET /api/v1/patients/{patient_id}/emergency-context
```

### Emergency handover

```text
POST /api/v1/emergency/handover
```

### Authentication

To be defined during integration.

### Patient identity

The G-ONE mobile application supplies the authenticated patient ID to ResQ.

---

## 24. Integration Architecture

```text
+-------------------------+
|     G-ONE Mobile App    |
|                         |
| Authentication          |
| Patient ID              |
| Emergency Trigger       |
+------------+------------+
             |
             | WebSocket
             v
+-------------------------+
|       G-ONE ResQ        |
|                         |
| Voice / STT             |
| Emergency Understanding |
| Protocol Engine         |
| LLM Providers           |
| Safety Validation       |
| Handover                |
+-------+-----------+-----+
        |           |
        | HTTP      | HTTP
        v           v
+---------------+  +--------------------+
| G-ONE Backend |  | Hospital Dashboard |
|               |  | / ER Operations    |
| Patient Data  |  | Handover Alerts    |
| APIs          |  | Emergency Status   |
+---------------+  +--------------------+
```

ResQ remains a separate service.

The G-ONE backend remains the system of record.

---

## 25. Security and Privacy

The system must:

- Keep API keys in environment variables.
- Never log API keys.
- Avoid unnecessary patient-data logging.
- Use HTTPS/WSS in deployment.
- Authenticate backend requests.
- Validate WebSocket input.
- Validate patient identifiers.
- Validate handover payloads.
- Avoid storing raw audio unless required.
- Use synthetic data during development.
- Send only the minimum patient context required to external providers.

---

## 26. Medical Content Governance

Each protocol should record:

```text
source
version
review_status
last_reviewed
```

Protocol content must be reviewed by an appropriately qualified medical professional before real-world deployment.

G-ONE ResQ is an engineering prototype and must not be presented as a clinically validated autonomous nurse.

---

## 27. MVP Definition

The MVP is functional when this complete local flow works:

```text
Patient speaks
      |
      v
Speech converted to text
      |
      v
Emergency recognized
      |
      v
Protocol selected
      |
      v
Patient context loaded
      |
      v
LLM generates natural response
      |
      v
Safety validator checks response
      |
      v
Assistant responds
      |
      v
Provider fallback works
      |
      v
Deterministic fallback works
      |
      v
Critical case creates structured handover
```

The system must work with mock patient data and mock handover transport before integration with the real G-ONE backend.

---

## 28. Design Principles

1. Protocol first, LLM second.
2. Patient data comes from the G-ONE backend, never from model guesses.
3. LLM failure must not stop emergency guidance.
4. Severity can escalate but must not silently downgrade during a session.
5. Every LLM response is validated before delivery.
6. Providers are replaceable through interfaces.
7. ResQ remains independent from the existing G-ONE implementation.
8. Integration happens through stable API contracts.
9. Sensitive data is minimized and protected.
10. Medical protocols require clinical review before real-world use.
