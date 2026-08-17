from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.emergency_response import EmergencyResponse
from app.models.sos import SOS

from app.repositories.emergency_response_repository import (
    EmergencyResponseRepository
)

from app.repositories.sos_repository import SOSRepository

from app.schemas.emergency_response import (
    EmergencyResponseCreate,
    EmergencyResponseUpdate
)


class EmergencyResponseService:

    @staticmethod
    def create_response(
        db: Session,
        user_id: int,
        response_data: EmergencyResponseCreate,
        commit: bool = True
    ):

        # Find the SOS
        sos = SOSRepository.get_by_id(
            db,
            response_data.sos_id
        )

        if not sos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SOS not found."
            )

        # Make sure SOS belongs to current user
        if sos.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to access this SOS."
            )

        # SOS must be active
        if sos.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOS is not active."
            )

        # Check if response already exists
        existing_response = (
            EmergencyResponseRepository.get_by_sos(
                db,
                response_data.sos_id
            )
        )

        if existing_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency response already exists for this SOS."
            )

        # Create response
        new_response = EmergencyResponse(
            sos_id=sos.sos_id,
            user_id=user_id,
            status="INITIATED"
        )

        return EmergencyResponseRepository.create(
            db,
            new_response,
            commit=commit
        )

    @staticmethod
    def get_response(
        db: Session,
        user_id: int,
        response_id: int
    ):

        response = EmergencyResponseRepository.get_by_id(
            db,
            response_id
        )

        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency response not found."
            )

        # Make sure response belongs to current user
        if response.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to access this response."
            )

        return response

    @staticmethod
    def get_user_responses(
        db: Session,
        user_id: int
    ):

        return EmergencyResponseRepository.get_by_user(
            db,
            user_id
        )

    @staticmethod
    def update_response_status(
        db: Session,
        user_id: int,
        response_id: int,
        response_data: EmergencyResponseUpdate
    ):

        response = EmergencyResponseRepository.get_by_id(
            db,
            response_id
        )

        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency response not found."
            )

        # Make sure response belongs to current user
        if response.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to update this response."
            )

        allowed_transitions = {
            "INITIATED": ["IN_PROGRESS"],
            "IN_PROGRESS": ["COMPLETED"],
            "COMPLETED": []
        }

        current_status = response.status
        new_status = response_data.status

        if new_status not in allowed_transitions[current_status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status transition: "
                    f"{current_status} → {new_status}."
                )
            )

        # Update response status
        response.status = new_status

        # If emergency response is completed,
        # resolve the associated SOS
        if new_status == "COMPLETED":

            sos = SOSRepository.get_by_id(
                db,
                response.sos_id
            )

            if sos and sos.status == "ACTIVE":
                sos.status = "RESOLVED"

        return EmergencyResponseRepository.update(
            db,
            response
        )