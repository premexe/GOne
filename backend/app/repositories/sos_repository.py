from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.sos import SOS

class SOSRepository:

    @staticmethod
    def create(
        db: Session,
        sos: SOS,
        commit: bool = True
    ) -> SOS:
        db.add(sos)
        if commit:
            db.commit()
            db.refresh(sos)
        else:
            db.flush()
        return sos

    @staticmethod
    def get_by_id(db: Session, sos_id: int) -> Optional[SOS]:
        return (
            db.query(SOS)
            .filter(SOS.sos_id == sos_id)
            .first()
        )

    @staticmethod
    def get_active_by_user(db: Session, user_id: int) -> Optional[SOS]:
        return (
            db.query(SOS)
            .filter(
                SOS.user_id == user_id,
                SOS.status.in_(["ACTIVE", "ACCEPTED", "IN_PROGRESS"])
            )
            .order_by(SOS.created_at.desc())
            .first()
        )

    @staticmethod
    def get_all_active(db: Session) -> List[SOS]:
        return (
            db.query(SOS)
            .filter(SOS.status != "RESOLVED")
            .order_by(SOS.created_at.desc())
            .all()
        )

    @staticmethod
    def get_by_hospital(db: Session, hospital_id: int) -> List[SOS]:
        return (
            db.query(SOS)
            .filter(
                SOS.accepted_hospital_id == hospital_id,
                SOS.status != "RESOLVED"
            )
            .order_by(SOS.created_at.desc())
            .all()
        )

    @staticmethod
    def get_completed(db: Session, hospital_id: Optional[int] = None) -> List[SOS]:
        query = db.query(SOS).filter(
            (SOS.status == "RESOLVED") | (SOS.dispatch_status.in_(["COMPLETED", "completed"]))
        )
        if hospital_id:
            query = query.filter(SOS.accepted_hospital_id == hospital_id)
        return query.order_by(SOS.created_at.desc()).all()

    @staticmethod
    def update(db: Session, sos: SOS) -> SOS:
        db.commit()
        db.refresh(sos)
        return sos