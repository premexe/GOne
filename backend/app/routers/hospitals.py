from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.hospital import Hospital
from app.schemas.hospital import HospitalCreate, HospitalResponse, HospitalUpdate
from app.repositories.hospital_repository import HospitalRepository

router = APIRouter(
    prefix="/hospitals",
    tags=["Hospitals"]
)

INITIAL_HOSPITALS = [
    {
        "name": "CityCare Super Specialty Hospital",
        "address": "104 Healthcare Boulevard, City Core",
        "latitude": 19.697,
        "longitude": 72.766,
        "total_beds": 120,
        "icu_beds": 18,
        "oxygen_beds": 25,
        "phone_number": "+1 (800) 555-0199",
        "rating": 4.8
    },
    {
        "name": "Metro City Heart & Cardiac Hospital",
        "address": "45 Cardiac Drive, East District",
        "latitude": 19.710,
        "longitude": 72.790,
        "total_beds": 85,
        "icu_beds": 4,
        "oxygen_beds": 12,
        "phone_number": "+1 (800) 555-0144",
        "rating": 4.9
    },
    {
        "name": "St. Jude District Emergency Care",
        "address": "88 St. Jude Way, West Sector",
        "latitude": 19.680,
        "longitude": 72.740,
        "total_beds": 60,
        "icu_beds": 22,
        "oxygen_beds": 30,
        "phone_number": "+1 (800) 555-0177",
        "rating": 4.5
    },
    {
        "name": "Apex Pulmonary & Neuroscience Institute",
        "address": "12 Apex Heights, North Medical Park",
        "latitude": 19.725,
        "longitude": 72.755,
        "total_beds": 150,
        "icu_beds": 11,
        "oxygen_beds": 20,
        "phone_number": "+1 (800) 555-0122",
        "rating": 4.7
    }
]

def seed_hospitals_if_empty(db: Session):
    count = db.query(Hospital).count()
    if count == 0:
        for h_data in INITIAL_HOSPITALS:
            h = Hospital(**h_data)
            db.add(h)
        db.commit()

@router.get("/", response_model=List[HospitalResponse])
def get_hospitals(db: Session = Depends(get_db)):
    seed_hospitals_if_empty(db)
    return HospitalRepository.get_all(db)

@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital_by_id(hospital_id: int, db: Session = Depends(get_db)):
    seed_hospitals_if_empty(db)
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return hospital

@router.post("/", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(hospital_data: HospitalCreate, db: Session = Depends(get_db)):
    new_h = Hospital(**hospital_data.model_dump())
    return HospitalRepository.create(db, new_h)

@router.put("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(hospital_id: int, update_data: HospitalUpdate, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return HospitalRepository.update(db, hospital, update_data)
