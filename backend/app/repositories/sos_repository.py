from sqlalchemy.orm import Session

from app.models.sos import SOS


class SOSRepository:

    @staticmethod
    def create(
        db: Session,
        sos: SOS,
        commit: bool = True
    ):
        db.add(sos)

        if commit:
            db.commit()
            db.refresh(sos)
        else:
            db.flush()

        return sos

    @staticmethod
    def get_by_id(db: Session, sos_id: int):
        return (
            db.query(SOS)
            .filter(SOS.sos_id == sos_id)
            .first()
        )

    @staticmethod
    def get_active_by_user(db: Session, user_id: int):
        return (
            db.query(SOS)
            .filter(
                SOS.user_id == user_id,
                SOS.status == "ACTIVE"
            )
            .first()
        )

    @staticmethod
    def update(db: Session, sos: SOS):
        db.commit()
        db.refresh(sos)

        return sos