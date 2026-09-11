from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.sos import (
    SOSCreate,
    SOSResponse,
    SOSAccept,
    SOSReject,
    SOSStatusUpdate,
    SOSLocationUpdate,
    SOSAmbulanceAssign,
    SOSDoctorAssign,
)
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
    "/",
    response_model=List[SOSResponse]
)
def get_all_active_sos(
    hospital_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Fetch all active SOS requests. Used by hospital dashboards."""
    return SOSService.get_all_active_sos(db, hospital_id)


@router.get(
    "/completed",
    response_model=List[SOSResponse]
)
def get_completed_sos(
    hospital_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Fetch all resolved/completed SOS requests. Supports filtering by hospital_id."""
    return SOSService.get_completed_sos(db, hospital_id)


@router.get(
    "/completed/{hospital_id}",
    response_model=List[SOSResponse]
)
def get_completed_sos_for_hospital(
    hospital_id: int,
    db: Session = Depends(get_db)
):
    """Get all completed SOS requests for a specific hospital."""
    return SOSService.get_completed_sos(db, hospital_id)


@router.get(
    "/hospital/{hospital_id}",
    response_model=List[SOSResponse]
)
def get_sos_for_hospital(
    hospital_id: int,
    db: Session = Depends(get_db)
):
    """Get all SOS requests accepted by a specific hospital."""
    from app.models.sos import SOS
    return db.query(SOS).filter(
        SOS.accepted_hospital_id == hospital_id,
        SOS.status.in_(["ACTIVE", "ACCEPTED", "IN_PROGRESS"])
    ).all()


@router.get(
    "/my-active",
    response_model=Optional[SOSResponse]
)
def get_my_active_sos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return SOSService.get_active_sos(
        db,
        current_user.user_id
    )


@router.patch(
    "/{sos_id}/location",
    response_model=SOSResponse,
)
def update_sos_location(
    sos_id: int,
    payload: SOSLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace the initial fast SOS position with the phone's precise GPS fix."""
    return SOSService.update_location(
        db, current_user.user_id, sos_id, payload.latitude, payload.longitude
    )


@router.get(
    "/{sos_id}",
    response_model=SOSResponse
)
def get_sos_by_id(
    sos_id: int,
    db: Session = Depends(get_db)
):
    return SOSService.get_by_id(db, sos_id)


@router.post(
    "/{sos_id}/accept",
    response_model=SOSResponse
)
def accept_sos(
    sos_id: int,
    payload: Optional[SOSAccept] = None,
    db: Session = Depends(get_db)
):
    # If payload provided, use it; otherwise default to hospital 5 (CityCare) or 1
    h_id = payload.hospital_id if payload else 5
    return SOSService.accept_sos(db, sos_id, h_id)


@router.post(
    "/{sos_id}/reject",
    response_model=SOSResponse
)
def reject_sos(
    sos_id: int,
    payload: Optional[SOSReject] = None,
    db: Session = Depends(get_db)
):
    h_id = payload.hospital_id if payload and payload.hospital_id else 5
    reason = payload.reason if payload and payload.reason else ""
    return SOSService.reject_sos(db, sos_id, h_id, reason)


@router.patch(
    "/{sos_id}/status",
    response_model=SOSResponse
)
def update_sos_status(
    sos_id: int,
    payload: SOSStatusUpdate,
    db: Session = Depends(get_db)
):
    return SOSService.update_dispatch_status(db, sos_id, payload.status)


@router.post(
    "/{sos_id}/ambulance-assignment",
    response_model=SOSResponse
)
def assign_ambulance(
    sos_id: int,
    payload: SOSAmbulanceAssign,
    db: Session = Depends(get_db)
):
    return SOSService.assign_ambulance(db, sos_id, payload.ambulance_id)


@router.post(
    "/{sos_id}/doctor-assignment",
    response_model=SOSResponse
)
def assign_doctor(
    sos_id: int,
    payload: SOSDoctorAssign,
    db: Session = Depends(get_db)
):
    return SOSService.assign_doctor(db, sos_id, payload.doctor_id)


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
