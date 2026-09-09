from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class HospitalCreate(BaseModel):
    name: str
    address: Optional[str] = "Medical District"
    latitude: float = 19.700
    longitude: float = 72.770
    total_beds: int = 100
    icu_beds: int = 10
    oxygen_beds: int = 15
    general_occupied: int = 0
    icu_occupied: int = 0
    emergency_occupied: int = 0
    phone_number: Optional[str] = "+1 800-555-0199"
    rating: float = 4.8
    hospital_user_id: Optional[int] = None
    email: Optional[str] = None
    # Password for hospital admin login – hashed and stored in the users table
    password: Optional[str] = None

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_beds: Optional[int] = None
    icu_beds: Optional[int] = None
    oxygen_beds: Optional[int] = None
    general_occupied: Optional[int] = None
    icu_occupied: Optional[int] = None
    emergency_occupied: Optional[int] = None
    phone_number: Optional[str] = None
    rating: Optional[float] = None
    hospital_user_id: Optional[int] = None
    email: Optional[str] = None

class HospitalResponse(BaseModel):
    hospital_id: int
    name: str
    address: Optional[str]
    latitude: float
    longitude: float
    total_beds: int
    icu_beds: int
    oxygen_beds: int
    general_occupied: int = 0
    icu_occupied: int = 0
    emergency_occupied: int = 0
    phone_number: Optional[str]
    rating: float
    hospital_user_id: Optional[int] = None
    email: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ── Hospital Login ──────────────────────────────────────────────────────────
class HospitalLogin(BaseModel):
    email: str
    password: str

class HospitalLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    hospital: HospitalResponse

# ── Bed update (occupancy only) ─────────────────────────────────────────────
class BedUpdate(BaseModel):
    general_occupied: Optional[int] = None
    icu_occupied: Optional[int] = None
    emergency_occupied: Optional[int] = None
    total_beds: Optional[int] = None
    icu_beds: Optional[int] = None
    oxygen_beds: Optional[int] = None

# ── Inline sub-schemas for resources response ────────────────────────────────
class AmbulanceInline(BaseModel):
    ambulance_id: int
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    status: Optional[str] = "AVAILABLE"
    location_label: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DoctorInline(BaseModel):
    doctor_id: int
    name: str
    specialization: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    availability_status: Optional[str] = None
    current_cases: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)

class HospitalResourcesResponse(BaseModel):
    hospital_id: int
    name: str
    total_beds: int
    icu_beds: int
    oxygen_beds: int
    general_occupied: int = 0
    icu_occupied: int = 0
    emergency_occupied: int = 0
    ambulances: List[AmbulanceInline] = []
    doctors: List[DoctorInline] = []
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

