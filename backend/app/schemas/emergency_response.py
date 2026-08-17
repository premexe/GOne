from datetime import datetime

from pydantic import BaseModel


# ==========================
# Emergency Response Create
# ==========================
class EmergencyResponseCreate(BaseModel):
    sos_id: int


# ==========================
# Emergency Response Update
# ==========================
class EmergencyResponseUpdate(BaseModel):
    status: str


# ==========================
# Emergency Response
# Response Model
# ==========================
class EmergencyResponseResponse(BaseModel):
    response_id: int
    sos_id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {
        "from_attributes": True
    }