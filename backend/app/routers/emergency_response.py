from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.users import User
from app.schemas.emergency_response import (
    EmergencyResponseCreate,
    EmergencyResponseResponse,
    EmergencyResponseUpdate
)
from app.services.emergency_response_service import (
    EmergencyResponseService
)
from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/emergency-response",
    tags=["Emergency Response"]
)


@router.post(
    "/",
    response_model=EmergencyResponseResponse,
    status_code=status.HTTP_201_CREATED
)
def create_response(
    response_data: EmergencyResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyResponseService.create_response(
        db,
        current_user.user_id,
        response_data
    )


@router.get(
    "/{response_id}",
    response_model=EmergencyResponseResponse
)
def get_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyResponseService.get_response(
        db,
        current_user.user_id,
        response_id
    )


@router.get(
    "/",
    response_model=List[EmergencyResponseResponse]
)
def get_user_responses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyResponseService.get_user_responses(
        db,
        current_user.user_id
    )


@router.put(
    "/{response_id}",
    response_model=EmergencyResponseResponse
)
def update_response(
    response_id: int,
    response_data: EmergencyResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyResponseService.update_response_status(
        db,
        current_user.user_id,
        response_id,
        response_data
    )