"""
Medical Capability Identification Service.

Consumes structured Emergency Understanding + Severity results to determine
broad hospital medical capabilities.
- Deterministic, explainable, and offline.
- Conservative: CRITICAL severity or high-risk indicators add Critical Care Support.
- UNKNOWN / missing data falls back safely to General Emergency Care.
- Strictly does not select, rank, or mention specific hospitals.
"""

from typing import List, Optional, Set

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
from src.services.medical_capability.capability_definitions import (
    CATEGORY_BASE_CAPABILITIES,
    INDICATOR_CAPABILITY_ADDITIONS,
)


class MedicalCapabilityService:
    def identify(self, understanding: Optional[EmergencyUnderstandingResult]) -> MedicalCapabilityResult:
        """
        Identify required hospital capabilities from structured emergency understanding.
        """
        if understanding is None:
            return MedicalCapabilityResult(
                required_capabilities=[MedicalCapability.GENERAL_EMERGENCY_CARE.value],
                confidence=ConfidenceLevel.LOW.value,
                status=CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value,
                reasoning="Missing emergency understanding; defaulting to General Emergency Care.",
            )

        emg_type = understanding.emergency_type or EmergencyCategory.UNKNOWN.value
        severity = understanding.severity_level or SeverityLevel.UNKNOWN.value
        indicators = understanding.indicators or []

        # 1. Handle UNKNOWN / Ambiguous Category
        if emg_type == EmergencyCategory.UNKNOWN.value or emg_type not in CATEGORY_BASE_CAPABILITIES:
            return MedicalCapabilityResult(
                required_capabilities=[MedicalCapability.GENERAL_EMERGENCY_CARE.value],
                confidence=ConfidenceLevel.LOW.value,
                status=CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value,
                reasoning="Emergency category is UNKNOWN; safe default is General Emergency Care.",
            )

        # 2. Base Category Capabilities
        caps: List[MedicalCapability] = list(CATEGORY_BASE_CAPABILITIES[emg_type])
        reasons: List[str] = [f"{emg_type} requires {', '.join(c.value for c in caps)}"]

        # 3. Compound Indicator Additions
        for indicator in indicators:
            ind_lower = indicator.lower()
            for key, additional_cap in INDICATOR_CAPABILITY_ADDITIONS.items():
                if key in ind_lower and additional_cap not in caps:
                    caps.append(additional_cap)
                    reasons.append(f"Reported indicator '{indicator}' requires {additional_cap.value}")

        # 4. Severity-Driven Upgrades
        if severity == SeverityLevel.CRITICAL.value:
            if MedicalCapability.CRITICAL_CARE_SUPPORT not in caps:
                caps.append(MedicalCapability.CRITICAL_CARE_SUPPORT)
                reasons.append("CRITICAL severity requires Critical Care Support")
        elif severity == SeverityLevel.HIGH.value:
            # High respiratory or high unconsciousness emergencies benefit from critical care readiness
            if emg_type in (
                EmergencyCategory.RESPIRATORY.value,
                EmergencyCategory.UNCONSCIOUSNESS.value,
            ) and MedicalCapability.CRITICAL_CARE_SUPPORT not in caps:
                caps.append(MedicalCapability.CRITICAL_CARE_SUPPORT)
                reasons.append("HIGH severity with vital system compromise suggests Critical Care readiness")

        # Deduplicate while preserving order
        seen: Set[str] = set()
        deduped_caps: List[str] = []
        for c in caps:
            if c.value not in seen:
                seen.add(c.value)
                deduped_caps.append(c.value)

        # Determine confidence and status
        confidence = understanding.confidence or ConfidenceLevel.HIGH.value
        status = CapabilityMappingStatus.SUCCESS.value if confidence == ConfidenceLevel.HIGH.value else CapabilityMappingStatus.PARTIAL.value

        return MedicalCapabilityResult(
            required_capabilities=deduped_caps,
            confidence=confidence,
            status=status,
            reasoning="; ".join(reasons) + ".",
        )


_DEFAULT_CAPABILITY_SERVICE = MedicalCapabilityService()


def identify_required_capabilities(understanding: Optional[EmergencyUnderstandingResult]) -> MedicalCapabilityResult:
    """Convenience helper to identify required capabilities from an EmergencyUnderstandingResult."""
    return _DEFAULT_CAPABILITY_SERVICE.identify(understanding)