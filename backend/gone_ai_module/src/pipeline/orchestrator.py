"""
AI Orchestrator.

Coordinates all G-ONE AI components in dependency order:
  1. Input validation and preprocessing (Phase 1)
  2. Emergency understanding and severity triage (Phases 3 / 5A)
  3. Required medical capability identification (Phase 6)
  4. AI health summary generation (Phase 2)
  5. Emergency report synthesis (Phase 7)

Safety guarantees:
  - Pure coordination: contains zero medical rules or specialty mappings.
  - Component failure isolation: degrades gracefully to partial/insufficient.
  - No hospital selection, bed tracking, or Readiness Score calculation.
  - Completely offline capable via deterministic rule engines.
"""

import time
from typing import Any, Dict, List, Optional

from src.pipeline.input_pipeline import run_input_pipeline
from src.schemas.ai_response import (
    AIResponseMetadata,
    ComponentExecutionMetadata,
    FinalAIResponse,
    PipelineStatus,
)
from src.schemas.contract import NormalizedInput
from src.schemas.emergency_report import EmergencyReportData, ReportStatus
from src.schemas.emergency_understanding import (
    ConfidenceLevel,
    EmergencyCategory,
    EmergencyUnderstandingResult,
    SeverityLevel,
)
from src.schemas.errors import ValidationError
from src.schemas.medical_capability import (
    CapabilityMappingStatus,
    MedicalCapability,
    MedicalCapabilityResult,
)
from src.services.emergency_report import generate_emergency_report
from src.services.emergency_understanding import understand_emergency_tier
from src.services.health_summary import generate_health_summary
from src.services.health_summary.health_summary_generator import NO_HEALTH_INFO_MESSAGE
from src.services.medical_capability import identify_required_capabilities


class AIOrchestrator:
    def __init__(self, understanding_fn=None, capability_fn=None, summary_fn=None, report_fn=None):
        self._understanding_fn = understanding_fn or understand_emergency_tier
        self._capability_fn = capability_fn or identify_required_capabilities
        self._summary_fn = summary_fn or generate_health_summary
        self._report_fn = report_fn or generate_emergency_report

    def process(self, raw_payload: Dict[str, Any]) -> FinalAIResponse:
        """
        Execute the full AI processing workflow on a raw Backend -> AI payload.
        """
        t_start = time.perf_counter()
        components_meta: List[ComponentExecutionMetadata] = []
        limitations: List[str] = []
        user_id = raw_payload.get("user_id") if isinstance(raw_payload, dict) else 0

        # --- Step 1: Input Validation and Preprocessing ---
        t0 = time.perf_counter()
        preprocessed = run_input_pipeline(raw_payload)
        norm_input: NormalizedInput = preprocessed.normalized
        user_id = norm_input.user_id
        dt_val = (time.perf_counter() - t0) * 1000.0
        components_meta.append(ComponentExecutionMetadata(name="input_pipeline", status="SUCCESS", duration_ms=dt_val))

        # --- Step 2: Emergency Understanding & Severity ---
        t0 = time.perf_counter()
        tier_used = "Deterministic Rules"
        try:
            understanding_res = self._understanding_fn(norm_input)
            if understanding_res.evidence:
                first_ev = understanding_res.evidence[0]
                if "Tier 1: Cloud Gemini" in first_ev:
                    tier_used = "Cloud Gemini"
                elif "Tier 2: Local LLM" in first_ev:
                    tier_used = "Local Ollama"
            dt_und = (time.perf_counter() - t0) * 1000.0
            components_meta.append(
                ComponentExecutionMetadata(name="emergency_understanding", status="SUCCESS", duration_ms=dt_und, fallback_used=tier_used)
            )
        except Exception as e:
            dt_und = (time.perf_counter() - t0) * 1000.0
            components_meta.append(
                ComponentExecutionMetadata(name="emergency_understanding", status="FAILED", duration_ms=dt_und, error_code=type(e).__name__)
            )
            understanding_res = EmergencyUnderstandingResult(
                emergency_type=EmergencyCategory.UNKNOWN.value,
                severity_level=SeverityLevel.UNKNOWN.value,
                confidence=ConfidenceLevel.LOW.value,
                indicators=[],
                evidence=["Emergency Understanding failed; safe default applied."],
            )
            limitations.append("Emergency Understanding failed during execution.")

        # --- Step 3: Required Medical Capability Identification ---
        t0 = time.perf_counter()
        try:
            capability_res = self._capability_fn(understanding_res)
            dt_cap = (time.perf_counter() - t0) * 1000.0
            components_meta.append(ComponentExecutionMetadata(name="medical_capability", status="SUCCESS", duration_ms=dt_cap))
        except Exception as e:
            dt_cap = (time.perf_counter() - t0) * 1000.0
            components_meta.append(
                ComponentExecutionMetadata(name="medical_capability", status="FAILED", duration_ms=dt_cap, error_code=type(e).__name__)
            )
            capability_res = MedicalCapabilityResult(
                required_capabilities=[MedicalCapability.GENERAL_EMERGENCY_CARE.value],
                confidence=ConfidenceLevel.LOW.value,
                status=CapabilityMappingStatus.INSUFFICIENT_INFORMATION.value,
                reasoning="Capability identification failed; safe default applied.",
            )
            limitations.append("Medical capability identification failed during execution.")

        # --- Step 4: AI Health Summary Generation ---
        t0 = time.perf_counter()
        try:
            health_summary_str = self._summary_fn(wallet=norm_input.wallet, medical_records=norm_input.medical_records)
            dt_sum = (time.perf_counter() - t0) * 1000.0
            components_meta.append(ComponentExecutionMetadata(name="health_summary", status="SUCCESS", duration_ms=dt_sum))
        except Exception as e:
            dt_sum = (time.perf_counter() - t0) * 1000.0
            components_meta.append(
                ComponentExecutionMetadata(name="health_summary", status="FAILED", duration_ms=dt_sum, error_code=type(e).__name__)
            )
            health_summary_str = NO_HEALTH_INFO_MESSAGE
            limitations.append("Health summary generation failed during execution.")

        # --- Step 5: Emergency Report Generation ---
        t0 = time.perf_counter()
        sos_id = norm_input.emergency_context.sos_id if norm_input.emergency_context else None
        try:
            report_wrapper = self._report_fn(
                understanding=understanding_res,
                capability=capability_res,
                health_summary=health_summary_str,
                sos_id=sos_id,
                user_id=user_id,
            )
            report_data: EmergencyReportData = report_wrapper.report_data
            dt_rep = (time.perf_counter() - t0) * 1000.0
            components_meta.append(ComponentExecutionMetadata(name="emergency_report", status="SUCCESS", duration_ms=dt_rep))
        except Exception as e:
            dt_rep = (time.perf_counter() - t0) * 1000.0
            components_meta.append(
                ComponentExecutionMetadata(name="emergency_report", status="FAILED", duration_ms=dt_rep, error_code=type(e).__name__)
            )
            report_data = EmergencyReportData(
                sos_id=sos_id,
                user_id=user_id,
                status=ReportStatus.INSUFFICIENT_INFORMATION.value,
                emergency_type=understanding_res.emergency_type,
                severity_level=understanding_res.severity_level,
                confidence=understanding_res.confidence,
                key_indicators=understanding_res.indicators,
                required_capabilities=capability_res.required_capabilities,
                health_summary=health_summary_str,
                information_limitations=limitations + ["Emergency report synthesis failed."],
            )
            limitations.append("Emergency report generation failed.")

        # --- Step 6: Determine Overall Pipeline Status ---
        has_failed_component = any(c.status == "FAILED" for c in components_meta)
        is_unknown_type = understanding_res.emergency_type == EmergencyCategory.UNKNOWN.value

        if has_failed_component or is_unknown_type:
            overall_status = PipelineStatus.PARTIAL.value if not is_unknown_type else PipelineStatus.INSUFFICIENT_INFORMATION.value
        elif len(report_data.information_limitations) > 0:
            overall_status = PipelineStatus.PARTIAL.value
        else:
            overall_status = PipelineStatus.SUCCESS.value

        total_duration = (time.perf_counter() - t_start) * 1000.0

        metadata = AIResponseMetadata(
            pipeline_status=overall_status,
            total_duration_ms=round(total_duration, 3),
            understanding_tier=tier_used,
            components=components_meta,
            limitations=limitations + report_data.information_limitations,
        )

        return FinalAIResponse(
            user_id=user_id,
            status=overall_status,
            emergency_understanding=understanding_res,
            severity=understanding_res.severity_level,
            required_medical_capability=capability_res,
            ai_health_summary=health_summary_str,
            emergency_report=report_data,
            metadata=metadata,
        )


_DEFAULT_ORCHESTRATOR = AIOrchestrator()


def run_ai_pipeline(raw_payload: Dict[str, Any]) -> FinalAIResponse:
    """Convenience helper to run the complete AI pipeline."""
    return _DEFAULT_ORCHESTRATOR.process(raw_payload)