"""
Schemas for Emergency Report Generation.

Adheres to standard dataclass conventions matching src/schemas/contract.py,
src/schemas/emergency_understanding.py, and src/schemas/medical_capability.py.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class ReportStatus(str, Enum):
    COMPLETE = "COMPLETE"
    PARTIAL = "PARTIAL"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"


@dataclass(frozen=True)
class EmergencyReportData:
    """
    Structured payload representing a synthesized emergency report.
    """
    sos_id: Optional[int]
    user_id: Optional[int]
    status: str
    emergency_type: str
    severity_level: str
    confidence: str
    key_indicators: List[str] = field(default_factory=list)
    required_capabilities: List[str] = field(default_factory=list)
    health_summary: str = ""
    information_limitations: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class EmergencyReport:
    """
    Final report container providing both structured data and a clean
    human-readable summary for dispatchers and receiving emergency departments.
    """
    report_data: EmergencyReportData
    formatted_report: str
    narrative_summary: str