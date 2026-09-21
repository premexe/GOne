"""
Tests covering the LOCKED emergency description resolution rule:
  - emergency_description primary source
  - emergency.description fallback source
  - both descriptions missing -> validation error
  - the two sources are never automatically combined
"""

import pytest

from src.pipeline.input_pipeline import run_input_pipeline
from src.preprocessing.description_resolver import resolve_emergency_description
from src.schemas.errors import ValidationError


def test_primary_source_used_when_present_and_non_empty(valid_payload):
    valid_payload["emergency_description"] = "PRIMARY description text."
    valid_payload["emergency"]["description"] = "FALLBACK description text."

    result = run_input_pipeline(valid_payload)

    assert result.normalized.resolved_description == "PRIMARY description text."
    assert result.normalized.description_source == "emergency_description"


def test_fallback_source_used_when_primary_missing(valid_payload):
    del valid_payload["emergency_description"]
    valid_payload["emergency"]["description"] = "FALLBACK description text."

    result = run_input_pipeline(valid_payload)

    assert result.normalized.resolved_description == "FALLBACK description text."
    assert result.normalized.description_source == "emergency.description"


def test_fallback_source_used_when_primary_is_empty_string(valid_payload):
    valid_payload["emergency_description"] = ""
    valid_payload["emergency"]["description"] = "FALLBACK description text."

    result = run_input_pipeline(valid_payload)

    assert result.normalized.resolved_description == "FALLBACK description text."
    assert result.normalized.description_source == "emergency.description"


def test_fallback_source_used_when_primary_is_whitespace_only(valid_payload):
    valid_payload["emergency_description"] = "   \n\t  "
    valid_payload["emergency"]["description"] = "FALLBACK description text."

    result = run_input_pipeline(valid_payload)

    assert result.normalized.description_source == "emergency.description"


def test_both_descriptions_missing_raises_validation_error(valid_payload):
    del valid_payload["emergency_description"]
    valid_payload["emergency"]["description"] = ""

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)

    assert exc_info.value.code == "MISSING_EMERGENCY_DESCRIPTION"


def test_both_descriptions_empty_raises_validation_error(valid_payload):
    valid_payload["emergency_description"] = ""
    valid_payload["emergency"]["description"] = ""

    with pytest.raises(ValidationError):
        run_input_pipeline(valid_payload)


def test_no_emergency_object_and_no_primary_description_raises(valid_payload):
    del valid_payload["emergency_description"]
    del valid_payload["emergency"]

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)

    assert exc_info.value.code == "MISSING_EMERGENCY_DESCRIPTION"


def test_descriptions_are_never_automatically_combined():
    raw = {
        "user_id": 1,
        "emergency_description": "PRIMARY only.",
        "emergency": {"description": "FALLBACK only."},
    }

    resolved, source = resolve_emergency_description(raw)

    assert resolved == "PRIMARY only."
    assert "FALLBACK only." not in resolved
    assert source == "emergency_description"
