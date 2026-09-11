from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import Base


class SOS(Base):
    __tablename__ = "sos"

    sos_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    description = Column(Text, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="ACTIVE"
    )

    accepted_hospital_id = Column(
        Integer,
        ForeignKey("hospitals.hospital_id", ondelete="SET NULL"),
        nullable=True
    )

    assigned_ambulance_id = Column(
        Integer,
        ForeignKey("ambulances.ambulance_id", ondelete="SET NULL"),
        nullable=True
    )

    assigned_doctor_id = Column(
        Integer,
        ForeignKey("doctors.doctor_id", ondelete="SET NULL"),
        nullable=True
    )

    dispatch_status = Column(
        String(50),
        nullable=False,
        default="RECEIVED"
    )

    patient_name = Column(String(150), nullable=True)
    patient_phone = Column(String(50), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    user = relationship("User", foreign_keys=[user_id])
    hospital = relationship("Hospital", foreign_keys=[accepted_hospital_id])
    ambulance = relationship("Ambulance", foreign_keys=[assigned_ambulance_id])
    doctor = relationship("Doctor", foreign_keys=[assigned_doctor_id])
    rejections = relationship("SOSRejection", back_populates="sos", cascade="all, delete-orphan")
