from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Ambulance(Base):
    __tablename__ = "ambulances"

    ambulance_id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.hospital_id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_number = Column(String(50), nullable=False)
    driver_name = Column(String(150), nullable=True)
    driver_phone = Column(String(50), nullable=True)
    location_label = Column(String(100), nullable=False, default="Hospital Fleet")
    status = Column(String(50), nullable=False, default="AVAILABLE")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    hospital = relationship("Hospital", back_populates="ambulances")
