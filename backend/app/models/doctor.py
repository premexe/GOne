from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.hospital_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=True, default="Emergency")
    specialization = Column(String(100), nullable=True, default="General Physician")
    phone = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="AVAILABLE")
    current_cases = Column(Integer, nullable=False, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    hospital = relationship("Hospital", back_populates="doctors")
