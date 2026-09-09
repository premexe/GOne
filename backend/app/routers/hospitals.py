from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.hospital import Hospital
from app.models.users import User
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
    Ensure the 4 demo hospitals exist with linked user accounts.
    Safe to call on every startup — skips hospitals that already exist.
    """
    for hdata in DEMO_HOSPITALS:
        email = hdata["email"]

        # Check if this hospital already exists (by email)
        existing = db.query(Hospital).filter(Hospital.email == email).first()
        if existing:
            continue

        # Create or find the linked user account
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Generate a unique dummy phone number
            phone_suffix = email.split("@")[0].replace(".", "")[:10]
            dummy_phone = f"99{phone_suffix[:8].ljust(8, '0')}"
            user = User(
                full_name=hdata["name"],
                email=email,
                phone_number=dummy_phone,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()  # Get user_id without full commit

        # Create the hospital record
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
            hospital_user_id=user.user_id,
        )
        db.add(hospital)

    db.commit()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=HospitalLoginResponse)
def hospital_login(login_data: HospitalLogin, db: Session = Depends(get_db)):
    """
    Hospital admin login.  Accepts the hospital email + password,
    returns a JWT token and the matched hospital record.
    """
    # Ensure demo hospitals exist
    seed_demo_hospitals(db)

    # Find the hospital by email
    hospital = db.query(Hospital).filter(Hospital.email == login_data.email).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid hospital email or password.",
        )

    # Find the linked user account
    user = db.query(User).filter(User.user_id == hospital.hospital_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hospital account is not properly configured.",
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid hospital email or password.",
        )

    # Create JWT
    access_token = create_access_token(
        data={"sub": str(user.user_id), "email": user.email}
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
    Single endpoint that returns all live resources for a hospital:
    beds, ambulances, doctors.  Used by both the admin dashboard and user app.
    """
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
