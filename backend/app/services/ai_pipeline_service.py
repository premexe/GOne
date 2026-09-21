"""
G-ONE AI Pipeline Service Adapter.

Bridges the GOne FastAPI backend to the G-ONE AI triage module
(gone_ai_module/src/pipeline/orchestrator.py).

Responsibilities:
  1. Fetch the user's EmergencyWallet from the DB.
  2. Fetch the user's MedicalRecord list from the DB.
  3. Assemble the AI Input Contract payload.
  4. Run the AI pipeline (Tri-Tier: Gemini → Ollama → Deterministic Rules).
  5. Return the flat backend-contract dict via FinalAIResponse.to_backend_dict().

Safety contract:
  - AI pipeline failure is fully isolated; callers MUST handle exceptions.
  - No PII is logged.
  - Missing wallet / records are passed as empty structures (never faked).
"""

import logging
import sys
import os

from sqlalchemy.orm import Session

from app.models.emergency_wallet import EmergencyWallet
from app.models.medical_record import MedicalRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ensure the gone_ai_module package is importable from the backend root.
# The module lives at  backend/gone_ai_module/src/...
# We add  backend/gone_ai_module  to sys.path so that
#   `from src.pipeline import run_ai_pipeline` resolves correctly.
# ---------------------------------------------------------------------------
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_AI_MODULE_ROOT = os.path.join(_BACKEND_DIR, "gone_ai_module")

if _AI_MODULE_ROOT not in sys.path:
    sys.path.insert(0, _AI_MODULE_ROOT)


def _import_pipeline():
    """Lazy-import run_ai_pipeline so startup failure is isolated."""
    try:
        from src.pipeline.orchestrator import run_ai_pipeline  # type: ignore[import]
        return run_ai_pipeline
    except Exception as exc:  # pragma: no cover
        logger.error("G-ONE AI module could not be imported: %s", exc)
        raise


def _build_wallet_dict(wallet: EmergencyWallet | None) -> dict:
    """Convert ORM wallet to the AI Input Contract shape."""
    if wallet is None:
        return {}
    return {
        "blood_group": wallet.blood_group or "Not Available",
        "allergies": wallet.allergies or "Not Available",
        "chronic_conditions": wallet.chronic_conditions or "Not Available",
        "current_medications": wallet.current_medications or "Not Available",
        "emergency_notes": wallet.emergency_notes or "Not Available",
    }


def _build_records_list(records: list[MedicalRecord]) -> list[dict]:
    """Convert ORM medical records to the AI Input Contract shape."""
    result = []
    for r in records:
        result.append({
            "record_id": r.record_id,
            "record_type": r.record_type or "",
            "title": r.title or "",
            "hospital_name": r.hospital_name or "",
            "doctor_name": r.doctor_name or "",
            "record_date": str(r.record_date) if r.record_date else "",
            "ocr_text": r.ocr_text or "",
        })
    return result


class AIPipelineService:
    """Adapter between the GOne FastAPI backend and the G-ONE AI module."""

    @staticmethod
    def run_triage(
        db: Session,
        user_id: int,
        emergency_description: str,
        sos_id: int | None,
        latitude: float | None = None,
        longitude: float | None = None,
        sos_status: str = "ACTIVE",
    ) -> dict:
        """
        Run the full G-ONE AI triage pipeline for a given user + SOS.

        Returns a dict with keys:
          - emergency_understanding  (str)
          - severity                 (str)
          - required_medical_capability (str)
          - ai_health_summary        (str)
          - emergency_report         (str)

        Raises on AI module failure — callers must handle gracefully.
        """
        # --- Fetch patient context from DB ---
        wallet_orm: EmergencyWallet | None = (
            db.query(EmergencyWallet)
            .filter(EmergencyWallet.user_id == user_id)
            .first()
        )
        records_orm: list[MedicalRecord] = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.user_id == user_id)
            .all()
        )

        # --- Build AI Input Contract payload ---
        payload: dict = {
            "user_id": user_id,
            "emergency_description": emergency_description or "",
            "emergency_wallet": _build_wallet_dict(wallet_orm),
            "medical_records": _build_records_list(records_orm),
            "emergency": {
                "sos_id": sos_id,
                "description": emergency_description or "",
                "latitude": latitude,
                "longitude": longitude,
                "status": sos_status,
            },
        }

        # --- Run the pipeline ---
        run_ai_pipeline = _import_pipeline()
        response = run_ai_pipeline(payload)

        logger.info(
            "AI triage complete | user=%s sos=%s tier=%s severity=%s status=%s",
            user_id,
            sos_id,
            response.metadata.understanding_tier,
            response.severity,
            response.status,
        )

        return response.to_backend_dict()
