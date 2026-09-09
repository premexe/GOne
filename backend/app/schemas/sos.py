from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.hospital import HospitalResponse
from app.schemas.ambulance import AmbulanceResponse
from app.schemas.doctor import DoctorResponse


# ==========================
# Create SOS
# ==========================
class SOSCreate(BaseModel):
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None


# ==========================
# Hospital Operations
# ==========================
class SOSAccept(BaseModel):
    hospital_id: int

class SOSReject(BaseModel):
    hospital_id: Optional[int] = None
    reason: Optional[str] = None

class SOSStatusUpdate(BaseModel):
    status: str

class SOSAmbulanceAssign(BaseModel):
    ambulance_id: int

class SOSDoctorAssign(BaseModel):
    doctor_id: int


# ==========================
# SOS Response
# ==========================
class SOSResponse(BaseModel):
    sos_id: int
    user_id: int
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    dispatch_status: Optional[str] = "RECEIVED"
    accepted_hospital_id: Optional[int] = None
    assigned_ambulance_id: Optional[int] = None
    assigned_doctor_id: Optional[int] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    hospital: Optional[HospitalResponse] = None
    ambulance: Optional[AmbulanceResponse] = None
    doctor: Optional[DoctorResponse] = None

    model_config = ConfigDict(from_attributes=True)