from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ambulance import AmbulanceCreate, AmbulanceUpdate, AmbulanceResponse
from app.repositories.ambulance_repository import AmbulanceRepository
from app.repositories.hospital_repository import HospitalRepository

router = APIRouter(
    prefix="/hospitals/{hospital_id}/ambulances",
    tags=["Ambulances"]
)

@router.get("/", response_model=List[AmbulanceResponse])
def get_ambulances_for_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return AmbulanceRepository.get_by_hospital(db, hospital_id)

@router.post("/", response_model=AmbulanceResponse, status_code=status.HTTP_201_CREATED)
def add_ambulance(hospital_id: int, ambulance_data: AmbulanceCreate, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return AmbulanceRepository.create(db, hospital_id, ambulance_data)

@router.put("/{ambulance_id}", response_model=AmbulanceResponse)
def update_ambulance(hospital_id: int, ambulance_id: int, update_data: AmbulanceUpdate, db: Session = Depends(get_db)):
    ambulance = AmbulanceRepository.get_by_id(db, ambulance_id)
    if not ambulance or ambulance.hospital_id != hospital_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance not found in this hospital")
    return AmbulanceRepository.update(db, ambulance, update_data)

@router.delete("/{ambulance_id}", status_code=status.HTTP_200_OK)
def remove_ambulance(hospital_id: int, ambulance_id: int, db: Session = Depends(get_db)):
    ambulance = AmbulanceRepository.get_by_id(db, ambulance_id)
    if not ambulance or ambulance.hospital_id != hospital_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance not found in this hospital")
    AmbulanceRepository.delete(db, ambulance)
    return {"message": "Ambulance removed successfully"}
