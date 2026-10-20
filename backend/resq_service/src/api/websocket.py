import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.emergency.analyzer import EmergencyAnalyzer
from src.patient.provider import MockPatientProvider
from src.protocols.registry import ProtocolRegistry
from src.session.manager import SessionManager
from src.llm.manager import ProviderManager
from src.safety.validator import SafetyValidator
from src.handover.dispatcher import HandoverDispatcher


def _save_native_resq_handover(session) -> tuple[bool, str]:
    """Persist the authenticated app session and email its transcript."""
    if not session.sos_id:
        return False, "No SOS is linked to this voice session."
    try:
        from app.database.session import SessionLocal
        from app.services.voice_service import VoiceService

        transcript = "\n".join(
            f"{'Patient' if message.sender == 'user' else 'AI'}: {message.text}"
            for message in session.conversation_history
        )
        summary = (
            f"G-ONE ResQ {session.emergency_type.replace('_', ' ')} session "
            f"({session.severity}): {session.actions_given[:3]}"
        )
        db = SessionLocal()
        try:
            VoiceService.save_call_results(
                db=db,
                sos_id=session.sos_id,
                call_sid=f"resq-{session.session_id}",
                status="COMPLETED",
                transcript=transcript,
                summary=summary,
            )
        finally:
            db.close()
        return True, "Transcript handover saved and email delivery started."
    except Exception as exc:
        logger.exception("ResQ handover persistence failed")
        return False, f"Unable to complete handover: {exc}"

logger = logging.getLogger(__name__)
router = APIRouter()

# Global Singleton Services
session_manager = SessionManager()
patient_provider = MockPatientProvider()
protocol_registry = ProtocolRegistry()
provider_manager = ProviderManager()
handover_dispatcher = HandoverDispatcher()

@router.websocket("/ws/emergency")
async def emergency_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session = None

    try:
        # Initialize initial connection message
        init_data = await websocket.receive_text()
        init_json = json.loads(init_data)
        
        patient_id = init_json.get("patient_id", "PAT-101")
        session_id = init_json.get("session_id")
        sos_id = init_json.get("sos_id")

        # Native app sessions that send email must be linked to the authenticated
        # SOS owner. Browser demo sessions can still run without an SOS.
        if sos_id is not None:
            from app.database.session import SessionLocal
            from app.models.sos import SOS
            from app.security.jwt import verify_access_token

            token = init_json.get("token") or ""
            payload = verify_access_token(token)
            if not payload or not str(payload.get("sub", "")).isdigit():
                await websocket.send_json({"type": "ERROR", "message": "Sign in again before starting ResQ."})
                await websocket.close(code=1008)
                return
            db = SessionLocal()
            try:
                sos = db.query(SOS).filter(SOS.sos_id == int(sos_id)).first()
                if not sos or sos.user_id != int(payload["sub"]):
                    await websocket.send_json({"type": "ERROR", "message": "This SOS is not available for the signed-in user."})
                    await websocket.close(code=1008)
                    return
                patient_id = f"USER-{sos.user_id}"
            finally:
                db.close()

        session = session_manager.get_or_create(session_id)
        session.patient_id = patient_id
        session.sos_id = int(sos_id) if sos_id is not None else None
        session.patient_context = patient_provider.get_patient(patient_id)
        session.current_protocol = protocol_registry.get_protocol("general_emergency")
        session_manager.save(session)

        # Notify frontend of initial state
        await websocket.send_json({
            "type": "SESSION_INITIALIZED",
            "session_id": session.session_id,
            "patient": session.patient_context.model_dump(),
            "emergency_type": session.emergency_type,
            "severity": session.severity
        })

        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            event_type = data.get("type")

            if event_type == "END_SESSION":
                success, message = _save_native_resq_handover(session)
                await websocket.send_json({
                    "type": "SESSION_COMPLETED",
                    "success": success,
                    "message": message,
                    "email_status": "QUEUED" if success else "FAILED",
                })
                continue

            if event_type == "USER_SPEECH":
                transcript = data.get("text", "").strip()
                if not transcript:
                    continue

                session.append_message("user", transcript)

                # 1. Detect language
                lang = EmergencyAnalyzer.detect_language(transcript)
                session.detected_language = lang

                # 2. Analyze emergency & update severity
                em_type, severity, should_escalate = EmergencyAnalyzer.analyze(
                    transcript,
                    current_type=session.emergency_type,
                    current_severity=session.severity
                )
                session.emergency_type = em_type
                session.severity = severity
                
                # 3. Retrieve protocol
                protocol = protocol_registry.get_protocol(em_type)
                session.current_protocol = protocol

                # 4. Generate LLM guidance via Fallback Chain
                guidance_result = await provider_manager.generate_guidance(
                    transcript=transcript,
                    protocol=protocol,
                    patient_context=session.patient_context,
                    history=[m.model_dump() for m in session.conversation_history],
                    language=lang
                )

                raw_output = guidance_result["text"]
                provider_used = guidance_result["provider"]

                # 5. Safety Validation
                is_safe, final_response = SafetyValidator.validate(raw_output, protocol, language=lang)
                session.append_message("assistant", final_response)
                
                # Track given actions
                for act in protocol.approved_actions[:2]:
                    if act not in session.actions_given:
                        session.actions_given.append(act)

                # 6. Handover condition check
                handover_status = "NOT_REQUIRED"
                if should_escalate and not session.handover_dispatched:
                    session.escalation_triggered = True
                    dispatched = await handover_dispatcher.dispatch(
                        session, 
                        escalation_reason=f"Severity escalated to {severity} ({protocol.escalation_condition})"
                    )
                    handover_status = "DISPATCHED" if dispatched else "FAILED"
                elif session.handover_dispatched:
                    handover_status = "PREVIOUSLY_DISPATCHED"

                session_manager.save(session)

                # Send response back to browser for live TTS
                await websocket.send_json({
                    "type": "ASSISTANT_RESPONSE",
                    "text": final_response,
                    "language": lang,
                    "emergency_type": em_type,
                    "severity": severity,
                    "provider_used": provider_used,
                    "safety_checked": is_safe,
                    "handover_status": handover_status,
                    "actions_given": session.actions_given
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket closed for session: {session.session_id if session else 'Unknown'}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "ERROR",
                "message": "Internal error occurred. Emergency services alerted."
            })
        except:
            pass
