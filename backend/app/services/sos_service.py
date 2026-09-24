import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.sos import SOS
from app.models.sos_rejection import SOSRejection
from app.models.users import User
from app.models.emergency_wallet import EmergencyWallet
from app.models.medical_record import MedicalRecord
from app.repositories.sos_repository import SOSRepository
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.ambulance_repository import AmbulanceRepository
from app.repositories.doctor_repository import DoctorRepository
from app.schemas.sos import SOSCreate

logger = logging.getLogger(__name__)


class SOSService:

    @staticmethod
    def _build_patient_context(db: Session, user_id: int) -> str:
        """Create an immediately available, clinician-readable SOS context.

        The full AI pipeline may finish after the SOS is created. This snapshot
        ensures the dispatch dashboard still has the patient's wallet and
        uploaded-record context during the first seconds of a critical alert.
        """
        wallet = db.query(EmergencyWallet).filter(EmergencyWallet.user_id == user_id).first()
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.user_id == user_id)
            .order_by(MedicalRecord.created_at.desc())
            .limit(5)
            .all()
        )

        sections: list[str] = []
        if wallet:
            for label, value in (
                ("Blood group", wallet.blood_group),
                ("Known conditions", wallet.chronic_conditions),
                ("Allergies", wallet.allergies),
                ("Current medications", wallet.current_medications),
                ("Emergency profile notes", wallet.emergency_notes),
            ):
                if value and value.strip():
                    sections.append(f"{label}: {value.strip()}")

        if records:
            record_details = []
            for record in records:
                extracted = (record.ai_summary or record.ocr_text or "").strip()
                excerpt = f" — {extracted[:500]}" if extracted else ""
                record_details.append(f"{record.title} ({record.record_type}){excerpt}")
            sections.append("Uploaded medical records: " + " | ".join(record_details))

        return "\n".join(sections) or "No emergency wallet or uploaded medical-record context is available."

    @staticmethod
    def _release_resources(db: Session, sos: SOS) -> None:
        """Return every resource reserved by an SOS to its available pool."""
        if sos.assigned_ambulance_id:
            ambulance = AmbulanceRepository.get_by_id(db, sos.assigned_ambulance_id)
            if ambulance:
                ambulance.status = "AVAILABLE"

        if sos.assigned_doctor_id:
            doctor = DoctorRepository.get_by_id(db, sos.assigned_doctor_id)
            if doctor and doctor.current_cases and doctor.current_cases > 0:
                doctor.current_cases -= 1

    @staticmethod
    def create_sos(
        db: Session,
        user_id: int,
        sos_data: SOSCreate,
        commit: bool = True
    ):
        # If user already has an active SOS, resolve it so this fresh SOS triggers cleanly
        active_sos = SOSRepository.get_active_by_user(db, user_id)
        if active_sos:
            active_sos.status = "RESOLVED"
            db.commit()

        # Fetch user info for quick patient display
        user = db.query(User).filter(User.user_id == user_id).first()
        p_name = sos_data.patient_name or (user.full_name if user else f"User #{user_id}")
        p_phone = user.phone_number if user else ""
        patient_context = SOSService._build_patient_context(db, user_id)

        # Create new SOS
        new_sos = SOS(
            user_id=user_id,
            description=sos_data.description,
            latitude=sos_data.latitude,
            longitude=sos_data.longitude,
            patient_name=p_name,
            patient_phone=p_phone,
            ai_health_summary=patient_context,
            status="ACTIVE",
            dispatch_status="RECEIVED"
        )

        created_sos = SOSRepository.create(
            db,
            new_sos,
            commit=commit
        )

        logger.info(
            "SOS created | sos=%s user=%s commit=%s phone_present=%s phone_suffix=%s",
            created_sos.sos_id,
            user_id,
            commit,
            bool(p_phone),
            p_phone[-4:] if p_phone else "<none>",
        )

        if commit and p_phone:
            try:
                import threading
                from app.services.voice_service import VoiceService
                from app.database.session import SessionLocal

                logger.info("Bland call queued | sos=%s user=%s", created_sos.sos_id, user_id)

                def _call():
                    thread_db = SessionLocal()
                    try:
                        logger.info("Bland call worker started | sos=%s", created_sos.sos_id)
                        result = VoiceService.initiate_call(thread_db, created_sos.sos_id, p_phone)
                        logger.info(
                            "Bland call worker finished | sos=%s status=%s call_id_present=%s",
                            created_sos.sos_id,
                            result.get("status"),
                            bool(result.get("call_sid")),
                        )
                    except Exception as e:
                        logger.exception("Bland call worker failed | sos=%s error=%s", created_sos.sos_id, e)
                    finally:
                        thread_db.close()

                threading.Thread(target=_call, daemon=True).start()
            except Exception as exc:
                logger.exception("Bland call worker could not start | sos=%s error=%s", created_sos.sos_id, exc)
        elif not commit:
            logger.info("Bland call deferred | sos=%s reason=transaction_not_committed", created_sos.sos_id)
        else:
            logger.warning("Bland call not queued | sos=%s reason=missing_user_phone", created_sos.sos_id)

        return created_sos

    @staticmethod
    def get_all_active_sos(db: Session, hospital_id: int = None):
        return SOSRepository.get_all_active(db, hospital_id)

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
    def update_location(db: Session, user_id: int, sos_id: int, latitude: float, longitude: float):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")
        if sos.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this SOS location.")
        if sos.status not in ["ACTIVE", "ACCEPTED", "IN_PROGRESS"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS is no longer active.")

        sos.latitude = latitude
        sos.longitude = longitude
        return SOSRepository.update(db, sos)

    @staticmethod
    def accept_sos(db: Session, sos_id: int, hospital_id: int):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        hospital = HospitalRepository.get_by_id(db, hospital_id)
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")

        if sos.status in ["RESOLVED", "REJECTED"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS is no longer active.")
        if sos.accepted_hospital_id and sos.accepted_hospital_id != hospital_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS has already been accepted by another hospital.")

        sos.status = "ACCEPTED"
        sos.dispatch_status = "ACCEPTED"
        sos.accepted_hospital_id = hospital_id

        return SOSRepository.update(db, sos)

    @staticmethod
    def reject_sos(db: Session, sos_id: int, hospital_id: int, reason: str = ""):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        hospital = HospitalRepository.get_by_id(db, hospital_id)
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")
        if sos.status not in ["ACTIVE", "ACCEPTED", "IN_PROGRESS"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS is no longer active.")

        existing = db.query(SOSRejection).filter(
            SOSRejection.sos_id == sos_id,
            SOSRejection.hospital_id == hospital_id,
        ).first()
        if not existing:
            db.add(SOSRejection(sos_id=sos_id, hospital_id=hospital_id, reason=reason or None))
            db.commit()
            db.refresh(sos)

        # Keep the SOS active so another hospital can still accept it.
        return SOSRepository.update(db, sos)

    @staticmethod
    def update_dispatch_status(db: Session, sos_id: int, new_status: str):
        sos = SOSRepository.get_by_id(db, sos_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS not found.")

        normalized_status = new_status.strip().upper()
        if not normalized_status:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A dispatch status is required.")

        if sos.status in ["RESOLVED", "REJECTED"] and normalized_status != "COMPLETED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS is no longer active.")

        sos.dispatch_status = normalized_status
        if normalized_status == "COMPLETED":
            was_completed = sos.status == "RESOLVED"
            sos.status = "RESOLVED"
            sos.resolved_at = func.now()
            if not was_completed:
                SOSService._release_resources(db, sos)
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
        if sos.status not in ["ACCEPTED", "IN_PROGRESS"] or not sos.accepted_hospital_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A hospital must accept the SOS before assigning an ambulance.")
        if ambulance.hospital_id != sos.accepted_hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ambulances from the accepting hospital can be assigned.")
        if sos.assigned_ambulance_id and sos.assigned_ambulance_id != ambulance_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This SOS already has an ambulance assigned.")
        if ambulance.status.upper() != "AVAILABLE" and sos.assigned_ambulance_id != ambulance_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This ambulance is currently engaged.")

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

        SOSService._release_resources(db, sos)
        db.commit()

        return SOSRepository.update(db, sos)
