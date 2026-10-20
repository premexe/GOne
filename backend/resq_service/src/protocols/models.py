from typing import List
from pydantic import BaseModel, Field

class EmergencyProtocol(BaseModel):
    emergency_type: str
    severity: str
    escalation_condition: str
    source: str
    approved_actions: List[str] = Field(default_factory=list)
    critical_actions: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)