from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ==========================
# Create Emergency Contact
# ==========================
class EmergencyContactCreate(BaseModel):
    name: str
    phone_number: str
    relationship: Optional[str] = None
    is_primary: bool = False


# ==========================
# Update Emergency Contact
# ==========================
class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None


# ==========================
# Emergency Contact Response
# ==========================
class EmergencyContactResponse(BaseModel):
    contact_id: int
    user_id: int
    name: str
    phone_number: str
    relationship: Optional[str]
    is_primary: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }