from sqlalchemy.orm import Session

from app.schemas.sos import SOSCreate
from app.schemas.emergency_response import EmergencyResponseCreate
from app.schemas.notification import NotificationCreate

from app.services.sos_service import SOSService
from app.services.emergency_response_service import (
    EmergencyResponseService
)
from app.services.emergency_contact_service import (
    EmergencyContactService
)
from app.services.notification_service import (
    NotificationService
)


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

            # Step 2: Create Emergency Response
            response_data = EmergencyResponseCreate(
                sos_id=sos.sos_id
            )

            response = EmergencyResponseService.create_response(
                db,
                user_id,
                response_data,
                commit=False
            )

            # Step 3: Get Emergency Contacts
            contacts = EmergencyContactService.get_contacts(
                db,
                user_id
            )

            # Step 4: Create notifications
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

            # Step 5: Commit everything together
            db.commit()

            return {
                "sos": sos,
                "emergency_response": response,
                "emergency_contacts": contacts,
                "notifications": notifications
            }

        except Exception:
            db.rollback()
            raise