"""
Tests covering:
  - valid complete input
  - missing optional wallet information
  - empty medical records
  - malformed input
"""

import pytest

from src.pipeline.input_pipeline import run_input_pipeline
from src.schemas.errors import ValidationError


def test_valid_complete_input_processes_successfully(valid_payload):
    result = run_input_pipeline(valid_payload)

    normalized = result.normalized
    assert normalized.user_id == 1
    assert normalized.resolved_description == (
        "Patient has severe chest pain and difficulty breathing."
    )
    assert normalized.description_source == "emergency_description"

    wallet = normalized.wallet
    assert wallet.blood_group == "B+"
    assert wallet.allergies == "Penicillin"
    assert wallet.chronic_conditions == "Hypertension"
    assert wallet.current_medications == "Amlodipine"
    assert wallet.emergency_notes == "Previous cardiac history"

    assert len(normalized.medical_records) == 1
    record = normalized.medical_records[0]
    assert record.record_id == 10
    assert record.hospital_name == "ABC Hospital"
    assert record.ocr_text == "Patient has a history of hypertension."

    assert normalized.emergency_context.sos_id == 25
    assert normalized.emergency_context.status == "ACTIVE"


def test_raw_input_is_preserved_unmodified(valid_payload):
    result = run_input_pipeline(valid_payload)

    # The preserved raw copy must equal the original payload exactly.
    assert result.raw_input == valid_payload
    # It must be a separate object, not the same reference, so later
    # mutation of one does not affect the other.
    assert result.raw_input is not valid_payload


def test_missing_optional_wallet_information_is_not_a_negative_finding(valid_payload):
    valid_payload["emergency_wallet"] = {
        "blood_group": "Not Available",
        "allergies": "Not Available",
        "chronic_conditions": "Not Available",
        "current_medications": "Not Available",
        "emergency_notes": "Not Available",
    }

    result = run_input_pipeline(valid_payload)
    wallet = result.normalized.wallet

    # All fields normalize to None ("unknown"), never to a string like
    # "No allergies" or "None known" -- unavailable must not become a
    # negative finding.
    assert wallet.blood_group is None
    assert wallet.allergies is None
    assert wallet.chronic_conditions is None
    assert wallet.current_medications is None
    assert wallet.emergency_notes is None


def test_missing_wallet_field_key_entirely_is_treated_as_unavailable(valid_payload):
    # Only some fields provided; others absent entirely (not even the key).
    valid_payload["emergency_wallet"] = {"chronic_conditions": "Diabetes"}

    result = run_input_pipeline(valid_payload)
    wallet = result.normalized.wallet

    assert wallet.chronic_conditions == "Diabetes"
    assert wallet.blood_group is None
    assert wallet.allergies is None
    assert wallet.current_medications is None
    assert wallet.emergency_notes is None


def test_missing_wallet_object_entirely_is_handled_safely(valid_payload):
    del valid_payload["emergency_wallet"]

    result = run_input_pipeline(valid_payload)
    wallet = result.normalized.wallet

    assert wallet.blood_group is None
    assert wallet.allergies is None
    assert wallet.chronic_conditions is None
    assert wallet.current_medications is None
    assert wallet.emergency_notes is None


def test_empty_medical_records_list_is_valid(valid_payload):
    valid_payload["medical_records"] = []

    result = run_input_pipeline(valid_payload)

    assert result.normalized.medical_records == []


def test_missing_medical_records_key_defaults_to_empty_list(valid_payload):
    del valid_payload["medical_records"]

    result = run_input_pipeline(valid_payload)

    assert result.normalized.medical_records == []


# --- Malformed input --------------------------------------------------


def test_malformed_input_non_dict_payload_raises():
    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(["not", "a", "dict"])
    assert exc_info.value.code == "INVALID_PAYLOAD"


def test_malformed_input_missing_user_id_raises(valid_payload):
    del valid_payload["user_id"]

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)
    assert exc_info.value.code == "MISSING_FIELD"
    assert exc_info.value.field == "user_id"


def test_malformed_input_wrong_type_user_id_raises(valid_payload):
    valid_payload["user_id"] = "one"  # should be int

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)
    assert exc_info.value.code == "INVALID_TYPE"


def test_malformed_input_wallet_as_list_raises(valid_payload):
    valid_payload["emergency_wallet"] = ["not", "an", "object"]

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)
    assert exc_info.value.code == "INVALID_TYPE"


def test_malformed_input_medical_records_as_dict_raises(valid_payload):
    valid_payload["medical_records"] = {"not": "a list"}

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)
    assert exc_info.value.code == "INVALID_TYPE"


def test_malformed_input_latitude_wrong_type_raises(valid_payload):
    valid_payload["emergency"]["latitude"] = "nineteen"

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)
    assert exc_info.value.code == "INVALID_TYPE"


def test_validation_error_never_exposes_raw_field_value(valid_payload):
    valid_payload["user_id"] = "super-secret-patient-identifier-value"

    with pytest.raises(ValidationError) as exc_info:
        run_input_pipeline(valid_payload)

    # The raw offending value must never appear in the error message.
    assert "super-secret-patient-identifier-value" not in str(exc_info.value)
    assert "super-secret-patient-identifier-value" not in exc_info.value.message
