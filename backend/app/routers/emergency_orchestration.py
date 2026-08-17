from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.users import User

from app.schemas.sos import SOSCreate
from app.schemas.emergency_orchestration import (
    EmergencyTriggerResponse
)

from app.services.emergency_orchestration_service import (
    EmergencyOrchestrationService
)

from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/emergency",
    tags=["Emergency Orchestration"]
)


@router.post(
    "/trigger",
    response_model=EmergencyTriggerResponse,
    status_code=status.HTTP_201_CREATED
)
def trigger_emergency(
    sos_data: SOSCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyOrchestrationService.trigger_emergency(
        db,
        current_user.user_id,
        sos_data
    )