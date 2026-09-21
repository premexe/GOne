"""
Schemas for Phase 6: Required Medical Capability Identification.

Adheres to standard dataclass conventions matching src/schemas/contract.py
and src/schemas/emergency_understanding.py.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class MedicalCapability(str, Enum):
    GENERAL_EMERGENCY_CARE = "General Emergency Care"
    CARDIOLOGY_SUPPORT = "Cardiology Support"
    RESPIRATORY_SUPPORT = "Respiratory Support"
    TRAUMA_CARE = "Trauma Care"
    BLEEDING_SURGICAL_SUPPORT = "Bleeding / Surgical Support"
    NEUROLOGICAL_CARE = "Neurological Care"
    BURN_CARE = "Burn Care"
    CRITICAL_CARE_SUPPORT = "Critical Care Support"


class CapabilityMappingStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"


@dataclass(frozen=True)
class MedicalCapabilityResult:
    """
    Structured result of required hospital medical capabilities.

    Identifies broad care capability needs without ranking, selecting,
    or routing to specific hospitals.
    """
    required_capabilities: List[str] = field(default_factory=list)
    confidence: str = "HIGH"
    status: str = CapabilityMappingStatus.SUCCESS.value
    reasoning: str = ""