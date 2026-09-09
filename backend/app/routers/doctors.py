from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.hospital_repository import HospitalRepository

router = APIRouter(
    prefix="/hospitals/{hospital_id}/doctors",
    tags=["Doctors"]
)

@router.get("/", response_model=List[DoctorResponse])
def get_doctors_for_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return DoctorRepository.get_by_hospital(db, hospital_id)

@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def add_doctor(hospital_id: int, doctor_data: DoctorCreate, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return DoctorRepository.create(db, hospital_id, doctor_data)

@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(hospital_id: int, doctor_id: int, update_data: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = DoctorRepository.get_by_id(db, doctor_id)
    if not doctor or doctor.hospital_id != hospital_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in this hospital")
    return DoctorRepository.update(db, doctor, update_data)

@router.delete("/{doctor_id}", status_code=status.HTTP_200_OK)
def remove_doctor(hospital_id: int, doctor_id: int, db: Session = Depends(get_db)):
    doctor = DoctorRepository.get_by_id(db, doctor_id)
    if not doctor or doctor.hospital_id != hospital_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in this hospital")
    DoctorRepository.delete(db, doctor)
    return {"message": "Doctor removed successfully"}
