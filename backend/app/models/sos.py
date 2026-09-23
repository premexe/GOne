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

    # ── G-ONE AI Triage Results ──────────────────────────────────────────────
    ai_emergency_understanding = Column(Text, nullable=True)   # Brief classification summary
    ai_severity = Column(String(30), nullable=True)            # CRITICAL / HIGH / MODERATE / LOW / UNKNOWN
    ai_required_capabilities = Column(Text, nullable=True)     # Comma-separated required hospital capabilities
    ai_health_summary = Column(Text, nullable=True)            # Structured patient health context summary
    ai_emergency_report = Column(Text, nullable=True)          # Full formatted emergency incident report

    # ── Real-Time Voice Call & Email Delivery ────────────────────────────────
    call_sid = Column(String(100), nullable=True)              # Bland AI call ID
    call_status = Column(String(50), nullable=True, default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    call_transcript = Column(Text, nullable=True)              # Full conversation transcript between AI and patient
    call_summary = Column(Text, nullable=True)                 # Key findings from the AI phone call
    email_sent = Column(Integer, default=0)                    # 0 = not sent, 1 = sent (compatible across DBs)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)

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
