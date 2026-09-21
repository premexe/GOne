"""Unit tests for Tri-Tier Emergency Understanding fallback architecture."""

from unittest.mock import patch

from src.pipeline.input_pipeline import run_input_pipeline
from src.schemas.emergency_understanding import EmergencyCategory, SeverityLevel
from src.services.emergency_understanding.tier_fallback_service import TriTierEmergencyService


def _get_input(description: str):
    payload = {
        "user_id": 1,
        "emergency_description": description,
        "emergency_wallet": None,
        "medical_records": [],
        "emergency": {"sos_id": 1, "description": description},
    }
    return run_input_pipeline(payload).normalized


def test_tier_1_gemini_success():
    service = TriTierEmergencyService()
    norm = _get_input("Crushing chest pain and sweating.")

    with patch.object(
        service,
        "_call_gemini",
        return_value={"emergency_type": "Cardiac Emergency", "confidence": "HIGH", "indicators": ["chest pain"]},
    ):
        res = service.understand(norm)
        assert res.emergency_type == EmergencyCategory.CARDIAC.value
        assert "Tier 1: Cloud Gemini" in res.evidence[0]


def test_tier_1_fails_shifts_to_tier_2_local():
    service = TriTierEmergencyService()
    norm = _get_input("Crushing chest pain and sweating.")

    # Gemini returns None (e.g. 429 quota exhausted), Local Ollama succeeds
    with patch.object(service, "_call_gemini", return_value=None):
        with patch.object(
            service,
            "_call_local_ollama",
            return_value={"emergency_type": "Cardiac Emergency", "confidence": "HIGH", "indicators": ["chest pain"]},
        ):
            res = service.understand(norm)
            assert res.emergency_type == EmergencyCategory.CARDIAC.value
            assert "Tier 2: Local LLM" in res.evidence[0]


def test_tier_1_and_tier_2_fail_shifts_to_tier_3_rules():
    service = TriTierEmergencyService()
    norm = _get_input("Crushing chest pain and sweating.")

    # Both LLMs unavailable -> instant rule-based fallback
    with patch.object(service, "_call_gemini", return_value=None):
        with patch.object(service, "_call_local_ollama", return_value=None):
            res = service.understand(norm)
            assert res.emergency_type == EmergencyCategory.CARDIAC.value
            assert res.severity_level == SeverityLevel.CRITICAL.value
            assert "Tier 3: Deterministic Rule Engine" in res.evidence[0]