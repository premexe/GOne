"""Unit tests for Phase 6: Required Medical Capability Identification."""

from src.schemas.emergency_understanding import (
    ConfidenceLevel,
    EmergencyCategory,
    EmergencyUnderstandingResult,
    SeverityLevel,
)
from src.schemas.medical_capability import (
    CapabilityMappingStatus,
    MedicalCapability,
)
from src.services.medical_capability import identify_required_capabilities


def _make_understanding(cat: str, sev: str, indicators=None, conf="HIGH"):
    return EmergencyUnderstandingResult(
        emergency_type=cat,
        severity_level=sev,
        confidence=conf,
        indicators=indicators or [],
        evidence=["Clinical observation reported"],
    )


# --- Category Capability Mapping Tests ---

def test_cardiac_moderate():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.CARDIAC.value, SeverityLevel.MODERATE.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.CARDIOLOGY_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value not in res.required_capabilities
    assert res.status == CapabilityMappingStatus.SUCCESS.value


def test_cardiac_critical_adds_critical_care():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.CARDIAC.value, SeverityLevel.CRITICAL.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.CARDIOLOGY_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_respiratory_emergency():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.RESPIRATORY.value, SeverityLevel.HIGH.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.RESPIRATORY_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_trauma_moderate():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.TRAUMA.value, SeverityLevel.MODERATE.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.TRAUMA_CARE.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value not in res.required_capabilities


def test_trauma_critical_adds_critical_care():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.TRAUMA.value, SeverityLevel.CRITICAL.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.TRAUMA_CARE.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_severe_bleeding_critical():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.SEVERE_BLEEDING.value, SeverityLevel.CRITICAL.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.BLEEDING_SURGICAL_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_neurological_emergency():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.NEUROLOGICAL.value, SeverityLevel.HIGH.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.NEUROLOGICAL_CARE.value in res.required_capabilities


def test_unconsciousness_emergency():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.UNCONSCIOUSNESS.value, SeverityLevel.CRITICAL.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_burn_injury_moderate():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.BURN_INJURY.value, SeverityLevel.MODERATE.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.BURN_CARE.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value not in res.required_capabilities


def test_burn_injury_critical():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.BURN_INJURY.value, SeverityLevel.CRITICAL.value))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.BURN_CARE.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


# --- Compound Emergency Tests ---

def test_compound_trauma_with_severe_bleeding():
    res = identify_required_capabilities(_make_understanding(
        EmergencyCategory.TRAUMA.value,
        SeverityLevel.CRITICAL.value,
        indicators=["major physical trauma", "heavy bleeding"],
    ))
    assert MedicalCapability.GENERAL_EMERGENCY_CARE.value in res.required_capabilities
    assert MedicalCapability.TRAUMA_CARE.value in res.required_capabilities
    assert MedicalCapability.BLEEDING_SURGICAL_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


def test_compound_burn_with_airway_distress():
    res = identify_required_capabilities(_make_understanding(
        EmergencyCategory.BURN_INJURY.value,
        SeverityLevel.CRITICAL.value,
        indicators=["extensive burns", "difficulty breathing"],
    ))
    assert MedicalCapability.BURN_CARE.value in res.required_capabilities
    assert MedicalCapability.RESPIRATORY_SUPPORT.value in res.required_capabilities
    assert MedicalCapability.CRITICAL_CARE_SUPPORT.value in res.required_capabilities


# --- Safety, Unknown, and Edge Case Tests ---

def test_unknown_emergency_category_defaults_safely():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.UNKNOWN.value, SeverityLevel.UNKNOWN.value))
    assert res.required_capabilities == [MedicalCapability.GENERAL_EMERGENCY_CARE.value]
    assert res.status == CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value
    assert res.confidence == ConfidenceLevel.LOW.value


def test_none_input_handled_safely():
    res = identify_required_capabilities(None)
    assert res.required_capabilities == [MedicalCapability.GENERAL_EMERGENCY_CARE.value]
    assert res.status == CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value


def test_empty_fields_in_understanding():
    res = identify_required_capabilities(EmergencyUnderstandingResult(
        emergency_type="",
        severity_level="",
        confidence="",
    ))
    assert res.required_capabilities == [MedicalCapability.GENERAL_EMERGENCY_CARE.value]
    assert res.status == CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value


def test_no_hospital_names_or_ranking_output():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.CARDIAC.value, SeverityLevel.CRITICAL.value))
    combined_text = " ".join(res.required_capabilities).lower() + " " + res.reasoning.lower()
    for forbidden in ["hospital", "clinic", "km", "distance", "nearest", "rank", "score", "bed", "admit"]:
        assert forbidden not in combined_text


def test_no_treatment_or_medication_advice_output():
    res = identify_required_capabilities(_make_understanding(EmergencyCategory.CARDIAC.value, SeverityLevel.CRITICAL.value))
    combined_text = " ".join(res.required_capabilities).lower() + " " + res.reasoning.lower()
    for forbidden in ["aspirin", "cpr", "surgery", "dose", "intubate", "administer", "prescribe"]:
        assert forbidden not in combined_text