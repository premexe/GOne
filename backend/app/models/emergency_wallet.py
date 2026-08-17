from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class EmergencyWallet(Base):
    __tablename__ = "emergency_wallets"

    wallet_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
        index=True
    )

    # Core emergency medical information
    blood_group = Column(
        String(10),
        nullable=True
    )

    allergies = Column(
        Text,
        nullable=True
    )

    chronic_conditions = Column(
        Text,
        nullable=True
    )

    current_medications = Column(
        Text,
        nullable=True
    )

    # Useful emergency information
    emergency_notes = Column(
        Text,
        nullable=True
    )

    # Generated/calculated later
    readiness_score = Column(
        Integer,
        nullable=True
    )

    ai_health_summary = Column(
        Text,
        nullable=True
    )

    # Tracking
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user = relationship("User")