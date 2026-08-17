from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func

from app.database.base import Base


class EmergencyResponse(Base):
    __tablename__ = "emergency_responses"

    response_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sos_id = Column(
        Integer,
        ForeignKey("sos.sos_id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="INITIATED"
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )