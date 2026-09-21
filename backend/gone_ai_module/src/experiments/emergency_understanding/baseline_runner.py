"""
Baseline runner for Emergency Understanding experimentation.

Wraps the existing deterministic Emergency Understanding service without
duplicating logic.
"""

import time
from dataclasses import dataclass
from typing import Any, Dict, List

from src.pipeline.input_pipeline import run_input_pipeline
from src.services.emergency_understanding import understand_emergency


@dataclass(frozen=True)
class BaselinePrediction:
    emergency_type: str
    severity_level: str
    confidence: str
    indicators: List[str]
    latency_ms: float


class BaselineRunner:
    def predict_scenario(self, scenario_input: Dict[str, Any]) -> BaselinePrediction:
        """Run the input through preprocessing and the baseline service, measuring latency."""
        preprocessed = run_input_pipeline(scenario_input)
        
        start_time = time.perf_counter()
        result = understand_emergency(preprocessed.normalized)
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return BaselinePrediction(
            emergency_type=result.emergency_type,
            severity_level=result.severity_level,
            confidence=result.confidence,
            indicators=result.indicators,
            latency_ms=latency_ms,
        )