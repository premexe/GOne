from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ==========================
# Create SOS
# ==========================
class SOSCreate(BaseModel):
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ==========================
# SOS Response
# ==========================
class SOSResponse(BaseModel):
    sos_id: int
    user_id: int
    description: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }