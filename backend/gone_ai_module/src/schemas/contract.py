"""
Data structures representing the Backend -> AI Input/Output Contract
(see AI_Input_Output_Contract.md) and the module's internal normalized
representation.

These are plain dataclasses (no third-party validation library). This
keeps the dependency footprint at zero for the schema layer and matches
the project's "use AI/tooling only where it adds real value" principle --
this is a straightforward structural mapping problem, not one that
benefits from an additional dependency.

IMPORTANT: Field names below intentionally mirror the contract exactly
(see AI_Input_Output_Contract.md, Section 3-8). Do not rename these
fields without first updating the contract and informing the backend
developer.
"""

from dataclasses import dataclass, field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Normalized (post-preprocessing) structures
# ---------------------------------------------------------------------------
# "Normalized" values use `None` to mean "unavailable / unknown". This is a
# deliberate internal representation choice, distinct from the raw contract
# value "Not Available" (a string). Downstream AI components (implemented
# in later phases) must treat `None` here as "no information", never as
# "confirmed absence" (e.g. `allergies=None` must not be read as "no
# allergies").

@dataclass
class NormalizedWallet:
    blood_group: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    current_medications: Optional[str]
    emergency_notes: Optional[str]


@dataclass
class NormalizedMedicalRecord:
    record_id: Optional[int]
    record_type: Optional[str]
    title: Optional[str]
    hospital_name: Optional[str]
    doctor_name: Optional[str]
    record_date: Optional[str]
    ocr_text: Optional[str]


@dataclass
class NormalizedEmergencyContext:
    sos_id: Optional[int]
    latitude: Optional[float]
    longitude: Optional[float]
    status: Optional[str]


@dataclass
class NormalizedInput:
    """
    The fully validated, preprocessed, and normalized representation of a
    single Backend -> AI request. This is what future AI services
    (Emergency Understanding, Severity Analysis, etc.) will consume --
    none of those services are implemented yet.
    """

    user_id: int
    resolved_description: str
    description_source: str  # "emergency_description" or "emergency.description"
    wallet: NormalizedWallet
    medical_records: List[NormalizedMedicalRecord] = field(default_factory=list)
    emergency_context: Optional[NormalizedEmergencyContext] = None


@dataclass
class PreprocessedInput:
    """
    Container returned by the input pipeline.

    `raw_input` preserves the original backend payload completely
    untouched (a deep copy taken before any processing), separate from
    `normalized`, per the "preserve original input data separately from
    processed data" requirement.
    """

    raw_input: dict
    normalized: NormalizedInput
