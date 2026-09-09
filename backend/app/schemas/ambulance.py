from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AmbulanceBase(BaseModel):
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    location_label: Optional[str] = "Hospital Fleet"
    status: Optional[str] = "AVAILABLE"

class AmbulanceCreate(AmbulanceBase):
    pass

class AmbulanceUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    location_label: Optional[str] = None
    status: Optional[str] = None

class AmbulanceResponse(AmbulanceBase):
    ambulance_id: int
    hospital_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
