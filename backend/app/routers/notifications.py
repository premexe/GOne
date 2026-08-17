from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.users import User

from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate
)

from app.services.notification_service import (
    NotificationService
)

from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.post(
    "/{response_id}",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_notification(
    response_id: int,
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return NotificationService.create_notification(
        db,
        current_user.user_id,
        response_id,
        notification_data
    )


@router.get(
    "/",
    response_model=List[NotificationResponse]
)
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return NotificationService.get_user_notifications(
        db,
        current_user.user_id
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return NotificationService.get_notification(
        db,
        current_user.user_id,
        notification_id
    )


@router.get(
    "/response/{response_id}",
    response_model=List[NotificationResponse]
)
def get_response_notifications(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return NotificationService.get_response_notifications(
        db,
        current_user.user_id,
        response_id
    )


@router.put(
    "/{notification_id}",
    response_model=NotificationResponse
)
def update_notification_status(
    notification_id: int,
    notification_data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return NotificationService.update_notification_status(
        db,
        current_user.user_id,
        notification_id,
        notification_data
    )