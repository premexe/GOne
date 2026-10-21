import logging
from sqlalchemy.orm import Session
from app.models.hospital import Hospital

logger = logging.getLogger(__name__)


def seed_default_data(db: Session):
    """
    Auto-seeds only non-sensitive reference data required by a fresh instance.
    User accounts are deliberately created through the registration flow, never
    from hard-coded emails or predictable passwords.
    """
    try:
        # Seed default hospitals if empty. User data is never auto-seeded.
        if db.query(Hospital).count() == 0:
            logger.info("Seeding default hospital network")
            hospitals = [
                Hospital(
                    name="City Care Hospital & Trauma Center",
                    address="124 Medical Enclave, Central District",
                    phone_number="+91 98200 12345",
                    latitude=19.702,
                    longitude=72.772,
                    total_beds=150,
                    general_occupied=80,
                    icu_beds=30,
                    icu_occupied=10,
                    oxygen_beds=25,
                    emergency_occupied=5,
                ),
                Hospital(
                    name="Apex Super Specialty Hospital",
                    address="45 Healthcare Blvd, North Zone",
                    phone_number="+91 98200 67890",
                    latitude=19.715,
                    longitude=72.780,
                    total_beds=200,
                    general_occupied=120,
                    icu_beds=40,
                    icu_occupied=15,
                    oxygen_beds=35,
                    emergency_occupied=8,
                ),
                Hospital(
                    name="Metro Emergency & Heart Institute",
                    address="88 LifeLine Avenue, South Hub",
                    phone_number="+91 98200 54321",
                    latitude=19.690,
                    longitude=72.760,
                    total_beds=100,
                    general_occupied=50,
                    icu_beds=20,
                    icu_occupied=4,
                    oxygen_beds=15,
                    emergency_occupied=3,
                ),
            ]
            db.add_all(hospitals)
            db.commit()

    except Exception as e:
        logger.warning(f"Error during auto-seed: {e}")
        db.rollback()
