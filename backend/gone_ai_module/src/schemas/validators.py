"""
Structural validation for the Backend -> AI Input/Output Contract.

Scope of this module (deliberately narrow):
  - Confirms the payload is a dict.
  - Confirms `user_id` is present and is an int.
  - Confirms optional top-level sections (`emergency_wallet`,
    `medical_records`, `emergency`), IF PRESENT, have the correct
    container type (dict / list / dict respectively).
  - Confirms individual field types within those sections, IF PRESENT.

Design decision (documented, not silently assumed):
  Only `user_id` is treated as strictly required at the top level.
  `emergency_wallet`, `medical_records`, and `emergency` are optional --
  if absent, downstream preprocessing treats them as "nothing provided"
  (all sub-fields unavailable / empty list), consistent with the
  project rule that missing information must never be invented or
  treated as a negative finding. This is a deliberate robustness choice
  and should be confirmed with the backend developer if the backend
  guarantees these sections are always present.

  The emergency description fields (`emergency_description` and
  `emergency.description`) are NOT validated here -- they are handled by
  the dedicated resolution rule in
  `src/preprocessing/description_resolver.py`, since their
  presence/absence rules are more specific than simple structural
  validation (see locked project decision).

This module does not interpret, execute, or evaluate any input content.
All values are treated as inert data.
"""

from typing import Any

from src.schemas.errors import ValidationError
from src.utils.constants import (
    EMERGENCY_OBJECT_FIELDS,
    MEDICAL_RECORD_FIELDS,
    WALLET_FIELDS,
)


def _require_dict(value: Any, field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValidationError(
            code="INVALID_TYPE",
            message=f"Expected an object for '{field_name}'.",
            field=field_name,
        )


def _require_optional_string(value: Any, field_name: str) -> None:
    """A field that, if present at all, must be a string or null."""
    if value is not None and not isinstance(value, str):
        raise ValidationError(
            code="INVALID_TYPE",
            message=f"Expected a string or null for '{field_name}'.",
            field=field_name,
        )


def validate_backend_input(raw: Any) -> None:
    """
    Validate the overall shape of a Backend -> AI request payload.

    Raises ValidationError on any structural problem. Returns None on
    success (does not mutate or return the payload -- normalization is a
    separate, later step).
    """
    if not isinstance(raw, dict):
        raise ValidationError(
            code="INVALID_PAYLOAD",
            message="Request payload must be a JSON object.",
        )

    # --- user_id: strictly required -------------------------------------
    if "user_id" not in raw:
        raise ValidationError(
            code="MISSING_FIELD",
            message="Required field 'user_id' is missing.",
            field="user_id",
        )
    user_id = raw["user_id"]
    # bool is a subclass of int in Python; explicitly reject it.
    if isinstance(user_id, bool) or not isinstance(user_id, int):
        raise ValidationError(
            code="INVALID_TYPE",
            message="Field 'user_id' must be an integer.",
            field="user_id",
        )

    # --- emergency_wallet: optional, but must be an object if present ---
    if "emergency_wallet" in raw and raw["emergency_wallet"] is not None:
        wallet = raw["emergency_wallet"]
        _require_dict(wallet, "emergency_wallet")
        for wallet_field in WALLET_FIELDS:
            if wallet_field in wallet:
                _require_optional_string(
                    wallet[wallet_field], f"emergency_wallet.{wallet_field}"
                )

    # --- medical_records: optional, but must be a list if present -------
    if "medical_records" in raw and raw["medical_records"] is not None:
        records = raw["medical_records"]
        if not isinstance(records, list):
            raise ValidationError(
                code="INVALID_TYPE",
                message="Field 'medical_records' must be a list.",
                field="medical_records",
            )
        for index, record in enumerate(records):
            record_field_prefix = f"medical_records[{index}]"
            _require_dict(record, record_field_prefix)
            for record_field in MEDICAL_RECORD_FIELDS:
                if record_field in record and record_field != "record_id":
                    _require_optional_string(
                        record[record_field], f"{record_field_prefix}.{record_field}"
                    )
            if "record_id" in record and record["record_id"] is not None:
                if isinstance(record["record_id"], bool) or not isinstance(
                    record["record_id"], int
                ):
                    raise ValidationError(
                        code="INVALID_TYPE",
                        message=f"Field '{record_field_prefix}.record_id' must be an integer.",
                        field=f"{record_field_prefix}.record_id",
                    )

    # --- emergency: optional, but must be an object if present ----------
    if "emergency" in raw and raw["emergency"] is not None:
        emergency = raw["emergency"]
        _require_dict(emergency, "emergency")
        for emergency_field in EMERGENCY_OBJECT_FIELDS:
            if emergency_field not in emergency:
                continue
            value = emergency[emergency_field]
            if emergency_field in ("description", "status"):
                _require_optional_string(value, f"emergency.{emergency_field}")
            elif emergency_field == "sos_id":
                if value is not None and (
                    isinstance(value, bool) or not isinstance(value, int)
                ):
                    raise ValidationError(
                        code="INVALID_TYPE",
                        message="Field 'emergency.sos_id' must be an integer.",
                        field="emergency.sos_id",
                    )
            elif emergency_field in ("latitude", "longitude"):
                if value is not None and not isinstance(value, (int, float)):
                    raise ValidationError(
                        code="INVALID_TYPE",
                        message=f"Field 'emergency.{emergency_field}' must be numeric.",
                        field=f"emergency.{emergency_field}",
                    )
