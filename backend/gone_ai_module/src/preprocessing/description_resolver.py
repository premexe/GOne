"""
Emergency description resolution.

Implements the LOCKED project decision:

    Primary source:   emergency_description
    Fallback source:  emergency.description

    Rule:
      - Use emergency_description if it is present and non-empty.
      - Otherwise use emergency.description if it is present and
        non-empty.
      - If both are missing or empty, raise a validation error.
      - Do not automatically combine both descriptions.

"Present and non-empty" means: the value exists, is a string, and is not
empty after stripping surrounding whitespace. A string containing only
whitespace is treated as empty/absent.

This function returns which source was actually used
(`description_source`), so the origin remains traceable through the
pipeline without needing to re-inspect the raw payload.
"""

from typing import Any, Dict, Tuple

from src.schemas.errors import ValidationError

PRIMARY_SOURCE = "emergency_description"
FALLBACK_SOURCE = "emergency.description"


def _is_present_and_non_empty(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def resolve_emergency_description(raw: Dict[str, Any]) -> Tuple[str, str]:
    """
    Resolve the emergency description from a raw backend payload.

    Returns:
        (resolved_description, description_source)

    Raises:
        ValidationError: if neither source contains a usable description.
    """
    primary_value = raw.get("emergency_description")
    if _is_present_and_non_empty(primary_value):
        return primary_value.strip(), PRIMARY_SOURCE

    emergency_obj = raw.get("emergency")
    fallback_value = None
    if isinstance(emergency_obj, dict):
        fallback_value = emergency_obj.get("description")

    if _is_present_and_non_empty(fallback_value):
        return fallback_value.strip(), FALLBACK_SOURCE

    raise ValidationError(
        code="MISSING_EMERGENCY_DESCRIPTION",
        message=(
            "No usable emergency description was provided. Both "
            "'emergency_description' and 'emergency.description' are "
            "missing or empty."
        ),
        field="emergency_description",
    )
