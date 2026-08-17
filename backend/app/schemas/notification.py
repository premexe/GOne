from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ==========================
# Create Notification
# ==========================
class NotificationCreate(BaseModel):
    recipient_type: str
    recipient_id: Optional[int] = None
    channel: str
    message: str


# ==========================
# Update Notification
# ==========================
class NotificationUpdate(BaseModel):
    status: str


# ==========================
# Notification Response
# ==========================
class NotificationResponse(BaseModel):
    notification_id: int
    response_id: int
    user_id: int
    recipient_type: str
    recipient_id: Optional[int]
    channel: str
    status: str
    message: str
    created_at: datetime
    sent_at: Optional[datetime]

    model_config = {
        "from_attributes": True
    }