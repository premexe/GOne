"""
Exception hierarchy for the G-ONE AI module.

Security requirement: validation and preprocessing errors must never expose
raw patient or medical information. Every exception in this module carries
only:
  - a machine-readable `code` (safe to log)
  - a human-readable `message` that is generic and content-free
  - an optional `field` name (the NAME of the offending field, never its
    VALUE)

Do not add the actual field value to any exception. If you find yourself
wanting to include the raw value "for debugging", use the field name and/or
a derived, non-sensitive property instead (e.g. its length, not its
content).
"""

from typing import Optional


class GoneAIError(Exception):
    """Base class for all G-ONE AI module errors."""

    def __init__(self, code: str, message: str, field: Optional[str] = None):
        self.code = code
        self.message = message
        self.field = field
        super().__init__(f"[{code}] {message}" + (f" (field={field})" if field else ""))


class ValidationError(GoneAIError):
    """
    Raised when the backend input does not conform to the Backend -> AI
    Input/Output Contract, or when locked project rules (e.g. the
    emergency description resolution rule) cannot be satisfied.
    """


class InputTooLargeError(ValidationError):
    """
    Raised when a text field (emergency description, wallet field, OCR
    text, or record metadata field) exceeds its configured maximum length.

    Only the field name and the configured limit are included in the
    message -- never the field's actual content or even its exact length,
    to avoid leaking information about the payload through error text.
    """
