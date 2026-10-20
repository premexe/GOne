from typing import List, Optional
from pydantic import BaseModel, Field

class PatientContext(BaseModel):
    patient_id: str = "UNKNOWN_PATIENT"
    name: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    existing_conditions: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    emergency_contacts: List[str] = Field(default_factory=list)
    medical_reports: List[str] = Field(default_factory=list)
    relevant_medical_history: Optional[str] = None

    def summarize_for_prompt(self) -> str:
        parts = []
        if self.name:
            parts.append(f"Name: {self.name}")
        if self.age:
            parts.append(f"Age: {self.age}")
        if self.blood_group:
            parts.append(f"Blood Group: {self.blood_group}")
        if self.allergies:
            parts.append(f"Allergies: {', '.join(self.allergies)}")
        if self.existing_conditions:
            parts.append(f"Conditions: {', '.join(self.existing_conditions)}")
        if self.medications:
            parts.append(f"Current Medications: {', '.join(self.medications)}")
        if self.relevant_medical_history:
            parts.append(f"History: {self.relevant_medical_history}")
            
        if not parts:
            return "Patient medical profile: Unavailable. Proceed cautiously."
        return "Patient Profile: " + " | ".join(parts)