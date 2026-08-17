from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:

    @staticmethod
    def create(
        db: Session,
        notification: Notification,
        commit: bool = True
    ):
        db.add(notification)

        if commit:
            db.commit()
            db.refresh(notification)
        else:
            db.flush()

        return notification

    @staticmethod
    def get_by_id(
        db: Session,
        notification_id: int
    ):
        return (
            db.query(Notification)
            .filter(
                Notification.notification_id == notification_id
            )
            .first()
        )

    @staticmethod
    def get_by_response(
        db: Session,
        response_id: int
    ):
        return (
            db.query(Notification)
            .filter(
                Notification.response_id == response_id
            )
            .all()
        )

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int
    ):
        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id
            )
            .all()
        )

    @staticmethod
    def update(
        db: Session,
        notification: Notification
    ):
        db.commit()
        db.refresh(notification)

        return notification