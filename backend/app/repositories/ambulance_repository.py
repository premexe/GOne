from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.ambulance import Ambulance
from app.schemas.ambulance import AmbulanceCreate, AmbulanceUpdate

class AmbulanceRepository:

    @staticmethod
    def get_by_hospital(db: Session, hospital_id: int) -> List[Ambulance]:
        return db.query(Ambulance).filter(Ambulance.hospital_id == hospital_id).all()

    @staticmethod
    def get_by_id(db: Session, ambulance_id: int) -> Optional[Ambulance]:
        return db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).first()

    @staticmethod
    def create(db: Session, hospital_id: int, ambulance_data: AmbulanceCreate) -> Ambulance:
        ambulance = Ambulance(
            hospital_id=hospital_id,
            **ambulance_data.model_dump()
        )
        db.add(ambulance)
        db.commit()
        db.refresh(ambulance)
        return ambulance

    @staticmethod
    def update(db: Session, ambulance: Ambulance, update_data: AmbulanceUpdate) -> Ambulance:
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(ambulance, key, value)
        db.commit()
        db.refresh(ambulance)
        return ambulance

    @staticmethod
    def delete(db: Session, ambulance: Ambulance) -> None:
        db.delete(ambulance)
        db.commit()
