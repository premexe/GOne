from sqlalchemy.orm import Session

from app.models.medical_record import MedicalRecord


class MedicalRecordRepository:

    @staticmethod
    def create(
        db: Session,
        record: MedicalRecord
    ):
        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int
    ):
        return (
            db.query(MedicalRecord)
            .filter(
                MedicalRecord.user_id == user_id
            )
            .order_by(
                MedicalRecord.created_at.desc()
            )
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        record_id: int
    ):
        return (
            db.query(MedicalRecord)
            .filter(
                MedicalRecord.record_id == record_id
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        record: MedicalRecord
    ):
        db.commit()
        db.refresh(record)

        return record