from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.sos import SOSCreate, SOSResponse
from app.services.sos_service import SOSService
from app.security.dependencies import get_current_user
from app.models.users import User


router = APIRouter(
    prefix="/sos",
    tags=["SOS"]
)


@router.post(
    "/",
    response_model=SOSResponse,
    status_code=status.HTTP_201_CREATED
)
def create_sos(
    sos_data: SOSCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return SOSService.create_sos(
        db,
        current_user.user_id,
        sos_data
    )


@router.get(
    "/my-active",
    response_model=SOSResponse | None
)
def get_my_active_sos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return SOSService.get_active_sos(
        db,
        current_user.user_id
    )

@router.put(
    "/{sos_id}/resolve",
    response_model=SOSResponse
)
def resolve_sos(
    sos_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return SOSService.resolve_sos(
        db,
        current_user.user_id,
        sos_id
    )