"""
Live evaluation of the Tri-Tier Emergency Understanding Service across all 32 scenarios.
Tier 1: Cloud Gemini -> Tier 2: Local Ollama (qwen2.5:1.5b) -> Tier 3: Deterministic Rule Engine
"""

import json
import os
import sys
import time
from pathlib import Path

current_file = Path(__file__).resolve()
module_root = current_file.parents[3]
workspace_root = module_root.parent

if str(module_root) not in sys.path:
    sys.path.insert(0, str(module_root))
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from src.pipeline.input_pipeline import run_input_pipeline
from src.services.emergency_understanding.tier_fallback_service import TriTierEmergencyService


def _find_dataset_path(provided_path: str = "data/emergency_scenarios_v1.json") -> str:
    candidate_paths = [
        Path(provided_path),
        workspace_root / provided_path,
        module_root / provided_path,
    ]
    for p in candidate_paths:
        if p.is_file():
            return str(p)
    raise FileNotFoundError(f"Could not find '{provided_path}'")


def run_tier_experiment():
    dataset_path = _find_dataset_path()
    with open(dataset_path, "r", encoding="utf-8") as f:
        scenarios = json.load(f).get("scenarios", [])

    service = TriTierEmergencyService(local_model="qwen2.5:1.5b")

    tier_counts = {"Tier 1 (Gemini)": 0, "Tier 2 (Ollama)": 0, "Tier 3 (Rules)": 0}
    matches = 0

    print("=" * 85)
    print("G-ONE TRI-TIER FALLBACK EVALUATION (32 SCENARIOS)")
    print("Execution Hierarchy: Cloud Gemini -> Local Ollama (qwen2.5) -> Rule Engine")
    print("=" * 85)
    print(f"{'ID':<10} | {'Expected Category':<24} | {'Predicted Category':<24} | {'Tier Used':<18} | {'Time':<8}")
    print("-" * 85)

    for sc in scenarios:
        sc_id = sc["scenario_id"]
        expected_cat = sc["emergency_category"]
        raw_input = sc["input"]

        norm_input = run_input_pipeline(raw_input).normalized

        t0 = time.perf_counter()
        result = service.understand(norm_input)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        # Determine which tier processed the request from the evidence string
        tier_used = "Tier 3 (Rules)"
        if result.evidence:
            first_ev = result.evidence[0]
            if "Tier 1: Cloud Gemini" in first_ev:
                tier_used = "Tier 1 (Gemini)"
            elif "Tier 2: Local LLM" in first_ev:
                tier_used = "Tier 2 (Ollama)"

        tier_counts[tier_used] += 1
        is_match = (result.emergency_type == expected_cat)
        if is_match:
            matches += 1

        print(f"{sc_id:<10} | {expected_cat:<24} | {result.emergency_type:<24} | {tier_used:<18} | {elapsed_ms:.1f} ms")

    print("=" * 85)
    print("EXPERIMENT SUMMARY:")
    print(f"Total Scenarios: {len(scenarios)}")
    print(f"Overall Category Accuracy: {(matches / len(scenarios)) * 100:.2f}%")
    print("Tier Distribution:")
    for tier, count in tier_counts.items():
        print(f"  - {tier:<16}: {count} requests")
    print("=" * 85)


if __name__ == "__main__":
    run_tier_experiment()