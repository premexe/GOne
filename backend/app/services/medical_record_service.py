from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.medical_record import MedicalRecord

from app.repositories.medical_record_repository import (
    MedicalRecordRepository
)


class MedicalRecordService:

    @staticmethod
    def create_record(
        db: Session,
        user_id: int,
        record: MedicalRecord
    ):
        # Make sure the record belongs to
        # the authenticated user
        record.user_id = user_id

        return MedicalRecordRepository.create(
            db,
            record
        )

    @staticmethod
    def get_records(
        db: Session,
        user_id: int
    ):
        return MedicalRecordRepository.get_by_user(
            db,
            user_id
        )

    @staticmethod
    def get_record(
        db: Session,
        user_id: int,
        record_id: int
    ):

        record = MedicalRecordRepository.get_by_id(
            db,
            record_id
        )

        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medical record not found."
            )

        # Make sure the record belongs to
        # the authenticated user
        if record.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You are not allowed to access "
                    "this medical record."
                )
            )

        return record