import logging
from sqlalchemy.orm import Session

from app.schemas.sos import SOSCreate
from app.schemas.notification import NotificationCreate

from app.services.sos_service import SOSService
from app.services.emergency_contact_service import EmergencyContactService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class EmergencyOrchestrationService:

    @staticmethod
    def trigger_emergency(
        db: Session,
        user_id: int,
        sos_data: SOSCreate
    ):

        try:

            # Step 1: Create SOS without committing
            sos = SOSService.create_sos(
                db,
                user_id,
                sos_data,
                commit=False
            )

            # Step 2: Get or create Emergency Response
            from app.repositories.emergency_response_repository import EmergencyResponseRepository
            from app.models.emergency_response import EmergencyResponse

            existing_response = EmergencyResponseRepository.get_by_sos(db, sos.sos_id)
            if existing_response:
                response = existing_response
            else:
                response = EmergencyResponse(
                    sos_id=sos.sos_id,
                    user_id=user_id,
                    status="INITIATED"
                )
                EmergencyResponseRepository.create(db, response, commit=False)

            # Step 3: Get Emergency Contacts
            contacts = EmergencyContactService.get_contacts(db, user_id)

            # Step 4: Create notifications for each emergency contact
            notifications = []
            for contact in contacts:
                notification_data = NotificationCreate(
                    recipient_type="EMERGENCY_CONTACT",
                    recipient_id=contact.contact_id,
                    channel="SMS",
                    message=(
                        "Emergency alert from LifeLink. "
                        "The user has triggered a Master SOS."
                    )
                )
                notification = NotificationService.create_notification(
                    db,
                    user_id,
                    response.response_id,
                    notification_data,
                    commit=False
                )
                notifications.append(notification)

            # Step 5: Commit core emergency records to DB
            db.commit()
            db.refresh(sos)

            # ── Step 5.5: Initiate AI Real-Time Voice Call ────────────────────
            # Non-fatal — SOS is always dispatched regardless of call result.
            try:
                from app.services.voice_service import VoiceService
                from app.models.users import User as UserModel
                _user_obj = db.query(UserModel).filter(UserModel.user_id == user_id).first()
                patient_phone = _user_obj.phone_number if _user_obj else ""
                if patient_phone:
                    import threading
                    def _call():
                        # Refresh db connection inside the thread — SQLAlchemy sessions are
                        # not thread-safe, so we get a new session here.
                        from app.database.session import SessionLocal
                        thread_db = SessionLocal()
                        try:
                            logger.info("Orchestration Bland worker started | sos=%s", sos.sos_id)
                            result = VoiceService.initiate_call(thread_db, sos.sos_id, patient_phone)
                            logger.info(
                                "Orchestration Bland worker finished | sos=%s status=%s call_id_present=%s",
                                sos.sos_id,
                                result.get("status"),
                                bool(result.get("call_sid")),
                            )
                        except Exception as e:
                            logger.exception("Orchestration Bland worker failed | sos=%s error=%s", sos.sos_id, e)
                        finally:
                            thread_db.close()
                    t = threading.Thread(target=_call, daemon=True)
                    t.start()
                    logger.info("AI voice call thread started | sos=%s phone=%s", sos.sos_id, patient_phone)
                else:
                    logger.warning("No patient phone available for voice call | sos=%s", sos.sos_id)
            except Exception as call_exc:
                logger.warning(
                    "AI voice call initiation failed (non-fatal) | sos=%s error=%s",
                    sos.sos_id,
                    call_exc,
                )
            # ─────────────────────────────────────────────────────────────────

            # ── Step 6: G-ONE AI Triage Pipeline ─────────────────────────────
            # Run after commit so the SOS ID is stable.
            # Failure is fully isolated — the emergency is always dispatched.
            ai_result: dict = {}
            try:
                from app.services.ai_pipeline_service import AIPipelineService

                ai_result = AIPipelineService.run_triage(
                    db=db,
                    user_id=user_id,
                    emergency_description=sos_data.description or "",
                    sos_id=sos.sos_id,
                    latitude=sos_data.latitude,
                    longitude=sos_data.longitude,
                )

                # Persist AI triage results onto the SOS record
                sos.ai_emergency_understanding = ai_result.get("emergency_understanding")
                sos.ai_severity = ai_result.get("severity")
                sos.ai_required_capabilities = ai_result.get("required_medical_capability")
                sos.ai_health_summary = ai_result.get("ai_health_summary")
                sos.ai_emergency_report = ai_result.get("emergency_report")
                db.commit()
                db.refresh(sos)

                logger.info(
                    "G-ONE AI triage persisted | sos=%s severity=%s",
                    sos.sos_id,
                    sos.ai_severity,
                )

            except Exception as ai_exc:
                # AI failure is non-fatal — log and continue dispatch
                logger.warning(
                    "G-ONE AI triage failed (non-fatal) | sos=%s error=%s",
                    sos.sos_id,
                    ai_exc,
                )
            # ─────────────────────────────────────────────────────────────────

            return {
                "sos": sos,
                "emergency_response": response,
                "emergency_contacts": contacts,
                "notifications": notifications,
                "ai_triage": ai_result,
            }

        except Exception:
            db.rollback()
            raise