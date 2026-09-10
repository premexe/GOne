from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.sos import SOS
from app.models.users import User
from app.repositories.sos_repository import SOSRepository
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.ambulance_repository import AmbulanceRepository
from app.repositories.doctor_repository import DoctorRepository
from app.schemas.sos import SOSCreate


class SOSService:

    @staticmethod
    def create_sos(
        db: Session,
        user_id: int,
        sos_data: SOSCreate,
        commit: bool = True
    ):
        # Check if user already has an active SOS
        active_sos = SOSRepository.get_active_by_user(db, user_id)
        if active_sos:
            return active_sos

        # Fetch user info for quick patient display
        user = db.query(User).filter(User.user_id == user_id).first()
        p_name = sos_data.patient_name or (user.full_name if user else f"User #{user_id}")
        p_phone = sos_data.patient_phone or (user.phone_number if user else "")

        # Create new SOS
        new_sos = SOS(
            user_id=user_id,
            description=sos_data.description,
            latitude=sos_data.latitude,
            longitude=sos_data.longitude,
            patient_name=p_name,
            patient_phone=p_phone,
            status="ACTIVE",
            dispatch_status="RECEIVED"
        )

        return SOSRepository.create(
            db,
            new_sos,
            commit=commit
        )

    @staticmethod
    def get_all_active_sos(db: Session):
        return SOSRepository.get_all_active(db)

    @staticmethod
    def get_completed_sos(db: Session, hospital_id: int = None):
        return SOSRepository.get_completed(db, hospital_id)

    @staticmethod
    def get_by_id(db: Session, sos_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")
        return sos

    @staticmethod
    def get_active_sos(db: Session, user_id: int):
        return SOSRepository.get_active_by_user(db, user_id)

    @staticmethod
    def accept_sos(db: Session, sos_id: int, hospital_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        hospital = HospitalRepository.get_by_id(db, hospital_id)
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")

        sos.status = "ACCEPTED"
        sos.dispatch_status = "ACCEPTED"
        sos.accepted_hospital_id = hospital_id

        return SOSRepository.update(db, sos)

    @staticmethod
    def reject_sos(db: Session, sos_id: int, hospital_id: int, reason: str = ""):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        # Mark as fully rejected so it stops appearing in new emergency queues
        sos.dispatch_status = "REJECTED"
        sos.status = "REJECTED"
        return SOSRepository.update(db, sos)

    @staticmethod
    def update_dispatch_status(db: Session, sos_id: int, new_status: str):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        sos.dispatch_status = new_status
        if new_status in ["COMPLETED", "completed"]:
            sos.status = "RESOLVED"
            sos.resolved_at = func.now()
            # Free up assigned ambulance
            if sos.assigned_ambulance_id:
                amb = AmbulanceRepository.get_by_id(db, sos.assigned_ambulance_id)
                if amb:
                    amb.status = "AVAILABLE"
            # Free up assigned doctor
            if sos.assigned_doctor_id:
                doc = DoctorRepository.get_by_id(db, sos.assigned_doctor_id)
                if doc and doc.current_cases and doc.current_cases > 0:
                    doc.current_cases -= 1
            db.commit()
        else:
            sos.status = "IN_PROGRESS"

        return SOSRepository.update(db, sos)

    @staticmethod
    def assign_ambulance(db: Session, sos_id: int, ambulance_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        ambulance = AmbulanceRepository.get_by_id(db, ambulance_id)
        if not ambulance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance not found.")

        sos.assigned_ambulance_id = ambulance_id
        sos.dispatch_status = "AMBULANCE_ASSIGNED"
        sos.status = "IN_PROGRESS"

        # Update ambulance status to EN_ROUTE
        ambulance.status = "EN_ROUTE"
        db.commit()

        return SOSRepository.update(db, sos)

    @staticmethod
    def assign_doctor(db: Session, sos_id: int, doctor_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        doctor = DoctorRepository.get_by_id(db, doctor_id)
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

        sos.assigned_doctor_id = doctor_id
        doctor.current_cases = (doctor.current_cases or 0) + 1
        db.commit()

        return SOSRepository.update(db, sos)

    @staticmethod
    def resolve_sos(db: Session, user_id: int, sos_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        if sos.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to resolve this SOS.")

        if sos.status == "RESOLVED":
            return sos

        sos.status = "RESOLVED"
        sos.dispatch_status = "COMPLETED"
        sos.resolved_at = func.now()

        # Free up assigned ambulance
        if sos.assigned_ambulance_id:
            amb = AmbulanceRepository.get_by_id(db, sos.assigned_ambulance_id)
            if amb:
                amb.status = "AVAILABLE"

        # Free up assigned doctor
        if sos.assigned_doctor_id:
            doc = DoctorRepository.get_by_id(db, sos.assigned_doctor_id)
            if doc and doc.current_cases and doc.current_cases > 0:
                doc.current_cases -= 1
        db.commit()

        return SOSRepository.update(db, sos)