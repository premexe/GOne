"""Unit and integration tests for Phase 8: AI Orchestrator."""

import pytest
from unittest.mock import patch, MagicMock

from src.pipeline import run_ai_pipeline
from src.pipeline.orchestrator import AIOrchestrator
from src.schemas.ai_response import PipelineStatus
from src.schemas.emergency_understanding import EmergencyCategory, SeverityLevel
from src.schemas.errors import ValidationError


@pytest.fixture
def base_payload():
    return {
        "user_id": 101,
        "emergency_description": "My father is having severe chest pain and sweating heavily.",
        "emergency_wallet": {
            "blood_group": "B+",
            "allergies": "Penicillin",
            "chronic_conditions": "Hypertension",
            "current_medications": "Amlodipine",
            "emergency_notes": "Previous cardiac history",
        },
        "medical_records": [
            {
                "record_id": 1,
                "record_type": "Consultation",
                "title": "Cardiology Review",
                "hospital_name": "City Care",
                "doctor_name": "Dr. Sharma",
                "record_date": "2026-05-10",
                "ocr_text": "Patient has confirmed history of hypertension.",
            }
        ],
        "emergency": {
            "sos_id": 5001,
            "description": "Severe chest pain.",
            "latitude": 19.076,
            "longitude": 72.877,
            "status": "ACTIVE",
        },
    }


# --- Happy Path Tests Across Emergency Categories ---

def test_orchestrator_complete_cardiac_emergency(base_payload):
    response = run_ai_pipeline(base_payload)

    assert response.user_id == 101
    assert response.status in (PipelineStatus.SUCCESS.value, PipelineStatus.PARTIAL.value)
    assert response.emergency_understanding.emergency_type == EmergencyCategory.CARDIAC.value
    assert response.severity in (SeverityLevel.HIGH.value, SeverityLevel.CRITICAL.value)
    assert "Cardiology Support" in response.required_medical_capability.required_capabilities
    assert "Hypertension" in response.ai_health_summary
    assert response.emergency_report.sos_id == 5001

    backend_dict = response.to_backend_dict()
    assert backend_dict["user_id"] == 101
    assert "Cardiology Support" in backend_dict["required_medical_capability"]
    assert "Hypertension" in backend_dict["ai_health_summary"]


def test_orchestrator_trauma_accident(base_payload):
    base_payload["emergency_description"] = "Patient in a car accident with visible injuries and bleeding."
    response = run_ai_pipeline(base_payload)

    assert response.emergency_understanding.emergency_type == EmergencyCategory.TRAUMA.value
    assert "Trauma Care" in response.required_medical_capability.required_capabilities


def test_orchestrator_respiratory_emergency(base_payload):
    base_payload["emergency_description"] = "Patient is struggling to breathe and cannot speak full sentences."
    response = run_ai_pipeline(base_payload)

    assert response.emergency_understanding.emergency_type == EmergencyCategory.RESPIRATORY.value
    assert response.severity == SeverityLevel.CRITICAL.value
    assert "Respiratory Support" in response.required_medical_capability.required_capabilities


def test_orchestrator_burn_injury(base_payload):
    base_payload["emergency_description"] = "Extensive fire burns on the arm and chest."
    response = run_ai_pipeline(base_payload)

    assert response.emergency_understanding.emergency_type == EmergencyCategory.BURN_INJURY.value
    assert "Burn Care" in response.required_medical_capability.required_capabilities


# --- Missing Information Handling ---

def test_orchestrator_missing_wallet_and_records_yields_partial(base_payload):
    # Both wallet and medical records missing -> health info unavailable -> PARTIAL status
    base_payload["emergency_wallet"] = None
    base_payload["medical_records"] = []
    response = run_ai_pipeline(base_payload)

    assert response.status == PipelineStatus.PARTIAL.value
    assert response.emergency_understanding.emergency_type == EmergencyCategory.CARDIAC.value
    assert "No relevant health information" in response.ai_health_summary


def test_orchestrator_missing_medical_records(base_payload):
    base_payload["medical_records"] = []
    response = run_ai_pipeline(base_payload)

    assert response.emergency_understanding.emergency_type == EmergencyCategory.CARDIAC.value
    assert "Hypertension" in response.ai_health_summary


def test_orchestrator_vague_description_returns_insufficient_information(base_payload):
    base_payload["emergency_description"] = "I don't know what is happening, please help."
    base_payload["emergency"]["description"] = "Help needed."
    response = run_ai_pipeline(base_payload)

    assert response.status == PipelineStatus.INSUFFICIENT_INFORMATION.value
    assert response.emergency_understanding.emergency_type == EmergencyCategory.UNKNOWN.value
    assert response.severity == SeverityLevel.UNKNOWN.value
    assert response.required_medical_capability.required_capabilities == ["General Emergency Care"]


# --- Validation Failures ---

def test_orchestrator_missing_emergency_description_raises(base_payload):
    del base_payload["emergency_description"]
    del base_payload["emergency"]["description"]

    with pytest.raises(ValidationError) as exc:
        run_ai_pipeline(base_payload)
    assert exc.value.code == "MISSING_EMERGENCY_DESCRIPTION"


def test_orchestrator_missing_user_id_raises(base_payload):
    del base_payload["user_id"]

    with pytest.raises(ValidationError) as exc:
        run_ai_pipeline(base_payload)
    assert exc.value.code == "MISSING_FIELD"


def test_orchestrator_malformed_payload_raises():
    with pytest.raises(ValidationError):
        run_ai_pipeline(["not", "a", "dict"])


# --- Component Failure Graceful Degradation ---

def test_orchestrator_emergency_understanding_failure_degrades(base_payload):
    bad_understanding_fn = MagicMock(side_effect=RuntimeError("Understanding service crashed"))
    orchestrator = AIOrchestrator(understanding_fn=bad_understanding_fn)

    response = orchestrator.process(base_payload)

    assert response.status == PipelineStatus.INSUFFICIENT_INFORMATION.value
    assert response.emergency_understanding.emergency_type == EmergencyCategory.UNKNOWN.value
    assert response.required_medical_capability.required_capabilities == ["General Emergency Care"]
    assert any("Understanding failed" in lim for lim in response.metadata.limitations)


def test_orchestrator_capability_failure_degrades(base_payload):
    bad_cap_fn = MagicMock(side_effect=RuntimeError("Capability identification crashed"))
    orchestrator = AIOrchestrator(capability_fn=bad_cap_fn)

    response = orchestrator.process(base_payload)

    assert response.status == PipelineStatus.PARTIAL.value
    assert response.required_medical_capability.required_capabilities == ["General Emergency Care"]
    assert any("Medical capability identification failed" in lim for lim in response.metadata.limitations)


def test_orchestrator_health_summary_failure_degrades(base_payload):
    bad_summary_fn = MagicMock(side_effect=RuntimeError("Summary generator crashed"))
    orchestrator = AIOrchestrator(summary_fn=bad_summary_fn)

    response = orchestrator.process(base_payload)

    assert response.status == PipelineStatus.PARTIAL.value
    assert "No relevant health information" in response.ai_health_summary


def test_orchestrator_report_generator_failure_degrades(base_payload):
    bad_report_fn = MagicMock(side_effect=RuntimeError("Report synthesis crashed"))
    orchestrator = AIOrchestrator(report_fn=bad_report_fn)

    response = orchestrator.process(base_payload)

    assert response.status == PipelineStatus.PARTIAL.value
    assert response.emergency_report.emergency_type == EmergencyCategory.CARDIAC.value


# --- Offline & Fallback Metadata Tests ---

def test_orchestrator_offline_deterministic_fallback_used(base_payload):
    # Mock LLM calls as unavailable to verify Tier 3 fallback reporting
    with patch("src.services.emergency_understanding.tier_fallback_service.TriTierEmergencyService._call_gemini", return_value=None):
        with patch("src.services.emergency_understanding.tier_fallback_service.TriTierEmergencyService._call_local_ollama", return_value=None):
            response = run_ai_pipeline(base_payload)
            assert response.metadata.understanding_tier == "Deterministic Rules"
            assert response.metadata.total_duration_ms >= 0.0


# --- Safety Boundaries ---

def test_orchestrator_never_outputs_hospital_or_treatment(base_payload):
    response = run_ai_pipeline(base_payload)
    d = response.to_backend_dict()

    combined = (
        d["emergency_understanding"] + " " +
        d["required_medical_capability"] + " " +
        d["ai_health_summary"] + " " +
        d["emergency_report"]
    ).lower()

    for forbidden in ["nearest hospital", "km away", "hospital a", "bed count", "prescribe", "administer", "cpr"]:
        assert forbidden not in combined


def test_orchestrator_never_invents_medical_facts(base_payload):
    base_payload["emergency_wallet"]["allergies"] = "Not Available"
    response = run_ai_pipeline(base_payload)

    assert "no allergies" not in response.ai_health_summary.lower()
    assert "no allergies" not in response.to_backend_dict()["ai_health_summary"].lower()