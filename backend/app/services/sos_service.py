from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.sos import SOS
from app.repositories.sos_repository import SOSRepository
from app.schemas.sos import SOSCreate


class SOSService:

    @staticmethod
    def create_sos(
        db: Session,
        user_id: int,
        sos_data: SOSCreate,
        commit: bool = True
    ):

        # Check if user already has an active SOS
        active_sos = SOSRepository.get_active_by_user(
            db,
            user_id
        )

        if active_sos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active SOS."
            )

        # Create new SOS
        new_sos = SOS(
            user_id=user_id,
            description=sos_data.description,
            latitude=sos_data.latitude,
            longitude=sos_data.longitude,
            status="ACTIVE"
        )

        return SOSRepository.create(
            db,
            new_sos,
            commit=commit
        )

    @staticmethod
    def get_active_sos(
        db: Session,
        user_id: int
    ):

        return SOSRepository.get_active_by_user(
            db,
            user_id
        )

    @staticmethod
    def resolve_sos(
        db: Session,
        user_id: int,
        sos_id: int
    ):

        # Find the SOS
        sos = SOSRepository.get_by_id(
            db,
            sos_id
        )

        # SOS does not exist
        if not sos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SOS not found."
            )

        # Make sure this SOS belongs to the logged-in user
        if sos.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to resolve this SOS."
            )

        # Check if SOS is already resolved
        if sos.status == "RESOLVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOS is already resolved."
            )

        # Resolve SOS
        sos.status = "RESOLVED"
        sos.resolved_at = func.now()

        return SOSRepository.update(
            db,
            sos
        )