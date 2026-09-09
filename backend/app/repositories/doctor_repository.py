from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorUpdate

class DoctorRepository:

    @staticmethod
    def get_by_hospital(db: Session, hospital_id: int) -> List[Doctor]:
        return db.query(Doctor).filter(Doctor.hospital_id == hospital_id).all()

    @staticmethod
    def get_by_id(db: Session, doctor_id: int) -> Optional[Doctor]:
        return db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()

    @staticmethod
    def create(db: Session, hospital_id: int, doctor_data: DoctorCreate) -> Doctor:
        doctor = Doctor(
            hospital_id=hospital_id,
            **doctor_data.model_dump()
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
        return doctor

    @staticmethod
    def update(db: Session, doctor: Doctor, update_data: DoctorUpdate) -> Doctor:
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(doctor, key, value)
        db.commit()
        db.refresh(doctor)
        return doctor

    @staticmethod
    def delete(db: Session, doctor: Doctor) -> None:
        db.delete(doctor)
        db.commit()
