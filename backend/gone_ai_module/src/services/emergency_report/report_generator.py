"""
Deterministic Emergency Report Generator Service.

Synthesizes structured outputs from upstream components:
  - Emergency Understanding + Severity
  - Required Medical Capability Identification
  - AI Health Summary

Constraints:
  - Pure deterministic synthesis (no LLM, no external calls).
  - Preserves upstream values without overrides or diagnosis.
  - Distinguishes known information from unavailable limitations.
  - Does not select or rank hospitals.
"""

from typing import List, Optional

from src.schemas.emergency_report import EmergencyReport, EmergencyReportData, ReportStatus
from src.schemas.emergency_understanding import (
    ConfidenceLevel,
    EmergencyCategory,
    EmergencyUnderstandingResult,
    SeverityLevel,
)
from src.schemas.medical_capability import MedicalCapabilityResult
from src.services.health_summary.health_summary_generator import NO_HEALTH_INFO_MESSAGE


class EmergencyReportGenerator:
    def generate(
        self,
        understanding: Optional[EmergencyUnderstandingResult] = None,
        capability: Optional[MedicalCapabilityResult] = None,
        health_summary: Optional[str] = None,
        sos_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> EmergencyReport:
        """
        Synthesizes upstream structured results into an EmergencyReport.
        """
        limitations: List[str] = []

        # 1. Process Emergency Understanding & Severity
        if understanding is None:
            emergency_type = EmergencyCategory.UNKNOWN.value
            severity_level = SeverityLevel.UNKNOWN.value
            confidence = ConfidenceLevel.LOW.value
            key_indicators: List[str] = []
            limitations.append("Emergency understanding result was not provided.")
        else:
            emergency_type = understanding.emergency_type or EmergencyCategory.UNKNOWN.value
            severity_level = understanding.severity_level or SeverityLevel.UNKNOWN.value
            confidence = understanding.confidence or ConfidenceLevel.LOW.value
            key_indicators = list(understanding.indicators or [])

            if emergency_type == EmergencyCategory.UNKNOWN.value:
                limitations.append("Specific emergency type could not be determined from available indicators.")
            if severity_level == SeverityLevel.UNKNOWN.value:
                limitations.append("Severity level could not be determined.")

        # 2. Process Medical Capabilities
        if capability is None:
            required_capabilities = ["General Emergency Care"]
            limitations.append("Medical capability identification result was not provided; defaulted to General Emergency Care.")
        else:
            required_capabilities = list(capability.required_capabilities or ["General Emergency Care"])
            if capability.status != "SUCCESS":
                limitations.append(f"Capability status indicated: {capability.status}.")

        # 3. Process Health Summary
        if not health_summary or health_summary.strip() == "":
            final_health_summary = NO_HEALTH_INFO_MESSAGE
            limitations.append("No prior emergency wallet or medical record information was available.")
        else:
            final_health_summary = health_summary.strip()
            if final_health_summary == NO_HEALTH_INFO_MESSAGE:
                limitations.append("No prior emergency wallet or medical record information was available.")

        # 4. Determine Overall Report Status
        critical_missing = understanding is None or capability is None
        has_unknown_type = emergency_type == EmergencyCategory.UNKNOWN.value

        if critical_missing or has_unknown_type:
            status = ReportStatus.INSUFFICIENT_INFORMATION.value
        elif len(limitations) > 0:
            status = ReportStatus.PARTIAL.value
        else:
            status = ReportStatus.COMPLETE.value

        # 5. Build Human-Readable Narrative and Formatted Report
        indicators_str = ", ".join(key_indicators) if key_indicators else "None reported"
        capabilities_str = ", ".join(required_capabilities)

        narrative = (
            f"{severity_level} priority emergency ({emergency_type}). "
            f"Key indicators: {indicators_str}. "
            f"Required care capabilities: {capabilities_str}. "
            f"Patient context: {final_health_summary}"
        )

        formatted_lines = [
            "==================================================",
            "             G-ONE EMERGENCY INCIDENT REPORT       ",
            "==================================================",
            f"Status:                 {status}",
            f"SOS ID:                 {sos_id if sos_id is not None else 'N/A'}",
            f"User ID:                {user_id if user_id is not None else 'N/A'}",
            "--------------------------------------------------",
            f"Emergency Type:         {emergency_type}",
            f"Severity Level:         {severity_level}",
            f"Classification Conf:    {confidence}",
            f"Key Indicators:         {indicators_str}",
            "--------------------------------------------------",
            f"Required Capabilities:  {capabilities_str}",
            "--------------------------------------------------",
            "Relevant Health Information:",
            f"  {final_health_summary}",
            "--------------------------------------------------",
            "Information Limitations / Missing Data:",
        ]

        if limitations:
            for lim in limitations:
                formatted_lines.append(f"  - {lim}")
        else:
            formatted_lines.append("  - None. Complete information available.")
        formatted_lines.append("==================================================")

        formatted_report = "\n".join(formatted_lines)

        report_data = EmergencyReportData(
            sos_id=sos_id,
            user_id=user_id,
            status=status,
            emergency_type=emergency_type,
            severity_level=severity_level,
            confidence=confidence,
            key_indicators=key_indicators,
            required_capabilities=required_capabilities,
            health_summary=final_health_summary,
            information_limitations=limitations,
        )

        return EmergencyReport(
            report_data=report_data,
            formatted_report=formatted_report,
            narrative_summary=narrative,
        )


_DEFAULT_REPORT_GENERATOR = EmergencyReportGenerator()


def generate_emergency_report(
    understanding: Optional[EmergencyUnderstandingResult] = None,
    capability: Optional[MedicalCapabilityResult] = None,
    health_summary: Optional[str] = None,
    sos_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> EmergencyReport:
    """Convenience helper to synthesize and produce an EmergencyReport."""
    return _DEFAULT_REPORT_GENERATOR.generate(
        understanding=understanding,
        capability=capability,
        health_summary=health_summary,
        sos_id=sos_id,
        user_id=user_id,
    )