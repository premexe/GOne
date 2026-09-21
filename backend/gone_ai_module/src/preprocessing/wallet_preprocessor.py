"""
Emergency Wallet preprocessing.

Normalizes the five Emergency Wallet fields (blood_group, allergies,
chronic_conditions, current_medications, emergency_notes) into the
internal `NormalizedWallet` representation.

Missing-value handling (critical safety rule from the project documents):
  "Not Available", null, empty string, and a missing field must all be
  normalized to the SAME internal marker (`None`), meaning "unknown /
  unavailable". None of these must ever be interpreted as, or converted
  into, a negative medical finding (e.g. `allergies=None` must never be
  read downstream as "confirmed no allergies").

  A field containing an actual asserted value (including something like
  the literal word "None" typed by a user, e.g. as an emergency note) is
  preserved as-is and is NOT treated as unavailable, because it
  represents information the user actually provided.
"""

from typing import Any, Dict, Optional

from src.schemas.contract import NormalizedWallet
from src.preprocessing.text_sanitizer import sanitize_text
from src.utils.constants import MAX_WALLET_FIELD_LENGTH, UNAVAILABLE_MARKERS, WALLET_FIELDS


def _normalize_wallet_field(value: Any, field_name: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        # Structural validation should have already caught this; treat
        # defensively as unavailable rather than raising here, since this
        # function may also be used in isolation.
        return None

    stripped = value.strip()
    if stripped == "":
        return None
    if stripped.lower() in UNAVAILABLE_MARKERS:
        return None

    return sanitize_text(stripped, MAX_WALLET_FIELD_LENGTH, f"emergency_wallet.{field_name}")


def preprocess_wallet(raw_wallet: Any) -> NormalizedWallet:
    """
    Normalize a raw emergency_wallet dict (or None/missing) into a
    NormalizedWallet. Never raises for missing data -- only text-size
    violations on an otherwise-present field can raise
    (InputTooLargeError, a subclass of ValidationError).
    """
    wallet_dict: Dict[str, Any] = raw_wallet if isinstance(raw_wallet, dict) else {}

    values = {}
    for wallet_field in WALLET_FIELDS:
        values[wallet_field] = _normalize_wallet_field(
            wallet_dict.get(wallet_field), wallet_field
        )

    return NormalizedWallet(
        blood_group=values["blood_group"],
        allergies=values["allergies"],
        chronic_conditions=values["chronic_conditions"],
        current_medications=values["current_medications"],
        emergency_notes=values["emergency_notes"],
    )
