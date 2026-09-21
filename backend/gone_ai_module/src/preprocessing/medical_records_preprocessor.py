"""
Medical record and OCR text preprocessing.

OCR text is explicitly treated as untrusted input (it may originate from
a scanned document of unknown quality/origin): it is sanitized the same
way as any other free text (src/preprocessing/text_sanitizer.py) and is
subject to its own, larger size limit (MAX_OCR_TEXT_LENGTH), since
legitimate OCR output can be longer than a wallet field.

Missing-value handling mirrors the wallet preprocessor: "Not Available",
null, empty string, and missing fields all normalize to `None` and are
never treated as negative findings.

An empty `medical_records` list (or a missing/null field) is valid and
normalizes to an empty list -- this represents a user with no available
medical records, which the project documents explicitly call out as a
normal, expected case.
"""

from typing import Any, Dict, List, Optional

from src.schemas.contract import NormalizedMedicalRecord
from src.schemas.errors import ValidationError
from src.preprocessing.text_sanitizer import sanitize_text
from src.utils.constants import (
    MAX_MEDICAL_RECORDS,
    MAX_OCR_TEXT_LENGTH,
    MAX_RECORD_FIELD_LENGTH,
    UNAVAILABLE_MARKERS,
)

_METADATA_FIELDS = ("record_type", "title", "hospital_name", "doctor_name", "record_date")


def _normalize_optional_text(
    value: Any, field_name: str, max_length: int
) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        return None

    stripped = value.strip()
    if stripped == "" or stripped.lower() in UNAVAILABLE_MARKERS:
        return None

    return sanitize_text(stripped, max_length, field_name)


def _preprocess_single_record(raw_record: Dict[str, Any], index: int) -> NormalizedMedicalRecord:
    prefix = f"medical_records[{index}]"

    record_id = raw_record.get("record_id")
    if record_id is not None and (isinstance(record_id, bool) or not isinstance(record_id, int)):
        record_id = None  # defensive normalization; structural validation should catch this earlier

    metadata = {
        field_name: _normalize_optional_text(
            raw_record.get(field_name), f"{prefix}.{field_name}", MAX_RECORD_FIELD_LENGTH
        )
        for field_name in _METADATA_FIELDS
    }

    ocr_text = _normalize_optional_text(
        raw_record.get("ocr_text"), f"{prefix}.ocr_text", MAX_OCR_TEXT_LENGTH
    )

    return NormalizedMedicalRecord(
        record_id=record_id,
        record_type=metadata["record_type"],
        title=metadata["title"],
        hospital_name=metadata["hospital_name"],
        doctor_name=metadata["doctor_name"],
        record_date=metadata["record_date"],
        ocr_text=ocr_text,
    )


def preprocess_medical_records(raw_records: Any) -> List[NormalizedMedicalRecord]:
    """
    Normalize a raw medical_records list (or None/missing) into a list of
    NormalizedMedicalRecord.

    Raises:
        ValidationError: if the number of records exceeds
            MAX_MEDICAL_RECORDS, or if a text field within a record
            exceeds its configured size limit (InputTooLargeError, a
            ValidationError subclass).
    """
    if raw_records is None:
        return []

    if not isinstance(raw_records, list):
        # Structural validation should already have caught this; stay
        # defensive if this function is called in isolation.
        raise ValidationError(
            code="INVALID_TYPE",
            message="Field 'medical_records' must be a list.",
            field="medical_records",
        )

    if len(raw_records) > MAX_MEDICAL_RECORDS:
        raise ValidationError(
            code="TOO_MANY_RECORDS",
            message=f"Number of medical records exceeds the maximum allowed ({MAX_MEDICAL_RECORDS}).",
            field="medical_records",
        )

    normalized_records = []
    for index, raw_record in enumerate(raw_records):
        record_dict = raw_record if isinstance(raw_record, dict) else {}
        normalized_records.append(_preprocess_single_record(record_dict, index))

    return normalized_records
