from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class DoctorBase(BaseModel):
    name: str
    department: Optional[str] = "Emergency"
    specialization: Optional[str] = "General Physician"
    phone: Optional[str] = None
    status: Optional[str] = "AVAILABLE"
    current_cases: Optional[int] = 0

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    current_cases: Optional[int] = None

class DoctorResponse(DoctorBase):
    doctor_id: int
    hospital_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
