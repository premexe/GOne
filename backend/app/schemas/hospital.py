from pydantic import BaseModel, ConfigDict
from typing import Optional
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
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
