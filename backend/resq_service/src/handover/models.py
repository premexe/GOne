from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class HandoverPayload(BaseModel):
    schema_version: str = "1.0.0"
    session_id: str
    patient_id: Optional[str] = "UNKNOWN"
    patient_name: Optional[str] = "Unidentified Patient"
    patient_age: Optional[int] = None
    blood_group: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    existing_conditions: List[str] = Field(default_factory=list)
    emergency_type: str
    severity: str
    transcript_summary: str
    actions_already_given: List[str] = Field(default_factory=list)
    emergency_contacts: List[str] = Field(default_factory=list)
    escalation_reason: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())