from typing import List

from app.schemas.sos import SOSResponse
from app.schemas.emergency_response import EmergencyResponseResponse
from app.schemas.emergency_contact import EmergencyContactResponse
from app.schemas.notification import NotificationResponse

from pydantic import BaseModel


class EmergencyTriggerResponse(BaseModel):
    sos: SOSResponse
    emergency_response: EmergencyResponseResponse
    emergency_contacts: List[EmergencyContactResponse]
    notifications: List[NotificationResponse]