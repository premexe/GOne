from sqlalchemy.orm import Session
from app.models.hospital import Hospital
from app.schemas.hospital import HospitalCreate, HospitalUpdate

class HospitalRepository:

    @staticmethod
    def get_all(db: Session):
        return db.query(Hospital).all()

    @staticmethod
    def get_by_id(db: Session, hospital_id: int):
        return db.query(Hospital).filter(Hospital.hospital_id == hospital_id).first()

    @staticmethod
    def create(db: Session, hospital: Hospital):
        db.add(hospital)
        db.commit()
        db.refresh(hospital)
        return hospital

    @staticmethod
    def update(db: Session, hospital: Hospital, update_data: HospitalUpdate):
        data = update_data.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(hospital, key, value)
        db.commit()
        db.refresh(hospital)
        return hospital
