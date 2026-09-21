"""
Schemas for Phase 8: AI Orchestrator and Final AI Response Contract.

Provides a structured envelope containing outputs from all intelligence
components, execution observability metadata, and compatibility with the
locked Backend -> AI Input/Output Contract.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from src.schemas.emergency_report import EmergencyReportData
from src.schemas.emergency_understanding import EmergencyUnderstandingResult
from src.schemas.medical_capability import MedicalCapabilityResult


class PipelineStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"
    PROCESSING_FAILED = "PROCESSING_FAILED"


@dataclass(frozen=True)
class ComponentExecutionMetadata:
    name: str
    status: str
    duration_ms: float
    fallback_used: Optional[str] = None
    error_code: Optional[str] = None


@dataclass(frozen=True)
class AIResponseMetadata:
    pipeline_status: str
    total_duration_ms: float
    understanding_tier: str
    components: List[ComponentExecutionMetadata] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class FinalAIResponse:
    """
    Final structured envelope returned by the G-ONE AI Module.

    Contains both the rich structured outputs and the legacy top-level
    fields required by AI_Input_Output_Contract.md.
    """
    user_id: int
    status: str
    emergency_understanding: EmergencyUnderstandingResult
    severity: str
    required_medical_capability: MedicalCapabilityResult
    ai_health_summary: str
    emergency_report: EmergencyReportData
    metadata: AIResponseMetadata

    def to_backend_dict(self) -> Dict[str, Any]:
        """
        Export dictionary strictly matching the Backend -> AI Output Contract
        defined in AI_Input_Output_Contract.md (Section 10).
        """
        capabilities_str = ", ".join(self.required_medical_capability.required_capabilities)
        indicators_str = ", ".join(self.emergency_understanding.indicators)
        understanding_summary = (
            f"Possible {self.emergency_understanding.emergency_type.lower()} "
            f"based on reported symptoms ({indicators_str})."
            if indicators_str
            else f"Possible {self.emergency_understanding.emergency_type.lower()} based on reported symptoms."
        )

        return {
            "user_id": self.user_id,
            "emergency_understanding": understanding_summary,
            "severity": self.severity,
            "required_medical_capability": capabilities_str,
            "ai_health_summary": self.ai_health_summary,
            "emergency_report": (
                f"{self.severity} priority emergency ({self.emergency_understanding.emergency_type}). "
                f"Key indicators: {indicators_str or 'None reported'}. "
                f"Required capabilities: {capabilities_str}. "
                f"Patient context: {self.ai_health_summary}"
            ),
        }