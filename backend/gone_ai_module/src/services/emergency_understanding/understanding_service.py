"""
Service implementation for Emergency Understanding and Severity Assessment.

Features:
- Deterministic, pattern-based matching against Version 1 indicator taxonomy.
- Conservative severity assignment (max severity + critical indicator lock).
- Transparent, non-clinical evidence generation.
- Safe handling of ambiguous/vague descriptions as UNKNOWN.
"""

import re
from typing import Dict, List, Set, Tuple

from src.schemas.contract import NormalizedInput
from src.schemas.emergency_understanding import (
    ConfidenceLevel,
    EmergencyCategory,
    EmergencyUnderstandingResult,
    SeverityLevel,
)
from src.services.emergency_understanding.indicator_definitions import (
    INDICATOR_DEFINITIONS,
    IndicatorDefinition,
)

_SEVERITY_RANK: Dict[SeverityLevel, int] = {
    SeverityLevel.UNKNOWN: 0,
    SeverityLevel.LOW: 1,
    SeverityLevel.MODERATE: 2,
    SeverityLevel.HIGH: 3,
    SeverityLevel.CRITICAL: 4,
}


class EmergencyUnderstandingService:
    def __init__(self, definitions: List[IndicatorDefinition] = INDICATOR_DEFINITIONS):
        self._definitions = definitions

    def understand(self, normalized_input: NormalizedInput) -> EmergencyUnderstandingResult:
        """
        Analyze normalized emergency input to determine emergency type,
        severity, confidence, and non-clinical evidence.
        """
        description = normalized_input.resolved_description or ""
        return self.understand_text(description)

    def understand_text(self, text: str) -> EmergencyUnderstandingResult:
        cleaned_text = text.lower().strip()
        if not cleaned_text:
            return EmergencyUnderstandingResult(
                emergency_type=EmergencyCategory.UNKNOWN.value,
                severity_level=SeverityLevel.UNKNOWN.value,
                confidence=ConfidenceLevel.LOW.value,
                indicators=[],
                evidence=["No description provided."],
            )

        detected_matches: List[Tuple[IndicatorDefinition, str]] = []
        for definition in self._definitions:
            for pattern in definition.patterns:
                match = re.search(pattern, cleaned_text, re.IGNORECASE)
                if match:
                    detected_matches.append((definition, match.group(0)))
                    break  # Matched this definition, proceed to next

        if not detected_matches:
            return EmergencyUnderstandingResult(
                emergency_type=EmergencyCategory.UNKNOWN.value,
                severity_level=SeverityLevel.UNKNOWN.value,
                confidence=ConfidenceLevel.LOW.value,
                indicators=[],
                evidence=["Description does not match supported emergency indicators."],
            )

        # Count category occurrences and find maximum severity
        category_counts: Dict[EmergencyCategory, int] = {}
        highest_severity = SeverityLevel.LOW
        has_critical = False
        indicator_names: List[str] = []
        evidence: List[str] = []

        for definition, matched_snippet in detected_matches:
            cat = definition.category
            category_counts[cat] = category_counts.get(cat, 0) + 1

            if _SEVERITY_RANK[definition.severity] > _SEVERITY_RANK[highest_severity]:
                highest_severity = definition.severity

            if definition.is_critical:
                has_critical = True

            if definition.name not in indicator_names:
                indicator_names.append(definition.name)
                evidence.append(f"Reported indicator '{definition.name}' matches '{matched_snippet}'")

        if has_critical:
            highest_severity = SeverityLevel.CRITICAL

        # Primary Category Selection (highest count, breaking ties by severity/order)
        sorted_categories = sorted(
            category_counts.keys(),
            key=lambda c: (category_counts[c], _SEVERITY_RANK[highest_severity]),
            reverse=True,
        )
        primary_category = sorted_categories[0]

        # Confidence Calculation
        if len(sorted_categories) == 1 and len(detected_matches) >= 1:
            confidence = ConfidenceLevel.HIGH
        elif len(sorted_categories) > 1 and category_counts[sorted_categories[0]] > category_counts[sorted_categories[1]]:
            confidence = ConfidenceLevel.HIGH
        elif len(sorted_categories) > 1:
            confidence = ConfidenceLevel.MEDIUM
        else:
            confidence = ConfidenceLevel.LOW

        return EmergencyUnderstandingResult(
            emergency_type=primary_category.value,
            severity_level=highest_severity.value,
            confidence=confidence.value,
            indicators=indicator_names,
            evidence=evidence,
        )


_DEFAULT_SERVICE = EmergencyUnderstandingService()


def understand_emergency(normalized_input: NormalizedInput) -> EmergencyUnderstandingResult:
    """Convenience helper to run Emergency Understanding on a NormalizedInput."""
    return _DEFAULT_SERVICE.understand(normalized_input)