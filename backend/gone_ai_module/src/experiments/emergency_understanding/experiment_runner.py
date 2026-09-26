"""
Orchestrates the Emergency Understanding experiment between Baseline and Mock LLM.
Generates structured JSON results and a human-readable comparison report.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.experiments.emergency_understanding.baseline_runner import BaselineRunner
from src.experiments.emergency_understanding.evaluator import Evaluator
from src.experiments.emergency_understanding.llm_runner import LLMRunner


def _resolve_dataset_path(provided_path: str) -> str:
    """Resolve scenario dataset path whether run from root or gone_ai_module."""
    candidate_paths = [
        Path(provided_path),
        Path(__file__).resolve().parents[3] / provided_path,  # from gone_ai_module
        Path(__file__).resolve().parents[4] / provided_path,  # from D:\GONE
        # The checked-in prototype dataset currently lives alongside the
        # duplicated module snapshot at the backend root.
        Path(__file__).resolve().parents[4] / "gone_ai_module_repo" / provided_path,
    ]
    for p in candidate_paths:
        if p.is_file():
            return str(p)
    raise FileNotFoundError(f"Scenario dataset not found at: {provided_path}")


def run_experiment(
    dataset_path: str = "data/emergency_scenarios_v1.json",
    llm_runner: Optional[LLMRunner] = None,
) -> Dict[str, Any]:
    """
    Execute the experiment over the canonical scenario dataset.
    Clearly separates isolated service latency and distinguishes mock from live evaluation.
    """
    resolved_path = _resolve_dataset_path(dataset_path)

    with open(resolved_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scenarios: List[Dict[str, Any]] = data.get("scenarios", [])
    baseline = BaselineRunner()
    llm = llm_runner or LLMRunner()
    evaluator = Evaluator()

    expected_categories: List[str] = []
    baseline_categories: List[str] = []
    baseline_latencies: List[float] = []
    baseline_overlap_scores: List[float] = []

    llm_categories: List[str] = []
    llm_latencies: List[float] = []
    llm_overlap_scores: List[float] = []

    scenario_comparisons: List[Dict[str, Any]] = []

    for sc in scenarios:
        sc_id = sc.get("scenario_id", "UNKNOWN")
        expected_cat = sc.get("emergency_category", "UNKNOWN")
        input_payload = sc.get("input", {})
        description = (
            input_payload.get("emergency_description")
            or input_payload.get("emergency", {}).get("description")
            or ""
        )

        expected_categories.append(expected_cat)

        # Baseline execution
        b_pred = baseline.predict_scenario(input_payload)
        # LLM execution
        l_pred = llm.predict(description)

        baseline_categories.append(b_pred.emergency_type)
        baseline_latencies.append(b_pred.latency_ms)
        baseline_overlap_scores.append(
            evaluator.calculate_indicator_overlap(b_pred.indicators, description)
        )

        llm_categories.append(l_pred.emergency_type)
        llm_latencies.append(l_pred.latency_ms)
        llm_overlap_scores.append(
            evaluator.calculate_indicator_overlap(l_pred.indicators, description)
        )

        scenario_comparisons.append({
            "scenario_id": sc_id,
            "description_snippet": description[:60] + "...",
            "expected_category": expected_cat,
            "baseline": {
                "category": b_pred.emergency_type,
                "confidence": b_pred.confidence,
                "service_latency_ms": round(b_pred.latency_ms, 3),
            },
            "mock_llm": {
                "category": l_pred.emergency_type,
                "confidence": l_pred.confidence,
                "service_latency_ms": round(l_pred.latency_ms, 3),
            },
            "match": (b_pred.emergency_type == expected_cat) and (l_pred.emergency_type == expected_cat),
        })

    # Consistency checks on a sample scenario
    sample_desc = (
        scenarios[0]["input"].get("emergency_description", "") if scenarios else "Chest pain"
    )
    baseline_consistency = evaluator.calculate_consistency(
        lambda d: baseline.predict_scenario({
            "user_id": 1,
            "emergency_description": d,
            "emergency": {"description": d},
        }).emergency_type,
        sample_desc,
    )
    llm_consistency = evaluator.calculate_consistency(
        lambda d: llm.predict(d).emergency_type,
        sample_desc,
    )

    avg_b_overlap = (
        round(sum(baseline_overlap_scores) / len(baseline_overlap_scores), 4)
        if baseline_overlap_scores
        else 1.0
    )
    avg_l_overlap = (
        round(sum(llm_overlap_scores) / len(llm_overlap_scores), 4)
        if llm_overlap_scores
        else 1.0
    )

    summary = {
        "experiment": "emergency_understanding_v1",
        "scenario_count": len(scenarios),
        "real_llm_evaluated": False,
        "baseline": {
            "category_accuracy": evaluator.calculate_accuracy(baseline_categories, expected_categories),
            "unknown_handling": evaluator.calculate_unknown_handling(baseline_categories, expected_categories),
            "indicator_overlap_rate": avg_b_overlap,
            "consistency": baseline_consistency,
            "average_service_latency_ms": evaluator.calculate_average_latency(baseline_latencies),
        },
        "mock_llm": {
            "note": "Framework validation only (deterministic mock client, not an actual LLM)",
            "category_accuracy": evaluator.calculate_accuracy(llm_categories, expected_categories),
            "unknown_handling": evaluator.calculate_unknown_handling(llm_categories, expected_categories),
            "indicator_overlap_rate": avg_l_overlap,
            "consistency": llm_consistency,
            "average_service_latency_ms": evaluator.calculate_average_latency(llm_latencies),
        },
        "comparisons": scenario_comparisons,
    }
    return summary


def format_human_readable_report(results: Dict[str, Any]) -> str:
    """Format experiment output as a clean, human-readable report."""
    lines = [
        "=" * 80,
        "G-ONE EMERGENCY UNDERSTANDING: EXPERIMENT EVALUATION REPORT",
        "=" * 80,
        f"Total Scenarios Evaluated: {results['scenario_count']}",
        f"Real External LLM Tested:  {results.get('real_llm_evaluated', False)}",
        "-" * 80,
        f"Baseline Accuracy:         {results['baseline']['category_accuracy'] * 100:.2f}% | Latency: {results['baseline']['average_service_latency_ms']} ms",
        f"Mock LLM Test Accuracy:    {results['mock_llm']['category_accuracy'] * 100:.2f}% | Latency: {results['mock_llm']['average_service_latency_ms']} ms",
        "=" * 80,
        f"{'Scenario ID':<12} | {'Expected Category':<25} | {'Baseline':<22} | {'Mock LLM':<22} | {'Status':<6}",
        "-" * 80,
    ]

    for item in results.get("comparisons", []):
        match_str = "MATCH" if item["match"] else "DIFF"
        lines.append(
            f"{item['scenario_id']:<12} | "
            f"{item['expected_category']:<25} | "
            f"{item['baseline']['category']:<22} | "
            f"{item['mock_llm']['category']:<22} | "
            f"{match_str:<6}"
        )

    lines.append("=" * 80)
    return "\n".join(lines)
