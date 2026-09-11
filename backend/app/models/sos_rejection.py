from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class SOSRejection(Base):
    __tablename__ = "sos_rejections"

    rejection_id = Column(Integer, primary_key=True, index=True)
    sos_id = Column(Integer, ForeignKey("sos.sos_id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.hospital_id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sos = relationship("SOS", back_populates="rejections")
    hospital = relationship("Hospital")

    @property
    def hospital_name(self):
        return self.hospital.name if self.hospital else "Hospital"
