import logging
from sqlalchemy.orm import Session
from app.models.users import User
from app.models.emergency_wallet import EmergencyWallet
from app.models.hospital import Hospital
from app.security.password import hash_password

logger = logging.getLogger(__name__)


def seed_default_data(db: Session):
    """
    Auto-seeds essential users, wallets, and hospitals if they do not exist.
    Guarantees that deployment restarts / ephemeral containers always have
    verified working accounts and hospital discovery records.
    """
    try:
        # 1. Seed Primary User: premkakade2005@gmail.com
        user = db.query(User).filter(User.email == "premkakade2005@gmail.com").first()
        if not user:
            logger.info("Seeding default user: premkakade2005@gmail.com")
            user = User(
                full_name="Prem Kakade",
                email="premkakade2005@gmail.com",
                phone_number="9876543210",
                password_hash=hash_password("Password123!"),
                plain_password=None,
                blood_group="O+",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            wallet = EmergencyWallet(
                user_id=user.user_id,
                blood_group="O+",
                allergies="None reported",
                current_medications="None recorded",
                chronic_conditions="None recorded",
                emergency_notes="Primary emergency wallet",
            )
            db.add(wallet)
            db.commit()

        # 2. Seed Demo User: demo@lifelink.ai
        demo_user = db.query(User).filter(User.email == "demo@lifelink.ai").first()
        if not demo_user:
            logger.info("Seeding demo user: demo@lifelink.ai")
            demo_user = User(
                full_name="LifeLink Demo User",
                email="demo@lifelink.ai",
                phone_number="9998887770",
                password_hash=hash_password("Password123!"),
                plain_password=None,
                blood_group="A+",
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            demo_wallet = EmergencyWallet(
                user_id=demo_user.user_id,
                blood_group="A+",
                allergies="Penicillin",
                current_medications="None",
                chronic_conditions="Asthma",
                emergency_notes="Carry rescue inhaler",
            )
            db.add(demo_wallet)
            db.commit()

        # 3. Seed Default Hospitals if empty
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
