# G-ONE AI Module

The AI / Intelligence layer for the G-ONE Smart Emergency Healthcare Response System.

Given a raw Backend → AI request payload (see `AI_Input_Output_Contract.md`), this module validates it, preprocesses it, runs emergency understanding/severity/capability/health-summary/report generation, and returns a structured result in the exact shape the backend expects.

**Status:** All six planned components exist (input validation, emergency understanding, severity, required medical capability, AI health summary, emergency report) and are wired together by an orchestrator. See `KNOWN_ISSUES.md`-equivalent notes below before treating this as production-final — there is one known correctness bug in the offline fallback classifier.

## What this module does NOT do

Per the locked project boundaries:

- Does not select, rank, or route to hospitals.
- Does not calculate distance, travel time, or bed availability.
- Does not calculate the Readiness Score (backend's responsibility).
- Does not diagnose, prescribe, or recommend treatment/medication/dosage.
- Does not talk to the mobile app or hospital dashboard directly — the backend is the only caller.
- Does not persist any data or run a database.
- Does not expose an HTTP API — it is called as an internal Python function.

## Processing flow

```
Backend Payload
   → run_input_pipeline()              validation + preprocessing
   → AIOrchestrator.process()
        ├─ Emergency Understanding      Gemini → Ollama → deterministic rules
        ├─ Required Medical Capability  deterministic taxonomy mapping
        ├─ AI Health Summary            deterministic, wallet + bounded OCR excerpts
        └─ Emergency Report             deterministic synthesis
   → FinalAIResponse.to_backend_dict()  contract-shaped dict, ready for the backend
```

### Emergency Understanding tiers

1. **Tier 1 — Gemini** (if `GEMINI_API_KEY` is set and reachable): classifies emergency category + indicators.
2. **Tier 2 — Local Ollama** (`qwen2.5:1.5b` at `http://localhost:11434`, if Tier 1 unavailable): same job, offline.
3. **Tier 3 — Deterministic regex rules** (always available, zero dependencies): guaranteed fallback.

**Severity is always deterministic**, regardless of which tier classified the category — this is a deliberate safety choice, not an oversight: the highest-stakes field is never left to an LLM's judgment alone.

## Project structure

```
src/
  schemas/        Contract dataclasses, validation errors, structural validators,
                   plus result schemas for understanding/capability/report/final response
  preprocessing/   Text sanitization, description resolution, wallet/record normalization
  services/
    health_summary/          AI Health Summary generation
    emergency_understanding/ Tri-tier classification (Gemini → Ollama → rules)
    medical_capability/      Deterministic capability mapping
    emergency_report/        Deterministic report synthesis
  pipeline/
    input_pipeline.py        Validation + preprocessing entry point
    orchestrator.py           Coordinates all services, isolates component failures
  utils/          Shared constants (size limits) and safe logging helpers
tests/            139 unit/integration tests
```

## Running the module

```python
from src.pipeline import run_ai_pipeline

response = run_ai_pipeline(backend_payload)   # raw dict from the backend
backend_dict = response.to_backend_dict()      # exact contract-shaped dict
```

See `BACKEND_INTEGRATION.md` for the full integration guide.

### Optional environment variables

| Variable | Purpose | If unset |
|---|---|---|
| `GEMINI_API_KEY` | Enables Tier 1 (Gemini) emergency understanding | Falls through to Tier 2/3 automatically |

No environment variables are required to run the module — everything degrades gracefully to the deterministic tier with zero configuration.

## Running the tests

```bash
pip install -r requirements.txt
pytest -v
```

139 tests. As of the last audit, 138 pass; `test_orchestrator_burn_injury` fails due to a known regex-brittleness bug in the Tier 3 fallback classifier (see `KNOWN_ISSUES` note below) — this should be fixed before this module is treated as fully production-ready, but does not block backend integration testing.

## Known issue (tracked, not yet fixed)

The Tier 3 deterministic classifier is regex-pattern based and can miss rephrased/pluralized variants of known phrasings (e.g. "Extensive fire burns on the arm and chest" is not matched by the "extensive burns" / "burn on the arm and chest" patterns because of the inserted word and pluralization). This only affects classification when both Gemini and Ollama are unavailable. Recommended fix: normalize/stem input text before matching, or broaden the affected patterns.

## Security properties

- All free text (emergency description, wallet fields, OCR text, record metadata) is treated as inert, untrusted data — never evaluated or executed.
- Validation/preprocessing errors never include raw field values, only field names and generic messages.
- Every text field has an explicit maximum length; oversized input raises a clear error instead of being silently truncated.
- No raw patient/medical data is logged anywhere in the codebase.
- No data is persisted — no database, no file storage of patient data.
- `GEMINI_API_KEY` is read only from the environment, never hardcoded.