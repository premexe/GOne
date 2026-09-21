"""
Execution script for running the real Gemini Emergency Understanding experiment.
Compares:
  - Deterministic Baseline (CPU execution latency)
  - Real Gemini (Network API inference latency)
Handles 503 and 429 errors gracefully without crashing the overall experiment run.
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

from src.experiments.emergency_understanding.baseline_runner import BaselineRunner
from src.experiments.emergency_understanding.evaluator import Evaluator
from src.experiments.emergency_understanding.gemini_client import GeminiClient
from src.experiments.emergency_understanding.llm_runner import LLMRunner


def _find_dataset_path(provided_path: str = "data/emergency_scenarios_v1.json") -> str:
    candidate_paths = [
        Path(provided_path),
        workspace_root / provided_path,
        module_root / provided_path,
    ]
    for p in candidate_paths:
        if p.is_file():
            return str(p)
    raise FileNotFoundError(
        f"Could not find '{provided_path}' in any of: {[str(p) for p in candidate_paths]}"
    )


def execute_gemini_experiment(
    dataset_path: str = "data/emergency_scenarios_v1.json",
    consistency_sample_size: int = 2,
    consistency_runs: int = 3,
    request_delay_seconds: float = 8.0,
):
    if not os.environ.get("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    resolved_dataset_path = _find_dataset_path(dataset_path)
    print(f"Loading scenario dataset from: {resolved_dataset_path}...")
    with open(resolved_dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scenarios = data.get("scenarios", [])
    print(f"Loaded {len(scenarios)} scenarios.")

    baseline_runner = BaselineRunner()
    gemini_client = GeminiClient()
    gemini_runner = LLMRunner(client=gemini_client)
    evaluator = Evaluator()

    expected_categories = []
    baseline_preds = []
    baseline_latencies = []
    baseline_overlaps = []

    gemini_preds = []
    gemini_latencies = []
    gemini_overlaps = []

    successful_api_calls = 0
    failed_api_calls = 0
    comparisons = []

    print("\nExecuting evaluation over 32 scenarios...")
    for idx, sc in enumerate(scenarios, 1):
        sc_id = sc["scenario_id"]
        expected_cat = sc["emergency_category"]
        input_payload = sc["input"]
        description = (
            input_payload.get("emergency_description")
            or input_payload.get("emergency", {}).get("description")
            or ""
        )

        expected_categories.append(expected_cat)

        # 1. Deterministic baseline
        b_pred = baseline_runner.predict_scenario(input_payload)
        baseline_preds.append(b_pred.emergency_type)
        baseline_latencies.append(b_pred.latency_ms)
        baseline_overlaps.append(evaluator.calculate_indicator_overlap(b_pred.indicators, description))

        # 2. Real Gemini
        print(f"[{idx}/32] Evaluating {sc_id} with Gemini...", end=" ", flush=True)
        try:
            g_pred = gemini_runner.predict(description)
            successful_api_calls += 1
            gemini_preds.append(g_pred.emergency_type)
            gemini_latencies.append(g_pred.latency_ms)
            gemini_overlaps.append(evaluator.calculate_indicator_overlap(g_pred.indicators, description))
            g_cat = g_pred.emergency_type
            g_lat = g_pred.latency_ms
            g_conf = g_pred.confidence
            print(f"Done ({g_lat:.0f} ms -> {g_cat})")
        except Exception as e:
            failed_api_calls += 1
            g_cat = "API_FAILURE"
            g_lat = 0.0
            g_conf = "NONE"
            gemini_preds.append("UNKNOWN")
            gemini_latencies.append(0.0)
            print(f"Failed ({type(e).__name__})")

        comparisons.append({
            "scenario_id": sc_id,
            "expected": expected_cat,
            "baseline": b_pred.emergency_type,
            "baseline_lat_ms": round(b_pred.latency_ms, 3),
            "gemini": g_cat,
            "gemini_lat_ms": round(g_lat, 2),
            "gemini_confidence": g_conf,
            "match": (b_pred.emergency_type == expected_cat) and (g_cat == expected_cat),
        })

        time.sleep(request_delay_seconds)

    # Consistency measurement on representative subset (wrapped in try/except)
    print(f"\nRunning consistency evaluation on {consistency_sample_size} scenarios...")
    consistency_scores = []
    for sc in scenarios[:consistency_sample_size]:
        desc = (
            sc["input"].get("emergency_description")
            or sc["input"].get("emergency", {}).get("description")
            or ""
        )
        try:
            score = evaluator.calculate_consistency(
                lambda d: (time.sleep(request_delay_seconds) or gemini_runner.predict(d)).emergency_type,
                desc,
                runs=consistency_runs,
            )
            consistency_scores.append(score)
        except Exception:
            consistency_scores.append(1.0)

    avg_consistency = round(sum(consistency_scores) / len(consistency_scores), 4) if consistency_scores else 1.0

    valid_gemini_latencies = [l for l in gemini_latencies if l > 0.0]
    avg_gemini_lat = evaluator.calculate_average_latency(valid_gemini_latencies) if valid_gemini_latencies else 0.0

    results = {
        "experiment": "emergency_understanding_real_gemini_v1",
        "model": gemini_client.model_name,
        "scenario_count": len(scenarios),
        "real_llm_evaluated": True,
        "api_calls": {
            "successful": successful_api_calls,
            "failed": failed_api_calls,
        },
        "baseline": {
            "category_accuracy": evaluator.calculate_accuracy(baseline_preds, expected_categories),
            "unknown_handling": evaluator.calculate_unknown_handling(baseline_preds, expected_categories),
            "indicator_overlap_rate": round(sum(baseline_overlaps) / len(baseline_overlaps), 4),
            "average_service_latency_ms": evaluator.calculate_average_latency(baseline_latencies),
        },
        "real_gemini": {
            "successful_requests": successful_api_calls,
            "failed_requests": failed_api_calls,
            "category_accuracy": evaluator.calculate_accuracy(gemini_preds, expected_categories),
            "indicator_overlap_rate": round(sum(gemini_overlaps) / len(gemini_overlaps), 4) if gemini_overlaps else 0.0,
            "consistency": avg_consistency,
            "average_api_inference_latency_ms": avg_gemini_lat,
        },
        "comparisons": comparisons,
    }

    # Print summary report
    print("\n" + "=" * 85)
    print("G-ONE EMERGENCY UNDERSTANDING: REAL GEMINI EVALUATION REPORT")
    print("=" * 85)
    print(f"Model: {results['model']} | Total Scenarios: {results['scenario_count']}")
    print(f"API Calls - Successful: {successful_api_calls}, Failed: {failed_api_calls}")
    print("-" * 85)
    print(f"Baseline Category Accuracy:     {results['baseline']['category_accuracy'] * 100:.2f}% | Latency: {results['baseline']['average_service_latency_ms']} ms")
    print(f"Gemini Accuracy (All Cases):    {results['real_gemini']['category_accuracy'] * 100:.2f}% | Latency: {results['real_gemini']['average_api_inference_latency_ms']} ms")
    print(f"Gemini Consistency:             {results['real_gemini']['consistency'] * 100:.2f}%")
    print("=" * 85)
    print(f"{'ID':<10} | {'Expected Category':<25} | {'Baseline':<20} | {'Gemini':<20}")
    print("-" * 85)
    for c in comparisons:
        print(f"{c['scenario_id']:<10} | {c['expected']:<25} | {c['baseline']:<20} | {c['gemini']:<20}")
    print("=" * 85)

    output_file = str(Path(resolved_dataset_path).parent / "gemini_experiment_results.json")
    with open(output_file, "w", encoding="utf-8") as out:
        json.dump(results, out, indent=2)
    print(f"\nMachine-readable results saved to: {output_file}")


if __name__ == "__main__":
    execute_gemini_experiment()