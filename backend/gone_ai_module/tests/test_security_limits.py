"""
Tests covering:
  - excessively large OCR text
  - excessively large emergency description / wallet fields
  - error messages never leak the oversized content
"""

import pytest

from src.pipeline.input_pipeline import run_input_pipeline
from src.schemas.errors import InputTooLargeError, ValidationError
from src.utils.constants import (
    MAX_DESCRIPTION_LENGTH,
    MAX_OCR_TEXT_LENGTH,
    MAX_WALLET_FIELD_LENGTH,
)


def test_excessively_large_ocr_text_is_rejected(valid_payload):
    oversized_text = "A" * (MAX_OCR_TEXT_LENGTH + 1)
    valid_payload["medical_records"][0]["ocr_text"] = oversized_text

    with pytest.raises(InputTooLargeError) as exc_info:
        run_input_pipeline(valid_payload)

    assert exc_info.value.code == "TEXT_TOO_LARGE"
    # The oversized content itself must never appear in the error.
    assert oversized_text not in str(exc_info.value)


def test_ocr_text_at_exact_limit_is_accepted(valid_payload):
    exactly_at_limit = "A" * MAX_OCR_TEXT_LENGTH
    valid_payload["medical_records"][0]["ocr_text"] = exactly_at_limit

    result = run_input_pipeline(valid_payload)
    assert result.normalized.medical_records[0].ocr_text == exactly_at_limit


def test_excessively_large_emergency_description_is_rejected(valid_payload):
    oversized_description = "B" * (MAX_DESCRIPTION_LENGTH + 1)
    valid_payload["emergency_description"] = oversized_description

    with pytest.raises(InputTooLargeError) as exc_info:
        run_input_pipeline(valid_payload)

    assert exc_info.value.code == "TEXT_TOO_LARGE"
    assert oversized_description not in str(exc_info.value)


def test_excessively_large_wallet_field_is_rejected(valid_payload):
    valid_payload["emergency_wallet"]["chronic_conditions"] = "C" * (
        MAX_WALLET_FIELD_LENGTH + 1
    )

    with pytest.raises(InputTooLargeError):
        run_input_pipeline(valid_payload)


def test_too_many_medical_records_is_rejected(valid_payload):
    from src.utils.constants import MAX_MEDICAL_RECORDS

    valid_payload["medical_records"] = [
        {"record_id": i, "ocr_text": "note"} for i in range(MAX_MEDICAL_RECORDS + 1)
    ]

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)

    assert exc_info.value.code == "TOO_MANY_RECORDS"


def test_input_too_large_error_is_a_validation_error(valid_payload):
    # InputTooLargeError must remain catchable as a generic ValidationError
    # by any caller that only handles the base type.
    oversized_text = "A" * (MAX_OCR_TEXT_LENGTH + 1)
    valid_payload["medical_records"][0]["ocr_text"] = oversized_text

    with pytest.raises(ValidationError):
        run_input_pipeline(valid_payload)
