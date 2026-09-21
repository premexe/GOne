"""
Shared constants for the G-ONE AI module.

These values implement the "reasonable input size limits" security
requirement from the Input Validation + Preprocessing phase. They are
intentionally conservative and can be tuned later without touching
validation/preprocessing logic, since all limits are centralized here.
"""

# ---------------------------------------------------------------------------
# Text size limits
# ---------------------------------------------------------------------------
# Emergency description is free text typed or spoken by a citizen during
# an active emergency. It should be short by nature; this limit exists to
# prevent abuse (e.g. extremely large payloads) rather than to constrain
# normal use.
MAX_DESCRIPTION_LENGTH = 3000

# Individual Emergency Wallet fields (blood_group, allergies,
# chronic_conditions, current_medications, emergency_notes) are short
# structured/semi-structured text values.
MAX_WALLET_FIELD_LENGTH = 1000

# OCR-extracted text from medical records can legitimately be longer than
# wallet fields (e.g. a scanned report), but must still be bounded.
MAX_OCR_TEXT_LENGTH = 10000

# Other medical record metadata fields (title, hospital_name, doctor_name,
# record_type, record_date) are short descriptive strings.
MAX_RECORD_FIELD_LENGTH = 500

# Maximum number of medical records accepted per request. This bounds
# total processing size regardless of individual field lengths.
MAX_MEDICAL_RECORDS = 25

# ---------------------------------------------------------------------------
# Missing-value handling
# ---------------------------------------------------------------------------
# Values that must be treated as "unavailable / unknown" and therefore
# NEVER interpreted as a negative medical finding (e.g. "Not Available"
# must never be treated as "no allergies"). Comparison is case-insensitive
# and applied after stripping surrounding whitespace.
#
# Deliberately NOT included: "none", "no known allergies", etc. Those are
# treated as asserted (positive) values if a caller ever provides them,
# because they represent explicit information rather than an absence of
# information. Only the contract's own "Not Available" convention (plus
# null / missing / empty string) is treated as "unknown".
UNAVAILABLE_MARKERS = {
    "not available",
    "n/a",
    "na",
}

# ---------------------------------------------------------------------------
# Contract field sets (used for structural validation only in this phase)
# ---------------------------------------------------------------------------
REQUIRED_TOP_LEVEL_FIELDS = {"user_id", "emergency_wallet", "medical_records", "emergency"}
# Note: "emergency_description" is NOT in REQUIRED_TOP_LEVEL_FIELDS because
# the locked description rule allows it to be absent as long as
# emergency.description is present. Its presence/absence is handled by the
# dedicated description-resolution step, not generic structural validation.

WALLET_FIELDS = {
    "blood_group",
    "allergies",
    "chronic_conditions",
    "current_medications",
    "emergency_notes",
}

MEDICAL_RECORD_FIELDS = {
    "record_id",
    "record_type",
    "title",
    "hospital_name",
    "doctor_name",
    "record_date",
    "ocr_text",
}

EMERGENCY_OBJECT_FIELDS = {"sos_id", "description", "latitude", "longitude", "status"}
