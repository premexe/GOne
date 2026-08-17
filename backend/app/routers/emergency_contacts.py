from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.users import User
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate
)
from app.services.emergency_contact_service import (
    EmergencyContactService
)
from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/emergency-contacts",
    tags=["Emergency Contacts"]
)


@router.post(
    "/",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED
)
def create_contact(
    contact_data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyContactService.create_contact(
        db,
        current_user.user_id,
        contact_data
    )


@router.get(
    "/",
    response_model=List[EmergencyContactResponse]
)
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyContactService.get_contacts(
        db,
        current_user.user_id
    )


@router.put(
    "/{contact_id}",
    response_model=EmergencyContactResponse
)
def update_contact(
    contact_id: int,
    contact_data: EmergencyContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyContactService.update_contact(
        db,
        current_user.user_id,
        contact_id,
        contact_data
    )


@router.delete(
    "/{contact_id}"
)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return EmergencyContactService.delete_contact(
        db,
        current_user.user_id,
        contact_id
    )