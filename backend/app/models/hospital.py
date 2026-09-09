from sqlalchemy import Column, Integer, String, Float, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False, default=19.700)
    longitude = Column(Float, nullable=False, default=72.770)
    total_beds = Column(Integer, nullable=False, default=100)
    icu_beds = Column(Integer, nullable=False, default=10)
    oxygen_beds = Column(Integer, nullable=False, default=15)
    general_occupied = Column(Integer, nullable=False, default=0)
    icu_occupied = Column(Integer, nullable=False, default=0)
    emergency_occupied = Column(Integer, nullable=False, default=0)
    phone_number = Column(String(50), nullable=True)
    rating = Column(Float, nullable=False, default=4.8)

    # ── Hospital admin login credentials (stored here, NOT in users table) ──
    email = Column(String(150), nullable=True, unique=True)
    password_hash = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    doctors = relationship("Doctor", back_populates="hospital", cascade="all, delete-orphan")
    ambulances = relationship("Ambulance", back_populates="hospital", cascade="all, delete-orphan")
