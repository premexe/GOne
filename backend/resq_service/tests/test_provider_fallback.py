import pytest
from src.llm.manager import ProviderManager
from src.llm.gemini_provider import GeminiProvider
from src.llm.groq_provider import GroqProvider
from src.llm.deterministic_provider import DeterministicFallbackProvider
from src.protocols.models import EmergencyProtocol

@pytest.mark.asyncio
async def test_deterministic_provider_direct():
    """Verify that the DeterministicFallbackProvider outputs protocol approved actions."""
    provider = DeterministicFallbackProvider()
    protocol = EmergencyProtocol(
        emergency_type="choking",
        severity="critical",
        escalation_condition="Inability to speak",
        source="Red Cross",
        approved_actions=["Deliver 5 firm back blows between shoulder blades."],
        critical_actions=["Back blows."],
        contraindications=["No blind finger sweep."]
    )

    text = await provider.generate_first_aid_guidance(
        transcript="He is choking on food and cannot breathe",
        protocol=protocol,
        patient_context=None,
        history=[],
        language="en"
    )

    assert "back blows" in text.lower()


@pytest.mark.asyncio
async def test_deterministic_fallback_when_apis_missing():
    """Verify ProviderManager cascades through empty-key providers down to DeterministicFallback."""
    manager = ProviderManager()
    
    # Explicit dependency injection: isolate test from .env and network access
    manager.providers = [
        ("Gemini", GeminiProvider(api_key="")),
        ("Groq", GroqProvider(api_key="")),
        ("DeterministicFallback", DeterministicFallbackProvider())
    ]

    protocol = EmergencyProtocol(
        emergency_type="choking",
        severity="critical",
        escalation_condition="Inability to speak",
        source="Red Cross",
        approved_actions=["Deliver 5 firm back blows between shoulder blades."],
        critical_actions=["Back blows."],
        contraindications=["No blind finger sweep."]
    )

    result = await manager.generate_guidance(
        transcript="He is choking on food and cannot breathe",
        protocol=protocol,
        patient_context=None,
        history=[],
        language="en"
    )

    assert result is not None
    assert "text" in result
    # Verify fallback was selected and correct provider reported
    assert result["provider"] == "DeterministicFallback"
    assert result["fallback_used"] is True
    # Verify the clinical action is explicitly present (not just a length check)
    assert "back blows" in result["text"].lower()