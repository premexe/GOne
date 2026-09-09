from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.hospital import Hospital
from app.schemas.hospital import (
    HospitalCreate,
    HospitalResponse,
    HospitalUpdate,
    HospitalLogin,
    HospitalLoginResponse,
    BedUpdate,
    HospitalResourcesResponse,
)
from app.repositories.hospital_repository import HospitalRepository
from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token

router = APIRouter(
    prefix="/hospitals",
    tags=["Hospitals"]
)

# ── Demo hospital seed data ──────────────────────────────────────────────────

DEMO_HOSPITALS = [
    {
        "name": "CityCare Hospital",
        "email": "citycare@lifelink.demo",
        "address": "104 Healthcare Boulevard, City Core",
        "latitude": 19.697,
        "longitude": 72.766,
        "total_beds": 200,
        "icu_beds": 40,
        "oxygen_beds": 40,
        "phone_number": "+91 800-555-0101",
        "rating": 4.8,
    },
    {
        "name": "Metro General Hospital",
        "email": "metro@lifelink.demo",
        "address": "45 Cardiac Drive, East District",
        "latitude": 19.710,
        "longitude": 72.790,
        "total_beds": 150,
        "icu_beds": 30,
        "oxygen_beds": 35,
        "phone_number": "+91 800-555-0202",
        "rating": 4.7,
    },
    {
        "name": "Lifeline Medical Centre",
        "email": "lifeline@lifelink.demo",
        "address": "88 Lifeline Way, West Sector",
        "latitude": 19.680,
        "longitude": 72.740,
        "total_beds": 120,
        "icu_beds": 25,
        "oxygen_beds": 30,
        "phone_number": "+91 800-555-0303",
        "rating": 4.6,
    },
    {
        "name": "Harbourview Emergency Hospital",
        "email": "harbourview@lifelink.demo",
        "address": "12 Harbour Heights, North Medical Park",
        "latitude": 19.725,
        "longitude": 72.755,
        "total_beds": 180,
        "icu_beds": 35,
        "oxygen_beds": 45,
        "phone_number": "+91 800-555-0404",
        "rating": 4.9,
    },
]

DEMO_PASSWORD = "Demo@123"


def seed_demo_hospitals(db: Session):
    """
    Ensure the 4 demo hospitals exist with their admin credentials stored
    directly in the hospitals table (email + password_hash).
    Safe to call on every startup — skips hospitals that already exist.
    """
    for hdata in DEMO_HOSPITALS:
        email = hdata["email"]
        existing = db.query(Hospital).filter(Hospital.email == email).first()
        if existing:
            # Ensure password_hash is set even for old rows
            if not existing.password_hash:
                existing.password_hash = hash_password(DEMO_PASSWORD)
                db.flush()
            continue

        hospital = Hospital(
            name=hdata["name"],
            email=email,
            address=hdata["address"],
            latitude=hdata["latitude"],
            longitude=hdata["longitude"],
            total_beds=hdata["total_beds"],
            icu_beds=hdata["icu_beds"],
            oxygen_beds=hdata["oxygen_beds"],
            phone_number=hdata["phone_number"],
            rating=hdata["rating"],
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(hospital)

    db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=HospitalLoginResponse)
def hospital_login(login_data: HospitalLogin, db: Session = Depends(get_db)):
    """
    Hospital admin login.
    Credentials (email + password_hash) are stored directly in the
    hospitals table — completely separate from the app users table.
    """
    seed_demo_hospitals(db)

    hospital = db.query(Hospital).filter(Hospital.email == login_data.email).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid hospital email or password.",
        )

    if not hospital.password_hash or not verify_password(login_data.password, hospital.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid hospital email or password.",
        )

    access_token = create_access_token(
        data={"sub": str(hospital.hospital_id), "email": hospital.email, "role": "hospital"}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "hospital": hospital,
    }


@router.get("/", response_model=List[HospitalResponse])
def get_hospitals(db: Session = Depends(get_db)):
    seed_demo_hospitals(db)
    return HospitalRepository.get_all(db)


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital_by_id(hospital_id: int, db: Session = Depends(get_db)):
    seed_demo_hospitals(db)
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return hospital


@router.get("/{hospital_id}/resources", response_model=HospitalResourcesResponse)
def get_hospital_resources(hospital_id: int, db: Session = Depends(get_db)):
    """
    Returns all live resources for a hospital: beds, ambulances, doctors.
    Used by both the admin dashboard and user app.
    """
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return hospital


@router.post("/", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(hospital_data: HospitalCreate, db: Session = Depends(get_db)):
    """
    Register a new hospital.
    Email + password are stored directly in the hospitals table.
    The users table is NOT touched — it is exclusively for app patients.
    """
    # Check for duplicate email
    if hospital_data.email:
        existing = db.query(Hospital).filter(Hospital.email == hospital_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A hospital with this email already exists."
            )

    raw_password = hospital_data.password
    data_dict = hospital_data.model_dump(exclude={"password"})

    # Hash and store password directly in hospitals table
    if raw_password:
        data_dict["password_hash"] = hash_password(raw_password)

    new_h = Hospital(**data_dict)
    db.add(new_h)
    db.commit()
    db.refresh(new_h)
    return new_h


@router.put("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(hospital_id: int, update_data: HospitalUpdate, db: Session = Depends(get_db)):
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return HospitalRepository.update(db, hospital, update_data)


@router.patch("/{hospital_id}/beds", response_model=HospitalResponse)
def update_beds(hospital_id: int, bed_data: BedUpdate, db: Session = Depends(get_db)):
    """Update bed occupancy / capacity numbers for a hospital."""
    hospital = HospitalRepository.get_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    for field, value in bed_data.model_dump(exclude_none=True).items():
        setattr(hospital, field, value)

    db.commit()
    db.refresh(hospital)
    return hospital
