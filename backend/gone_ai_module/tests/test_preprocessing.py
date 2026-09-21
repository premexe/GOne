"""
Tests covering preprocessing behavior for wallet, medical records, and
OCR text, including missing-information handling and untrusted-text
sanitization.
"""

from src.pipeline.input_pipeline import run_input_pipeline
from src.preprocessing.medical_records_preprocessor import preprocess_medical_records
from src.preprocessing.wallet_preprocessor import preprocess_wallet


def test_wallet_distinguishes_not_available_from_asserted_value():
    wallet = preprocess_wallet(
        {
            "blood_group": "Not Available",
            "allergies": "None",  # an asserted value, not "unavailable"
            "chronic_conditions": "Not Available",
            "current_medications": "Not Available",
            "emergency_notes": "Not Available",
        }
    )

    assert wallet.blood_group is None
    # "None" is content the user actually provided; it must be preserved,
    # not silently collapsed into the same "unknown" bucket as
    # "Not Available".
    assert wallet.allergies == "None"


def test_wallet_field_whitespace_is_trimmed():
    wallet = preprocess_wallet({"chronic_conditions": "   Hypertension   "})
    assert wallet.chronic_conditions == "Hypertension"


def test_wallet_null_values_normalize_to_unavailable():
    wallet = preprocess_wallet(
        {
            "blood_group": None,
            "allergies": None,
            "chronic_conditions": None,
            "current_medications": None,
            "emergency_notes": None,
        }
    )
    assert all(
        getattr(wallet, f) is None
        for f in (
            "blood_group",
            "allergies",
            "chronic_conditions",
            "current_medications",
            "emergency_notes",
        )
    )


def test_medical_records_ocr_text_is_sanitized_and_preserved():
    records = preprocess_medical_records(
        [
            {
                "record_id": 1,
                "record_type": "Lab Report",
                "title": "Blood Test",
                "hospital_name": "ABC Hospital",
                "doctor_name": "Dr. XYZ",
                "record_date": "2026-08-20",
                "ocr_text": "Patient   has\n\na   history   of hypertension.",
            }
        ]
    )
    assert len(records) == 1
    # Whitespace/newlines collapsed by the sanitizer.
    assert records[0].ocr_text == "Patient has a history of hypertension."


def test_medical_records_not_available_ocr_text_normalizes_to_none():
    records = preprocess_medical_records(
        [{"record_id": 1, "ocr_text": "Not Available"}]
    )
    assert records[0].ocr_text is None


def test_medical_records_empty_list_returns_empty_list():
    assert preprocess_medical_records([]) == []


def test_medical_records_missing_key_returns_empty_list():
    assert preprocess_medical_records(None) == []


def test_ocr_text_is_never_executed_or_interpreted(valid_payload):
    # OCR text containing something that LOOKS like code/instructions must
    # be treated as plain inert text, never evaluated or specially
    # interpreted.
    valid_payload["medical_records"] = [
        {
            "record_id": 1,
            "ocr_text": "'; DROP TABLE patients; -- __import__('os').system('rm -rf /')",
        }
    ]

    result = run_input_pipeline(valid_payload)

    # The text passes through as an inert, sanitized string -- nothing is
    # executed, and the content (aside from whitespace collapsing) is
    # preserved as plain data.
    stored_text = result.normalized.medical_records[0].ocr_text
    assert "DROP TABLE" in stored_text
    assert isinstance(stored_text, str)
