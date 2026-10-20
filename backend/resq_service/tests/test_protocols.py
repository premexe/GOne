from src.protocols.registry import ProtocolRegistry

def test_protocol_registry_loads_all_essential_protocols():
    registry = ProtocolRegistry()
    required = [
        "severe_bleeding",
        "cardiac_chest_pain",
        "breathing_difficulty",
        "choking",
        "unconscious_unresponsive",
        "burns",
        "trauma_injury",
        "neurological_symptoms",
        "general_emergency"
    ]
    for req in required:
        protocol = registry.get_protocol(req)
        assert protocol is not None
        assert protocol.emergency_type == req
        assert len(protocol.approved_actions) > 0