"""
Voice Service — Real-Time AI Phone Call via Bland AI Agent.

Flow:
  1. SOS is triggered -> initiate_call() dispatches an autonomous Bland AI voice call.
  2. Bland AI contacts the patient's phone and holds a real-time voice conversation.
     (No incoming webhook or ngrok is required during the live conversation!)
  3. When the call completes, Bland provides:
     - Full conversation transcript (concatenated_transcript)
     - AI clinical summary of patient condition
     - Call recording
  4. The background monitor (or optional post-call webhook) persists the transcript
     and triggers EmailService to alert emergency contacts.

Environment Variables:
  BLAND_API_KEY (or Bland_api) : Bland AI organization API key
  BLAND_VOICE                  : AI voice name or ID (default: "maya")
  ENABLE_SOS_VOICE_CALLS       : Set to "true" to place real calls (default: "true")
  PUBLIC_BACKEND_URL           : Optional public URL for post-call webhooks
"""

import json
import logging
import os
import re
import threading
import time
from typing import Optional, Dict, Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.sos import SOS
from app.models.emergency_wallet import EmergencyWallet
from app.models.users import User
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)

load_dotenv()

BLAND_API_KEY = (os.getenv("BLAND_API_KEY") or os.getenv("Bland_api") or "").strip()
BLAND_VOICE = (os.getenv("BLAND_VOICE") or "maya").strip()
ENABLE_SOS_VOICE_CALLS = (os.getenv("ENABLE_SOS_VOICE_CALLS", "true").strip().lower() in {"1", "true", "yes", "on"})
PUBLIC_BACKEND_URL = os.getenv("PUBLIC_BACKEND_URL", "").strip().rstrip("/")
BLAND_API_BASE = "https://api.bland.ai/v1"


def _normalise_phone(phone: str, default_country: str = "+91") -> Optional[str]:
    """Ensure phone number is in E.164 format (+91XXXXXXXXXX)."""
    if not phone:
        return None
    digits = re.sub(r"[^\d+]", "", phone.strip())
    if digits.startswith("+"):
        return digits if len(digits) >= 8 else None
    if len(digits) == 10:
        return f"{default_country}{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if len(digits) >= 8:
        return f"+{digits}"
    return None


def _mask_phone(phone: Optional[str]) -> str:
    """Keep logs useful without exposing the patient's full phone number."""
    if not phone:
        return "<missing>"
    return f"***{phone[-4:]}"


def _build_wallet_summary(db: Session, user_id: int) -> str:
    """Return a compact text summary of the patient's emergency medical wallet."""
    try:
        wallet: Optional[EmergencyWallet] = (
            db.query(EmergencyWallet).filter(EmergencyWallet.user_id == user_id).first()
        )
        if not wallet:
            return "No medical wallet on file."
        parts = []
        if wallet.blood_group:
            parts.append(f"Blood Group: {wallet.blood_group}")
        if wallet.allergies:
            parts.append(f"Allergies: {wallet.allergies}")
        if wallet.chronic_conditions:
            parts.append(f"Chronic Conditions: {wallet.chronic_conditions}")
        if wallet.current_medications:
            parts.append(f"Current Medications: {wallet.current_medications}")
        if wallet.emergency_notes:
            parts.append(f"Emergency Notes: {wallet.emergency_notes}")
        return " | ".join(parts) if parts else "No medical conditions noted."
    except Exception as e:
        logger.warning("Could not read medical wallet: %s", e)
        return "Not available."


def _summarize_transcript(transcript: str, default_prefix: str = "Emergency call summary") -> str:
    """Build a compact summary from the transcript when the voice session has no explicit summary."""
    cleaned = (transcript or "").strip()
    if not cleaned:
        return f"{default_prefix}: transcript unavailable."

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    if not lines:
        return f"{default_prefix}: transcript unavailable."

    patient_lines = [l for l in lines if l.lower().startswith("patient:")]
    ai_lines = [l for l in lines if l.lower().startswith("ai:")]
    patient_text = " ".join(l.split(":", 1)[1].strip() for l in patient_lines if ":" in l)
    ai_text = " ".join(l.split(":", 1)[1].strip() for l in ai_lines if ":" in l)

    if patient_text:
        return f"{default_prefix}: {patient_text[:500]}"
    if ai_text:
        return f"{default_prefix}: {ai_text[:500]}"
    return f"{default_prefix}: {cleaned[:500]}"


def _get_bland_headers() -> Dict[str, str]:
    api_key = (os.getenv("BLAND_API_KEY") or os.getenv("Bland_api") or "").strip()
    return {
        "authorization": api_key,
        "Content-Type": "application/json",
    }


def _monitor_bland_call(sos_id: int, call_id: str, max_wait_seconds: int = 300):
    """
    Background worker that monitors Bland AI call completion.
    Retrieves full transcript and summary, persists them to the SOS record,
    and dispatches notification emails to emergency contacts.
    """
    logger.info("Started Bland AI call monitor for SOS %s (call_id=%s)", sos_id, call_id)
    time.sleep(12)  # Wait for call to connect

    start_time = time.time()
    while time.time() - start_time < max_wait_seconds:
        time.sleep(8)
        try:
            url = f"{BLAND_API_BASE}/calls/{call_id}"
            resp = requests.get(url, headers=_get_bland_headers(), timeout=15)
            if resp.status_code != 200:
                logger.warning("Bland call status query returned %s for %s", resp.status_code, call_id)
                continue

            data = resp.json()
            # Bland returns call data at top-level or under 'call'
            call_obj = data.get("call") or data
            call_status = str(call_obj.get("status", "")).lower()

            logger.info("Bland call %s status: %s", call_id, call_status)

            if call_status in {"completed", "ended", "complete"}:
                transcript = call_obj.get("concatenated_transcript") or ""
                summary = call_obj.get("summary") or ""

                db = SessionLocal()
                try:
                    VoiceService.save_call_results(
                        db,
                        sos_id=sos_id,
                        call_sid=call_id,
                        status="COMPLETED",
                        transcript=transcript,
                        summary=summary,
                    )
                finally:
                    db.close()
                return

            if call_status in {"failed", "no-answer", "busy", "canceled", "error"}:
                db = SessionLocal()
                try:
                    VoiceService.save_call_results(
                        db,
                        sos_id=sos_id,
                        call_sid=call_id,
                        status=call_status.upper(),
                        transcript="",
                        summary=f"Call ended with status: {call_status}",
                    )
                finally:
                    db.close()
                return

        except Exception as err:
            logger.warning("Error monitoring Bland AI call %s: %s", call_id, err)

    logger.info("Bland call monitor timed out for SOS %s", sos_id)


class VoiceService:

    @staticmethod
    def build_agent_questions(patient_name: str = "Patient", emergency_description: str = "") -> list[str]:
        """Return a short emergency-checklist Q&A sequence for the in-app AI agent."""
        desc = (emergency_description or "").strip()
        if desc:
            prefix = f"I can see you reported: {desc}. "
        else:
            prefix = ""

        return [
            f"{prefix}Can you tell me exactly what happened and how you are feeling right now?",
            "Are you conscious and breathing normally right now?",
            "Do you have any chest pain, severe bleeding, or trouble speaking or moving?",
            "Please stay in a safe position and tell me if anyone is with you or if you need immediate help.",
        ]

    @staticmethod
    def normalize_transcript(transcript: str) -> str:
        """Clean transcript text from the app and the structured AI flow."""
        if not transcript:
            return ""
        cleaned = transcript.strip()
        if not cleaned:
            return ""
        lines = []
        for line in cleaned.splitlines():
            text = line.strip()
            if text:
                lines.append(text)
        return "\n".join(lines)

    @staticmethod
    def is_calling_enabled() -> bool:
        api_key = (os.getenv("BLAND_API_KEY") or os.getenv("Bland_api") or "").strip()
        enabled = os.getenv("ENABLE_SOS_VOICE_CALLS", "true").strip().lower() in {"1", "true", "yes", "on"}
        return bool(api_key) and enabled

    @staticmethod
    def initiate_call(db: Session, sos_id: int, patient_phone: str) -> dict:
        """
        Place an outbound AI phone call to the patient via Bland AI agent.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        user = db.query(User).filter(User.user_id == sos.user_id).first() if sos else None
        patient_phone = user.phone_number if user else patient_phone
        phone_e164 = _normalise_phone(patient_phone)
        logger.info(
            "Bland dispatch started | sos=%s user=%s phone=%s normalized=%s",
            sos_id,
            sos.user_id if sos else "<missing>",
            _mask_phone(patient_phone),
            _mask_phone(phone_e164),
        )
        if not phone_e164:
            logger.warning("Bland dispatch stopped | sos=%s reason=INVALID_PHONE", sos_id)
            return {"call_sid": None, "status": "INVALID_PHONE", "simulated": True}

        # Prevent duplicate calls for the same SOS
        if sos and sos.call_sid:
            logger.info("Call already placed for SOS %s (call_sid=%s), skipping duplicate.", sos_id, sos.call_sid)
            return {"call_sid": sos.call_sid, "status": sos.call_status or "IN_PROGRESS", "simulated": False}

        api_key = (os.getenv("BLAND_API_KEY") or os.getenv("Bland_api") or "").strip()
        enabled = os.getenv("ENABLE_SOS_VOICE_CALLS", "true").strip().lower() in {"1", "true", "yes", "on"}
        logger.info(
            "Bland configuration | sos=%s api_key_present=%s calls_enabled=%s voice=%s webhook=%s",
            sos_id,
            bool(api_key),
            enabled,
            os.getenv("BLAND_VOICE", "maya").strip() or "maya",
            bool(os.getenv("PUBLIC_BACKEND_URL", "").strip()),
        )

        if not enabled:
            logger.info("Voice calls are disabled (ENABLE_SOS_VOICE_CALLS=false) for SOS %s.", sos_id)
            if sos:
                sos.call_status = "DISABLED"
                db.commit()
            return {"call_sid": None, "status": "DISABLED", "simulated": False}

        if not api_key:
            err_msg = "BLAND_API_KEY is missing in backend/.env"
            logger.warning("Voice call not placed for SOS %s: %s", sos_id, err_msg)
            if sos:
                sos.call_status = "CONFIGURATION_ERROR"
                db.commit()
            return {"call_sid": None, "status": "CONFIGURATION_ERROR", "error": err_msg, "simulated": False}

        # Build patient profile context
        patient_name = sos.patient_name if sos and sos.patient_name else "there"
        first_name = patient_name.split()[0] if patient_name != "there" else "there"
        user_id = sos.user_id if sos else 0
        wallet_summary = _build_wallet_summary(db, user_id)
        description = sos.description if sos and sos.description else "Emergency SOS alert triggered."

        task_prompt = f"""You are LifeLink's Emergency Medical AI Voice Responder.
You are calling a patient who just triggered an urgent emergency SOS signal on their LifeLink app.

PATIENT INFORMATION:
- Name: {patient_name}
- Emergency Description / Symptoms: {description}
- Medical Profile & Allergies: {wallet_summary}

YOUR CRITICAL RESPONSIBILITIES:
1. Reassure the patient immediately that their emergency SOS has been received and local emergency response teams are being notified.
2. Ask clear, empathetic, direct questions to triage their condition:
   - Are you conscious and breathing normally?
   - Is there any bleeding, chest pain, difficulty breathing, or severe injury?
   - Are you alone or is someone with you?
3. Provide vital safety instructions:
   - Tell them to sit or lie down in a safe position.
   - Instruct them not to move if there is severe pain, neck/spinal injury, or fracture.
   - Keep them calm and breathing slowly.
4. Conversation Guidelines:
   - Keep each spoken response short (1 to 2 sentences max).
   - Be calm, warm, authoritative, and empathetic.
   - Do NOT use markdown, bullet points, or complex jargon.
   - Conclude the call by reassuring them that help is en route and to stay safe.
"""

        first_sentence = (
            f"Hello {first_name}, this is LifeLink Emergency AI. "
            "We received your emergency S O S alert and responders are being notified. "
            "Can you tell me what happened and how you are feeling right now?"
        )

        voice_name = os.getenv("BLAND_VOICE", "maya").strip()
        public_url = os.getenv("PUBLIC_BACKEND_URL", "").strip().rstrip("/")

        payload: Dict[str, Any] = {
            "phone_number": phone_e164,
            "task": task_prompt,
            "first_sentence": first_sentence,
            "voice": voice_name,
            "language": "en",
            "record": True,
            "wait_for_greeting": False,
            "max_duration": 5,
            "summary_prompt": (
                "Summarize this emergency voice call in 2-3 concise sentences for medical dispatchers. "
                "Specify what happened, patient condition, pain level, symptoms, and urgency."
            ),
            "request_data": {
                "sos_id": sos_id,
                "patient_name": patient_name,
                "patient_phone": phone_e164,
            },
        }

        # If a public webhook URL is configured, attach it as post-call webhook
        if public_url and public_url.startswith("https://"):
            payload["webhook"] = f"{public_url}/voice/bland-webhook/{sos_id}"

        try:
            logger.info("Dispatching Bland AI call for SOS %s to %s (voice=%s)", sos_id, phone_e164, voice_name)
            response = requests.post(
                f"{BLAND_API_BASE}/calls",
                headers=_get_bland_headers(),
                json=payload,
                timeout=20,
            )

            res_data = response.json()
            logger.info(
                "Bland response | sos=%s http_status=%s call_id_present=%s response_status=%s request_id=%s",
                sos_id,
                response.status_code,
                bool(res_data.get("call_id")),
                res_data.get("status"),
                response.headers.get("x-request-id") or response.headers.get("request-id") or "<none>",
            )

            if response.status_code not in {200, 201} or res_data.get("status") == "error":
                err = res_data.get("message") or res_data.get("errors") or str(res_data)
                logger.error(
                    "Bland dispatch failed | sos=%s http_status=%s error=%s",
                    sos_id,
                    response.status_code,
                    err,
                )
                if sos:
                    sos.call_status = "FAILED"
                    db.commit()
                return {"call_sid": None, "status": "FAILED", "error": str(err), "simulated": False}

            call_id = res_data.get("call_id")
            if sos:
                sos.call_sid = call_id
                sos.call_status = "IN_PROGRESS"
                db.commit()
            logger.info("Bland dispatch accepted | sos=%s call_id=%s", sos_id, call_id or "<missing>")

            # Launch background thread to monitor call completion and fetch transcript
            if call_id:
                threading.Thread(
                    target=_monitor_bland_call,
                    args=(sos_id, call_id),
                    daemon=True,
                ).start()

            return {"call_sid": call_id, "status": "IN_PROGRESS", "simulated": False}

        except Exception as e:
            logger.exception("Bland dispatch exception | sos=%s error=%s", sos_id, e)
            if sos:
                sos.call_status = "FAILED"
                db.commit()
            return {"call_sid": None, "status": "FAILED", "error": str(e), "simulated": False}

    @staticmethod
    def save_call_results(
        db: Session,
        sos_id: int,
        call_sid: str,
        status: str,
        transcript: str,
        summary: str,
    ):
        """Persist call transcript and summary, then dispatch emails."""
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            logger.warning("save_call_results: SOS %s not found", sos_id)
            return

        transcript_text = VoiceService.normalize_transcript(transcript or "")
        if transcript_text:
            sos.call_transcript = transcript_text

        summary_text = (summary or "").strip()
        if not summary_text:
            summary_text = _summarize_transcript(transcript_text)
            logger.info("Generated fallback transcript summary for SOS %s", sos_id)
        sos.call_summary = summary_text

        # Add AI emergency summary when the speech transcript is available.
        if transcript_text:
            try:
                from app.services.ai_pipeline_service import AIPipelineService
                ai_result = AIPipelineService.run_triage(
                    db=db,
                    user_id=sos.user_id,
                    emergency_description=transcript_text,
                    sos_id=sos_id,
                    sos_status=status or "COMPLETED",
                )
                sos.ai_emergency_understanding = ai_result.get("emergency_understanding") or sos.ai_emergency_understanding
                sos.ai_severity = ai_result.get("severity") or sos.ai_severity
                sos.ai_required_capabilities = ai_result.get("required_medical_capability") or sos.ai_required_capabilities
                sos.ai_health_summary = ai_result.get("ai_health_summary") or sos.ai_health_summary
                sos.ai_emergency_report = ai_result.get("emergency_report") or sos.ai_emergency_report
            except Exception as ai_exc:
                logger.warning("AI summary generation failed for SOS %s: %s", sos_id, ai_exc)

        sos.call_sid = call_sid or sos.call_sid
        sos.call_status = status or "COMPLETED"
        db.commit()

        logger.info("Saved call results for SOS %s (status=%s, transcript_len=%s)", sos_id, status, len(transcript_text or ""))

        # Dispatch email notifications to patient and emergency contacts
        try:
            from app.services.email_service import EmailService
            EmailService.send_sos_transcript_emails(db, sos_id)
        except Exception as ex:
            logger.warning("Email dispatch after call completion failed: %s", ex)

    @staticmethod
    def get_initial_twiml(db: Session, sos_id: int) -> str:
        """Backward compatibility stub for legacy telephony clients."""
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">LifeLink AI has upgraded to real-time voice agents. Please check your dashboard.</Say>
  <Hangup/>
</Response>"""

    @staticmethod
    def process_speech_turn(db: Session, sos_id: int, speech_result: str, turn: int) -> str:
        """Backward compatibility stub."""
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>"""

    @staticmethod
    def finalize_call(db: Session, sos_id: int, call_sid: str, call_status: str):
        """Backward compatibility stub."""
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if sos:
            sos.call_status = call_status.upper()
            sos.call_sid = call_sid or sos.call_sid
            db.commit()

    @staticmethod
    def simulate_full_call(db: Session, sos_id: int) -> dict:
        """
        Simulate a full AI emergency voice call without placing a live telephone call.
        Saves realistic transcript and triggers email dispatch.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            return {"error": f"SOS {sos_id} not found"}

        user_name = sos.patient_name or "Patient"
        description = sos.description or "Medical emergency triggered."

        simulated_transcript = (
            f"AI: Hello {user_name}, this is LifeLink Emergency AI. We received your emergency SOS alert and responders are being notified. Can you tell me what happened and how you are feeling right now?\n"
            f"Patient: {description}\n"
            f"AI: Understood. Please sit or lie down in a safe position and do not move if you feel sharp pain. Are you breathing normally and is there any bleeding?\n"
            f"Patient: I am breathing, but I am in severe discomfort. Please send help.\n"
            f"AI: Help is en route to your exact location right now. Stay calm and stay on the line. We have alerted your emergency contacts."
        )

        simulated_summary = (
            f"Patient {user_name} triggered an SOS for '{description}'. "
            "Patient is conscious and breathing with reported discomfort. "
            "Instructed to remain stationary; emergency responders and contacts have been alerted."
        )

        call_sid = "sim-bland-" + str(int(time.time()))
        VoiceService.save_call_results(
            db,
            sos_id=sos_id,
            call_sid=call_sid,
            status="COMPLETED",
            transcript=simulated_transcript,
            summary=simulated_summary,
        )

        return {
            "sos_id": sos_id,
            "status": "COMPLETED",
            "call_sid": call_sid,
            "transcript": simulated_transcript,
            "summary": simulated_summary,
        }
