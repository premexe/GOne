"""Unit tests for Emergency Report Generation."""

from src.schemas.emergency_report import ReportStatus
from src.schemas.emergency_understanding import (
    ConfidenceLevel,
    EmergencyCategory,
    EmergencyUnderstandingResult,
    SeverityLevel,
)
from src.schemas.medical_capability import (
    CapabilityMappingStatus,
    MedicalCapability,
    MedicalCapabilityResult,
)
from src.services.emergency_report import generate_emergency_report
from src.services.health_summary.health_summary_generator import NO_HEALTH_INFO_MESSAGE


def _mock_understanding(emg_type="Cardiac Emergency", sev="CRITICAL", indicators=None, conf="HIGH"):
    return EmergencyUnderstandingResult(
        emergency_type=emg_type,
        severity_level=sev,
        confidence=conf,
        indicators=indicators or ["crushing chest pain", "sweating"],
        evidence=["Reported symptoms match crushing chest pain"],
    )


def _mock_capability(caps=None, status="SUCCESS"):
    return MedicalCapabilityResult(
        required_capabilities=caps or [
            MedicalCapability.GENERAL_EMERGENCY_CARE.value,
            MedicalCapability.CARDIOLOGY_SUPPORT.value,
            MedicalCapability.CRITICAL_CARE_SUPPORT.value,
        ],
        confidence="HIGH",
        status=status,
        reasoning="Cardiac Critical requires cardiology and critical care support.",
    )


# --- Complete Report Tests Across Categories ---

def test_complete_cardiac_critical_report():
    report = generate_emergency_report(
        understanding=_mock_understanding(emg_type=EmergencyCategory.CARDIAC.value, sev=SeverityLevel.CRITICAL.value),
        capability=_mock_capability(),
        health_summary="Blood group: B+. Chronic conditions: Hypertension. Current medications: Amlodipine.",
        sos_id=101,
        user_id=1,
    )
    assert report.report_data.status == ReportStatus.COMPLETE.value
    assert report.report_data.emergency_type == EmergencyCategory.CARDIAC.value
    assert report.report_data.severity_level == SeverityLevel.CRITICAL.value
    assert "Cardiology Support" in report.report_data.required_capabilities
    assert "Hypertension" in report.report_data.health_summary
    assert report.report_data.sos_id == 101
    assert len(report.report_data.information_limitations) == 0
    assert "CRITICAL priority emergency" in report.narrative_summary


def test_complete_trauma_critical_report():
    und = _mock_understanding(
        emg_type=EmergencyCategory.TRAUMA.value,
        sev=SeverityLevel.CRITICAL.value,
        indicators=["road accident", "heavy bleeding"],
    )
    cap = _mock_capability(caps=["General Emergency Care", "Trauma Care", "Bleeding / Surgical Support", "Critical Care Support"])
    report = generate_emergency_report(
        understanding=und,
        capability=cap,
        health_summary="Blood group: O+.",
        sos_id=202,
        user_id=2,
    )
    assert report.report_data.status == ReportStatus.COMPLETE.value
    assert report.report_data.emergency_type == EmergencyCategory.TRAUMA.value
    assert "Trauma Care" in report.report_data.required_capabilities
    assert "Bleeding / Surgical Support" in report.report_data.required_capabilities


def test_complete_respiratory_emergency_report():
    und = _mock_understanding(
        emg_type=EmergencyCategory.RESPIRATORY.value,
        sev=SeverityLevel.HIGH.value,
        indicators=["struggling to breathe"],
    )
    cap = _mock_capability(caps=["General Emergency Care", "Respiratory Support", "Critical Care Support"])
    report = generate_emergency_report(
        understanding=und,
        capability=cap,
        health_summary="Chronic conditions: Asthma. Current medications: Inhaler.",
    )
    assert report.report_data.status == ReportStatus.COMPLETE.value
    assert "Respiratory Support" in report.report_data.required_capabilities


def test_complete_burn_emergency_report():
    und = _mock_understanding(
        emg_type=EmergencyCategory.BURN_INJURY.value,
        sev=SeverityLevel.HIGH.value,
        indicators=["large burn on arm"],
    )
    cap = _mock_capability(caps=["General Emergency Care", "Burn Care"])
    report = generate_emergency_report(
        understanding=und,
        capability=cap,
        health_summary=NO_HEALTH_INFO_MESSAGE,
    )
    assert report.report_data.emergency_type == EmergencyCategory.BURN_INJURY.value
    assert "Burn Care" in report.report_data.required_capabilities
    assert report.report_data.status == ReportStatus.PARTIAL.value


# --- Missing & Unknown Value Handling Tests ---

def test_missing_health_summary_handled_safely():
    report = generate_emergency_report(
        understanding=_mock_understanding(),
        capability=_mock_capability(),
        health_summary=None,
    )
    assert report.report_data.status == ReportStatus.PARTIAL.value
    assert report.report_data.health_summary == NO_HEALTH_INFO_MESSAGE
    assert any("wallet" in lim.lower() for lim in report.report_data.information_limitations)


def test_unknown_emergency_type_yields_insufficient_information():
    und = _mock_understanding(emg_type=EmergencyCategory.UNKNOWN.value, sev=SeverityLevel.UNKNOWN.value, indicators=[])
    cap = _mock_capability(caps=["General Emergency Care"], status=CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value)
    report = generate_emergency_report(understanding=und, capability=cap, health_summary="Blood group: A+.")
    assert report.report_data.status == ReportStatus.INSUFFICIENT_INFORMATION.value
    assert report.report_data.emergency_type == EmergencyCategory.UNKNOWN.value
    assert any("emergency type" in lim.lower() for lim in report.report_data.information_limitations)


def test_unknown_severity_preserved():
    und = _mock_understanding(sev=SeverityLevel.UNKNOWN.value)
    report = generate_emergency_report(understanding=und, capability=_mock_capability())
    assert report.report_data.severity_level == SeverityLevel.UNKNOWN.value
    assert any("severity level" in lim.lower() for lim in report.report_data.information_limitations)


def test_missing_understanding_handled_gracefully():
    report = generate_emergency_report(
        understanding=None,
        capability=_mock_capability(),
        health_summary="Blood group: B+.",
    )
    assert report.report_data.status == ReportStatus.INSUFFICIENT_INFORMATION.value
    assert report.report_data.emergency_type == EmergencyCategory.UNKNOWN.value
    assert any("understanding" in lim.lower() for lim in report.report_data.information_limitations)


def test_missing_capability_handled_gracefully():
    report = generate_emergency_report(
        understanding=_mock_understanding(),
        capability=None,
        health_summary="Blood group: B+.",
    )
    assert report.report_data.status == ReportStatus.INSUFFICIENT_INFORMATION.value
    assert report.report_data.required_capabilities == ["General Emergency Care"]
    assert any("capability" in lim.lower() for lim in report.report_data.information_limitations)


def test_missing_all_inputs_produces_safe_fallback():
    report = generate_emergency_report(
        understanding=None,
        capability=None,
        health_summary=None,
        sos_id=None,
        user_id=None,
    )
    assert report.report_data.status == ReportStatus.INSUFFICIENT_INFORMATION.value
    assert report.report_data.emergency_type == EmergencyCategory.UNKNOWN.value
    assert report.report_data.severity_level == SeverityLevel.UNKNOWN.value
    assert report.report_data.required_capabilities == ["General Emergency Care"]
    assert report.report_data.health_summary == NO_HEALTH_INFO_MESSAGE
    assert len(report.report_data.information_limitations) > 0


# --- Conflict & Non-Invention Tests ---

def test_conflicting_inputs_preserve_upstream_values():
    # If understanding has Cardiac Emergency but capability is partial
    und = _mock_understanding(emg_type=EmergencyCategory.CARDIAC.value, sev=SeverityLevel.HIGH.value)
    cap = MedicalCapabilityResult(
        required_capabilities=["General Emergency Care"],
        confidence="LOW",
        status=CapabilityMappingStatus.PARTIAL.value,
        reasoning="Partial mapping",
    )
    report = generate_emergency_report(understanding=und, capability=cap, health_summary="Allergies: Penicillin.")
    assert report.report_data.emergency_type == EmergencyCategory.CARDIAC.value
    assert report.report_data.required_capabilities == ["General Emergency Care"]
    assert report.report_data.status == ReportStatus.PARTIAL.value


def test_report_does_not_infer_diagnosis_from_health_summary():
    und = _mock_understanding(emg_type=EmergencyCategory.UNKNOWN.value, sev=SeverityLevel.UNKNOWN.value, indicators=[])
    cap = _mock_capability()
    # Health summary mentions previous cardiac condition, but emergency is UNKNOWN
    report = generate_emergency_report(
        understanding=und,
        capability=cap,
        health_summary="Chronic conditions: Hypertension, Previous cardiac history.",
    )
    # The report must NOT change emergency_type to Cardiac Emergency
    assert report.report_data.emergency_type == EmergencyCategory.UNKNOWN.value


# --- Security & Medical Boundary Tests ---

def test_report_does_not_produce_treatment_advice():
    report = generate_emergency_report(
        understanding=_mock_understanding(emg_type=EmergencyCategory.CARDIAC.value, sev=SeverityLevel.CRITICAL.value),
        capability=_mock_capability(),
        health_summary="Allergies: Penicillin.",
    )
    full_text = report.formatted_report.lower() + " " + report.narrative_summary.lower()
    for forbidden in ["administer", "prescribe", "give aspirin", "perform cpr", "defibrillate", "intubate"]:
        assert forbidden not in full_text


def test_report_does_not_select_or_rank_hospitals():
    report = generate_emergency_report(
        understanding=_mock_understanding(),
        capability=_mock_capability(),
        health_summary="Blood group: O+.",
    )
    full_text = report.formatted_report.lower() + " " + report.narrative_summary.lower()
    for forbidden in ["hospital a", "hospital b", "distance", "nearest hospital", "ranking", "bed count", "route"]:
        assert forbidden not in full_text


def test_formatted_report_structure():
    report = generate_emergency_report(
        understanding=_mock_understanding(),
        capability=_mock_capability(),
        health_summary="Known allergies: Penicillin.",
        sos_id=555,
        user_id=42,
    )
    assert "G-ONE EMERGENCY INCIDENT REPORT" in report.formatted_report
    assert "SOS ID:                 555" in report.formatted_report
    assert "User ID:                42" in report.formatted_report
    assert "Emergency Type:         Cardiac Emergency" in report.formatted_report
    assert "Severity Level:         CRITICAL" in report.formatted_report