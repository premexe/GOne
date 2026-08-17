from sqlalchemy.orm import Session

from app.models.emergency_response import EmergencyResponse


class EmergencyResponseRepository:

    @staticmethod
    def create(
        db: Session,
        response: EmergencyResponse,
        commit: bool = True
    ):
        db.add(response)

        if commit:
            db.commit()
            db.refresh(response)
        else:
            db.flush()

        return response

    @staticmethod
    def get_by_id(
        db: Session,
        response_id: int
    ):
        return (
            db.query(EmergencyResponse)
            .filter(
                EmergencyResponse.response_id == response_id
            )
            .first()
        )

    @staticmethod
    def get_by_sos(
        db: Session,
        sos_id: int
    ):
        return (
            db.query(EmergencyResponse)
            .filter(
                EmergencyResponse.sos_id == sos_id
            )
            .first()
        )

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int
    ):
        return (
            db.query(EmergencyResponse)
            .filter(
                EmergencyResponse.user_id == user_id
            )
            .all()
        )

    @staticmethod
    def update(
        db: Session,
        response: EmergencyResponse
    ):
        db.commit()
        db.refresh(response)

        return response

    @staticmethod
    def delete(
        db: Session,
        response: EmergencyResponse
    ):
        db.delete(response)
        db.commit()

        return True