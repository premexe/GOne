from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP
from sqlalchemy.sql import func

from app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    response_id = Column(
        Integer,
        ForeignKey("emergency_responses.response_id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    recipient_type = Column(
        String(30),
        nullable=False
    )

    recipient_id = Column(
        Integer,
        nullable=True
    )

    channel = Column(
        String(20),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    sent_at = Column(
        TIMESTAMP(timezone=True),
        nullable=True
    )