from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.database.base import Base


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    contact_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    name = Column(
        String(100),
        nullable=False
    )

    phone_number = Column(
        String(15),
        nullable=False
    )

    relationship = Column(
        String(50),
        nullable=True
    )

    is_primary = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )