"""
Input pipeline: validation + preprocessing ONLY.

This module intentionally does not contain, call, or depend on any AI
component. Its sole job is to turn a raw Backend -> AI request payload
into a `PreprocessedInput` (raw copy + normalized structure) that later
phases (Emergency Understanding, Severity Analysis, etc.) will consume.

Processing order:
    1. Structural validation (types, required fields).
    2. Emergency description resolution (locked primary/fallback rule).
    3. Wallet preprocessing.
    4. Medical records preprocessing.
    5. Emergency context (SOS) normalization.
    6. Assemble PreprocessedInput, preserving an untouched copy of the
       original payload separately from the normalized data.

Any failure at any step raises a `ValidationError` (or subclass). The
caller (future orchestrator / backend integration layer) is responsible
for catching this and translating it into whatever response format is
appropriate -- that translation layer does not exist yet in this phase.
"""

import copy
from typing import Any, Dict

from src.schemas.contract import (
    NormalizedEmergencyContext,
    NormalizedInput,
    PreprocessedInput,
)
from src.schemas.validators import validate_backend_input
from src.preprocessing.description_resolver import resolve_emergency_description
from src.preprocessing.medical_records_preprocessor import preprocess_medical_records
from src.preprocessing.text_sanitizer import sanitize_text
from src.preprocessing.wallet_preprocessor import preprocess_wallet
from src.utils.constants import MAX_DESCRIPTION_LENGTH


def _normalize_emergency_context(raw_emergency: Any) -> NormalizedEmergencyContext:
    emergency_dict: Dict[str, Any] = raw_emergency if isinstance(raw_emergency, dict) else {}

    sos_id = emergency_dict.get("sos_id")
    if sos_id is not None and (isinstance(sos_id, bool) or not isinstance(sos_id, int)):
        sos_id = None

    latitude = emergency_dict.get("latitude")
    if latitude is not None and not isinstance(latitude, (int, float)):
        latitude = None

    longitude = emergency_dict.get("longitude")
    if longitude is not None and not isinstance(longitude, (int, float)):
        longitude = None

    status = emergency_dict.get("status")
    if not isinstance(status, str) or status.strip() == "":
        status = None
    else:
        status = status.strip()

    return NormalizedEmergencyContext(
        sos_id=sos_id, latitude=latitude, longitude=longitude, status=status
    )


def run_input_pipeline(raw_payload: Dict[str, Any]) -> PreprocessedInput:
    """
    Validate and preprocess a single Backend -> AI request payload.

    Args:
        raw_payload: the raw JSON-decoded request body, as a dict.

    Returns:
        PreprocessedInput containing an untouched copy of the original
        payload plus the fully normalized data.

    Raises:
        ValidationError: on any structural problem, a missing/empty
            emergency description (per the locked rule), or an
            oversized text field.
    """
    # Step 1: structural validation (raises ValidationError on failure).
    validate_backend_input(raw_payload)

    # Preserve the original input completely untouched, before any
    # further processing, per the "preserve original input data
    # separately from processed data" requirement.
    raw_copy = copy.deepcopy(raw_payload)

    # Step 2: resolve the emergency description via the locked rule.
    resolved_description, description_source = resolve_emergency_description(raw_payload)
    resolved_description = sanitize_text(
        resolved_description, MAX_DESCRIPTION_LENGTH, "emergency_description"
    )

    # Step 3: preprocess the emergency wallet.
    normalized_wallet = preprocess_wallet(raw_payload.get("emergency_wallet"))

    # Step 4: preprocess medical records (including OCR text).
    normalized_records = preprocess_medical_records(raw_payload.get("medical_records"))

    # Step 5: normalize the SOS/emergency context.
    normalized_emergency_context = _normalize_emergency_context(raw_payload.get("emergency"))

    normalized = NormalizedInput(
        user_id=raw_payload["user_id"],
        resolved_description=resolved_description,
        description_source=description_source,
        wallet=normalized_wallet,
        medical_records=normalized_records,
        emergency_context=normalized_emergency_context,
    )

    return PreprocessedInput(raw_input=raw_copy, normalized=normalized)
