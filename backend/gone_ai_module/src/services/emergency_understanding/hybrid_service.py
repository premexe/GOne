"""
Hybrid Emergency Understanding Service.

Attempts LLM understanding (Gemini) when credentials and network are available;
falls back instantaneously to the deterministic rule-based engine on any error
or when running offline.
"""

import os
from typing import Optional

from src.schemas.contract import NormalizedInput
from src.schemas.emergency_understanding import EmergencyUnderstandingResult
from src.services.emergency_understanding.understanding_service import (
    EmergencyUnderstandingService,
)


class HybridEmergencyUnderstandingService:
    def __init__(
        self,
        deterministic_service: Optional[EmergencyUnderstandingService] = None,
        llm_runner=None,
    ):
        self.deterministic_service = deterministic_service or EmergencyUnderstandingService()
        self.llm_runner = llm_runner
        self._init_llm_if_available()

    def _init_llm_if_available(self) -> None:
        """Initialize Gemini client if GEMINI_API_KEY is configured in the environment."""
        if self.llm_runner is not None:
            return

        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key and api_key.strip():
            try:
                from src.experiments.emergency_understanding.gemini_client import GeminiClient
                from src.experiments.emergency_understanding.llm_runner import LLMRunner

                client = GeminiClient(api_key=api_key.strip())
                self.llm_runner = LLMRunner(client=client)
            except Exception:
                self.llm_runner = None

    def understand(self, normalized_input: NormalizedInput) -> EmergencyUnderstandingResult:
        """
        Primary entry point:
        1. Attempts Gemini LLM if runner is available.
        2. Falls back to deterministic rule baseline on any exception or missing runner.
        """
        description = normalized_input.resolved_description or ""

        if self.llm_runner is not None:
            try:
                llm_pred = self.llm_runner.predict(description)
                if llm_pred.emergency_type != "UNKNOWN":
                    base_res = self.deterministic_service.understand_text(description)
                    return EmergencyUnderstandingResult(
                        emergency_type=llm_pred.emergency_type,
                        severity_level=base_res.severity_level,
                        confidence=llm_pred.confidence,
                        indicators=llm_pred.indicators or base_res.indicators,
                        evidence=["Identified by Gemini LLM (fallback verified)"] + base_res.evidence,
                    )
            except Exception:
                pass

        return self.deterministic_service.understand(normalized_input)


_DEFAULT_HYBRID_SERVICE = HybridEmergencyUnderstandingService()


def understand_emergency_hybrid(normalized_input: NormalizedInput) -> EmergencyUnderstandingResult:
    """Convenience helper for hybrid understanding."""
    return _DEFAULT_HYBRID_SERVICE.understand(normalized_input)