"""
Text sanitization for untrusted, user-provided, and OCR-extracted text.

Security requirements implemented here:
  - All text (emergency descriptions, wallet fields, OCR text, medical
    record metadata) is treated purely as inert data. Nothing in this
    module ever evaluates, executes, formats-as-code, or interprets input
    text as instructions. It only performs plain string operations
    (stripping, whitespace normalization, length checks).
  - Enforces the size limits defined in src/utils/constants.py by raising
    InputTooLargeError rather than silently truncating. Silent truncation
    can hide data loss from the rest of the pipeline and from the
    backend; an explicit, safe error is preferable.
  - Removes control characters (other than standard whitespace) that have
    no legitimate place in medical free text and could otherwise cause
    downstream display or logging issues.
  - Never includes the offending text content in any error message.
"""

import re
import unicodedata

from src.schemas.errors import InputTooLargeError

# Matches Unicode control characters (category "Cc") except for the
# whitespace we intentionally keep (\t \n \r), which are normalized
# separately.
_CONTROL_CHAR_PATTERN = re.compile(
    "[" + "".join(
        chr(c) for c in range(0x00, 0x20) if chr(c) not in "\t\n\r"
    ) + chr(0x7F) + "]"
)


def _strip_control_characters(text: str) -> str:
    """Remove non-printable control characters, keep normal whitespace."""
    return _CONTROL_CHAR_PATTERN.sub("", text)


def _collapse_whitespace(text: str) -> str:
    """Collapse runs of whitespace (including newlines/tabs) to single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def sanitize_text(value: str, max_length: int, field_name: str) -> str:
    """
    Sanitize a single untrusted text value.

    - Unicode-normalizes the string (NFC) to avoid lookalike/combining
      character ambiguity.
    - Strips control characters.
    - Collapses whitespace.
    - Enforces max_length; raises InputTooLargeError if exceeded (checked
      on the ORIGINAL value length, before whitespace collapsing, so that
      padding cannot be used to slip a larger payload past the limit).

    This function never logs or includes the input value in any
    exception message.
    """
    if not isinstance(value, str):
        # Defensive: validators.py should already guarantee this, but
        # this function must be safe to call independently too.
        raise InputTooLargeError(
            code="INVALID_TYPE",
            message=f"Field '{field_name}' must be a string.",
            field=field_name,
        )

    if len(value) > max_length:
        raise InputTooLargeError(
            code="TEXT_TOO_LARGE",
            message=f"Field '{field_name}' exceeds the maximum allowed length ({max_length} characters).",
            field=field_name,
        )

    normalized = unicodedata.normalize("NFC", value)
    normalized = _strip_control_characters(normalized)
    normalized = _collapse_whitespace(normalized)
    return normalized
