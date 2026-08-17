from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    record_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True
    )

    # Medical record information
    record_type = Column(
        String(50),
        nullable=False
    )

    title = Column(
        String(200),
        nullable=False
    )

    hospital_name = Column(
        String(200),
        nullable=True
    )

    doctor_name = Column(
        String(200),
        nullable=True
    )

    record_date = Column(
        Date,
        nullable=True
    )

    # Uploaded file information
    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=False
    )

    # Processing results
    ocr_text = Column(
        Text,
        nullable=True
    )

    ai_summary = Column(
        Text,
        nullable=True
    )

    # Timestamps
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