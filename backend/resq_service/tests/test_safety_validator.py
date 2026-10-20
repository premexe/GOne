from src.safety.validator import SafetyValidator
from src.protocols.models import EmergencyProtocol

def test_prohibits_medication_prescription():
    protocol = EmergencyProtocol(
        emergency_type="cardiac_chest_pain",
        severity="critical",
        escalation_condition="Acute ischemia",
        source="AHA",
        approved_actions=["Have patient rest in a sitting position."],
        critical_actions=["Rest still."],
        contraindications=["Do not prescribe medicines."]
    )

    dangerous_response = "Take 325 mg aspirin immediately and swallow it with water."
    is_safe, sanitized = SafetyValidator.validate(dangerous_response, protocol)
    
    assert is_safe is False
    assert "Take 325 mg aspirin" not in sanitized
    assert "Have patient rest" in sanitized

def test_allows_safe_approved_instructions():
    protocol = EmergencyProtocol(
        emergency_type="severe_bleeding",
        severity="critical",
        escalation_condition="Arterial spurting",
        source="Red Cross",
        approved_actions=["Apply firm direct pressure with a clean cloth."],
        critical_actions=["Direct pressure."],
        contraindications=["Never remove embedded objects."]
    )

    safe_response = "Please apply firm direct pressure with a clean cloth onto the cut right now."
    is_safe, sanitized = SafetyValidator.validate(safe_response, protocol)
    
    assert is_safe is True
    assert sanitized == safe_response