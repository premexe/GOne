"""
Logging utilities.

Security requirement: this module must make it easy to log operational
information (e.g. "validation failed with code X", "processed request for
user_id Y") WITHOUT ever logging raw patient or medical content (emergency
descriptions, wallet field values, OCR text, etc.).

Do not add a helper here that logs an entire raw payload or normalized
object. If a future caller needs to log something about a request, use
`summarize_for_logging` to obtain only non-sensitive, aggregate metadata
(lengths, booleans, counts) -- never the underlying text.
"""

import logging
from typing import Any, Dict

from src.schemas.contract import PreprocessedInput


def get_logger(name: str) -> logging.Logger:
    """Return a standard library logger configured with a safe default format."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def summarize_for_logging(preprocessed: PreprocessedInput) -> Dict[str, Any]:
    """
    Produce a log-safe summary of a PreprocessedInput: metadata only, no
    patient content whatsoever. Suitable for INFO/DEBUG logging in
    production without risking a PHI leak into log files.
    """
    normalized = preprocessed.normalized
    wallet = normalized.wallet

    def has_value(x):
        return x is not None

    return {
        "user_id": normalized.user_id,
        "description_source": normalized.description_source,
        "description_length": len(normalized.resolved_description),
        "wallet_fields_available": {
            "blood_group": has_value(wallet.blood_group),
            "allergies": has_value(wallet.allergies),
            "chronic_conditions": has_value(wallet.chronic_conditions),
            "current_medications": has_value(wallet.current_medications),
            "emergency_notes": has_value(wallet.emergency_notes),
        },
        "medical_record_count": len(normalized.medical_records),
        "sos_id": normalized.emergency_context.sos_id if normalized.emergency_context else None,
    }
