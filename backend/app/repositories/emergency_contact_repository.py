from sqlalchemy.orm import Session

from app.models.emergency_contact import EmergencyContact


class EmergencyContactRepository:

    @staticmethod
    def create(
        db: Session,
        contact: EmergencyContact
    ):
        db.add(contact)
        db.commit()
        db.refresh(contact)

        return contact

    @staticmethod
    def get_by_id(
        db: Session,
        contact_id: int
    ):
        return (
            db.query(EmergencyContact)
            .filter(
                EmergencyContact.contact_id == contact_id
            )
            .first()
        )

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int
    ):
        return (
            db.query(EmergencyContact)
            .filter(
                EmergencyContact.user_id == user_id
            )
            .all()
        )

    @staticmethod
    def update(
        db: Session,
        contact: EmergencyContact
    ):
        db.commit()
        db.refresh(contact)

        return contact

    @staticmethod
    def delete(
        db: Session,
        contact: EmergencyContact
    ):
        db.delete(contact)
        db.commit()

        return True