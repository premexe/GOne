"""
Schemas for Phase 3: Emergency Understanding and Severity Assessment.

Maintains standard library dataclass conventions consistent with
src/schemas/contract.py (no third-party dependencies required).
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class EmergencyCategory(str, Enum):
    CARDIAC = "Cardiac Emergency"
    RESPIRATORY = "Respiratory Emergency"
    TRAUMA = "Trauma / Accident"
    SEVERE_BLEEDING = "Severe Bleeding"
    NEUROLOGICAL = "Neurological Emergency"
    UNCONSCIOUSNESS = "Unconsciousness / Altered Consciousness"
    BURN_INJURY = "Burn Injury"
    UNKNOWN = "UNKNOWN"


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass(frozen=True)
class EmergencyUnderstandingResult:
    """
    Structured result of emergency understanding and severity assessment.

    Exposes indicators and concise evidence without echoing raw patient PII
    or unconfirmed clinical diagnoses.
    """
    emergency_type: str
    severity_level: str
    confidence: str
    indicators: List[str] = field(default_factory=list)
    evidence: List[str] = field(default_factory=list)