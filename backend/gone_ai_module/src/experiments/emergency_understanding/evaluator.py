"""
Evaluator for Emergency Understanding experiments.

Calculates category accuracy, unknown/ambiguous handling, indicator extraction
overlap with source descriptions, consistency across runs, and isolated service latency.
"""

from typing import Callable, List


class Evaluator:
    @staticmethod
    def calculate_accuracy(predictions: List[str], expected: List[str]) -> float:
        """Calculate exact category match accuracy."""
        if not expected:
            return 0.0
        correct = sum(1 for p, e in zip(predictions, expected) if p == e)
        return round(correct / len(expected), 4)

    @staticmethod
    def calculate_unknown_handling(predictions: List[str], expected: List[str]) -> float:
        """Measure accuracy on ambiguous, vague, or unsupported scenarios expecting UNKNOWN."""
        unknown_pairs = [(p, e) for p, e in zip(predictions, expected) if e == "UNKNOWN"]
        if not unknown_pairs:
            return 1.0
        correct = sum(1 for p, e in unknown_pairs if p == "UNKNOWN")
        return round(correct / len(unknown_pairs), 4)

    @staticmethod
    def calculate_average_latency(latencies: List[float]) -> float:
        """Calculate mean service execution latency in milliseconds."""
        if not latencies:
            return 0.0
        return round(sum(latencies) / len(latencies), 3)

    @staticmethod
    def calculate_consistency(runner_func: Callable[[str], str], description: str, runs: int = 3) -> float:
        """Measure prediction stability across multiple calls on the exact same input."""
        results = [runner_func(description) for _ in range(runs)]
        first = results[0]
        agreements = sum(1 for r in results if r == first)
        return round(agreements / runs, 4)

    @staticmethod
    def calculate_indicator_overlap(predicted_indicators: List[str], description: str) -> float:
        """
        Measure whether detected indicators are grounded in the scenario text.
        Returns the proportion of predicted indicators that have direct substring
        or word overlap with the description.
        """
        if not predicted_indicators:
            return 1.0
        desc_lower = description.lower()
        grounded = 0
        for indicator in predicted_indicators:
            ind_words = [w for w in indicator.lower().split() if len(w) > 3]
            if any(w in desc_lower for w in ind_words):
                grounded += 1
        return round(grounded / len(predicted_indicators), 4)