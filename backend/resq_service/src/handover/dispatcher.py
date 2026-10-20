from src.core.config import settings
from src.handover.models import HandoverPayload
from src.handover.transport import MockHandoverTransport, HTTPHandoverTransport
from src.session.manager import EmergencySession

class HandoverDispatcher:
    def __init__(self):
        if settings.USE_MOCK_HANDOVER:
            self.transport = MockHandoverTransport()
        else:
            self.transport = HTTPHandoverTransport()

    async def dispatch(self, session: EmergencySession, escalation_reason: str) -> bool:
        recent_chats = [f"{m.sender.upper()}: {m.text}" for m in session.conversation_history[-4:]]
        summary = " | ".join(recent_chats) if recent_chats else "Voice emergency call initiated."
        
        patient = session.patient_context
        payload = HandoverPayload(
            session_id=session.session_id,
            patient_id=patient.patient_id if patient else "UNKNOWN",
            patient_name=patient.name if patient else "Unknown / Anonymous",
            patient_age=patient.age if patient else None,
            blood_group=patient.blood_group if patient else None,
            allergies=patient.allergies if patient else [],
            existing_conditions=patient.existing_conditions if patient else [],
            emergency_type=session.emergency_type,
            severity=session.severity,
            transcript_summary=summary,
            actions_already_given=session.actions_given,
            emergency_contacts=patient.emergency_contacts if patient else [],
            escalation_reason=escalation_reason
        )

        success = await self.transport.send_handover(payload)
        if success:
            session.handover_dispatched = True
        return success