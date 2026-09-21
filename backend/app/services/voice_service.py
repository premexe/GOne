"""
Voice Service — Real-Time AI Phone Call via Twilio.

Flow:
  1. SOS is created  →  initiate_call() places an outbound call to the patient.
  2. Twilio hits /voice/call-twiml/{sos_id}  →  initial AI greeting + Gather.
  3. Patient speaks  →  /voice/process-turn/{sos_id} receives the transcript.
  4. Gemini generates a contextual follow-up question (max 3 turns).
  5. On call completion  →  /voice/status/{sos_id} triggers finalize_call():
       • persists full transcript & summary to SOS record
       • calls EmailService to send the transcript email

Simulation mode:
  When TWILIO_* credentials are absent, all operations are logged only —
  no external calls are made and the server never crashes.

Required env vars (all optional for simulation):
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_PHONE_NUMBER   # E.164 caller ID
  PUBLIC_BACKEND_URL    # HTTPS URL reachable by Twilio webhooks
  GEMINI_API_KEY        # Reuses the existing key from the AI pipeline
"""

import json
import ipaddress
import logging
import os
import re
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.sos import SOS
from app.models.emergency_wallet import EmergencyWallet
from app.models.users import User

logger = logging.getLogger(__name__)

# Keep this module safe when it is imported directly by a worker, shell, or test.
load_dotenv()

# ── Env ──────────────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
PUBLIC_BACKEND_URL = os.getenv("PUBLIC_BACKEND_URL", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ENABLE_SOS_VOICE_CALLS = os.getenv("ENABLE_SOS_VOICE_CALLS", "false").strip().lower() in {"1", "true", "yes", "on"}

def _public_webhook_base_url() -> Optional[str]:
    """Return a safe Twilio-reachable webhook URL, or None when misconfigured."""
    value = PUBLIC_BACKEND_URL.strip().rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        return None
    # Twilio cannot reach a loopback/LAN URL, and accepting one creates opaque URL errors.
    host = (parsed.hostname or "").lower()
    if host == "localhost":
        return None
    try:
        if ipaddress.ip_address(host).is_private or ipaddress.ip_address(host).is_loopback:
            return None
    except ValueError:
        pass
    return value


WEBHOOK_BASE_URL = _public_webhook_base_url()
_TWILIO_READY = all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, WEBHOOK_BASE_URL])
_GEMINI_READY = bool(GEMINI_API_KEY)

MAX_TURNS = 3  # How many back-and-forth turns before gracefully closing the call

# ── Phone Normalisation ───────────────────────────────────────────────────────

def _normalise_phone(phone: str, default_country: str = "+91") -> Optional[str]:
    """
    Ensure phone number is in E.164 format.
    10-digit numbers are assumed to be Indian and prefixed with +91.
    """
    if not phone:
        return None
    digits = re.sub(r"[^\d+]", "", phone)
    if digits.startswith("+"):
        return digits if len(digits) >= 8 else None
    if len(digits) == 10:
        return f"{default_country}{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if len(digits) >= 8:
        return f"+{digits}"
    return None


# ── TwiML Helpers ─────────────────────────────────────────────────────────────

def _twiml_gather_response(message: str, action_url: str, voice: str = "Polly.Aditi") -> str:
    """Return TwiML that speaks a message then gathers speech input."""
    safe_msg = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    safe_url = action_url.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="{safe_url}" method="POST" language="en-IN" speechTimeout="auto" timeout="8">
    <Say voice="{voice}" language="en-IN">{safe_msg}</Say>
  </Gather>
  <Say voice="{voice}" language="en-IN">We didn't catch that. Please stay on the line — emergency responders have your GPS location.</Say>
  <Hangup/>
</Response>"""


def _twiml_say_hangup(message: str, voice: str = "Polly.Aditi") -> str:
    """Return TwiML that speaks a closing message and hangs up."""
    safe_msg = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="{voice}" language="en-IN">{safe_msg}</Say>
  <Hangup/>
</Response>"""


# ── Gemini AI Response ────────────────────────────────────────────────────────

def _generate_ai_response(
    transcript_so_far: str,
    patient_speech: str,
    wallet_context: str,
    turn: int,
) -> str:
    """
    Uses Gemini to generate a calm, concise voice response for the patient.
    Falls back to a safe canned response if Gemini is unavailable.
    """
    if not _GEMINI_READY:
        fallback_prompts = [
            "Can you tell me where you are and what happened?",
            "Are you conscious and breathing normally? Is there any bleeding?",
            "Help is on the way. Please stay calm and stay on the line.",
        ]
        return fallback_prompts[min(turn, len(fallback_prompts) - 1)]

    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=GEMINI_API_KEY)

        system_prompt = f"""You are LifeLink's emergency AI responder on a real-time phone call.
The patient has triggered an emergency SOS alert.
Your role: gather critical information quickly and calmly to assist dispatchers.

Patient's medical context:
{wallet_context if wallet_context else "No medical wallet on file."}

Conversation so far:
{transcript_so_far}

Patient just said: "{patient_speech}"

This is turn {turn + 1} of maximum {MAX_TURNS}.

Rules:
- Respond in 1-2 short sentences spoken aloud — no markdown, no lists.
- If turn >= {MAX_TURNS - 1}: reassure the patient that help is coming and close the call.
- Ask ONE targeted follow-up: bleeding, consciousness, pain level, hazards (fire/gas/traffic), or specific location.
- Keep tone: calm, professional, warm, urgent but not alarming.
- Do NOT use bullet points, asterisks, or any formatting.
- Speak naturally as if on a phone call.
"""
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=system_prompt,
            )
        except Exception:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=system_prompt,
            )
        text = response.text.strip()
        # Remove any markdown artefacts
        text = re.sub(r"\*+", "", text)
        text = re.sub(r"#+ ", "", text)
        return text[:400]  # Limit response length for TTS

    except Exception as e:
        logger.warning("Gemini voice response failed: %s", e)
        return "Understood. Please stay calm — emergency responders have your location and are on their way. Is there anything else critical I should know?"


def _build_wallet_summary(db: Session, user_id: int) -> str:
    """Return a compact text summary of the patient's medical wallet."""
    try:
        wallet: Optional[EmergencyWallet] = (
            db.query(EmergencyWallet)
            .filter(EmergencyWallet.user_id == user_id)
            .first()
        )
        if not wallet:
            return ""
        parts = []
        if wallet.blood_group:
            parts.append(f"Blood Group: {wallet.blood_group}")
        if wallet.allergies:
            parts.append(f"Allergies: {wallet.allergies}")
        if wallet.chronic_conditions:
            parts.append(f"Chronic Conditions: {wallet.chronic_conditions}")
        if wallet.current_medications:
            parts.append(f"Medications: {wallet.current_medications}")
        if wallet.emergency_notes:
            parts.append(f"Notes: {wallet.emergency_notes}")
        return " | ".join(parts)
    except Exception:
        return ""


def _generate_call_summary(transcript: str, ai_report: Optional[str]) -> str:
    """Use Gemini to generate a brief clinical summary of the call."""
    if not _GEMINI_READY or not transcript.strip():
        return ai_report or "Emergency call completed. See transcript for details."
    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""Summarise this emergency AI voice call transcript in 2-3 sentences for a medical dispatcher.
Include: what happened, patient condition, any mentioned location details.
Be concise and clinical.

Transcript:
{transcript}

Existing AI report:
{ai_report or 'None'}
"""
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
        except Exception:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
            )
        return response.text.strip()[:800]
    except Exception as e:
        logger.warning("Call summary generation failed: %s", e)
        return ai_report or "Emergency call transcript is available above."


# ── Twilio Client Helper ──────────────────────────────────────────────────────

def _get_twilio_client():
    if not _TWILIO_READY:
        return None
    try:
        from twilio.rest import Client  # type: ignore
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logger.error("Failed to create Twilio client: %s", e)
        return None


# ── Public API ────────────────────────────────────────────────────────────────

class VoiceService:

    @staticmethod
    def is_calling_enabled() -> bool:
        """Real calls are opt-in so development and automated tests never spend Twilio credit."""
        return ENABLE_SOS_VOICE_CALLS and _TWILIO_READY

    @staticmethod
    def initiate_call(db: Session, sos_id: int, patient_phone: str) -> dict:
        """
        Place an outbound AI call to the patient after SOS is triggered.
        Returns dict with call_sid and status.
        """
        phone_e164 = _normalise_phone(patient_phone)
        if not phone_e164:
            logger.warning("VoiceService: Invalid phone '%s' for SOS %s", patient_phone, sos_id)
            return {"call_sid": None, "status": "INVALID_PHONE", "simulated": True}

        # Prevent duplicate calls for the same SOS
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if sos and sos.call_sid:
            logger.info("Call already placed for SOS %s (call_sid=%s), skipping duplicate.", sos_id, sos.call_sid)
            return {"call_sid": sos.call_sid, "status": sos.call_status or "IN_PROGRESS", "simulated": False}

        if not ENABLE_SOS_VOICE_CALLS:
            logger.info("Voice calls are disabled for SOS %s; no Twilio call was placed.", sos_id)
            if sos:
                sos.call_status = "DISABLED"
                db.commit()
            return {"call_sid": None, "status": "DISABLED", "simulated": False}

        if not _TWILIO_READY:
            configuration_error = (
                "PUBLIC_BACKEND_URL must be a publicly reachable HTTPS URL"
                if not WEBHOOK_BASE_URL else "Twilio credentials are incomplete"
            )
            logger.warning("Voice call not placed for SOS %s: %s", sos_id, configuration_error)
            if sos:
                sos.call_status = "CONFIGURATION_ERROR"
                db.commit()
            return {"call_sid": None, "status": "CONFIGURATION_ERROR", "error": configuration_error, "simulated": False}

        if not _TWILIO_READY:  # Unreachable after the configuration check above.
            logger.info(
                "[CALL SIMULATED] SOS=%s → would call %s | Add Twilio credentials to enable real calls.",
                sos_id, phone_e164
            )
            sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
            if sos:
                sos.call_status = "SIMULATED"
                db.commit()
            return {"call_sid": f"SIMULATED_{sos_id}", "status": "SIMULATED", "simulated": True}

        try:
            client = _get_twilio_client()
            if not client:
                raise RuntimeError("Twilio client unavailable")

            twiml_url = f"{WEBHOOK_BASE_URL}/voice/call-twiml/{sos_id}"
            status_url = f"{WEBHOOK_BASE_URL}/voice/status/{sos_id}"

            # For trial accounts, minimal parameters (to, from_, url) are strictly required
            call = client.calls.create(
                to=phone_e164,
                from_=TWILIO_PHONE_NUMBER,
                url=twiml_url,
                status_callback=status_url,
                status_callback_event=["completed"],
                status_callback_method="POST",
            )

            # Persist call SID immediately
            sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
            if sos:
                sos.call_sid = call.sid
                sos.call_status = "IN_PROGRESS"
                db.commit()

            logger.info("Twilio call initiated | sos=%s call_sid=%s phone=%s", sos_id, call.sid, phone_e164)
            return {"call_sid": call.sid, "status": "IN_PROGRESS", "simulated": False}

        except Exception as e:
            logger.error("VoiceService.initiate_call failed | sos=%s error=%s", sos_id, e)
            sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
            if sos:
                sos.call_status = "FAILED"
                db.commit()
            return {"call_sid": None, "status": "FAILED", "error": str(e), "simulated": False}

    @staticmethod
    def get_initial_twiml(db: Session, sos_id: int) -> str:
        """
        Return TwiML for the initial call greeting.
        Called by Twilio webhook: GET/POST /voice/call-twiml/{sos_id}
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        patient_name = sos.patient_name if sos else "there"
        first_name = patient_name.split()[0] if patient_name else "there"

        greeting = (
            f"Hello {first_name}, this is LifeLink Emergency AI. "
            "We received your emergency SOS signal and help is being dispatched to your location. "
            "I'm here to assist you and gather important information for the responders. "
            "Can you please tell me what happened and how you are feeling right now?"
        )

        action_url = f"{WEBHOOK_BASE_URL}/voice/process-turn/{sos_id}?turn=0"
        return _twiml_gather_response(greeting, action_url)

    @staticmethod
    def process_speech_turn(
        db: Session,
        sos_id: int,
        speech_result: str,
        turn: int,
    ) -> str:
        """
        Process one spoken turn from the patient and return next TwiML.
        Called by Twilio webhook: POST /voice/process-turn/{sos_id}
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            return _twiml_say_hangup("We couldn't locate your emergency record. Please call emergency services directly. Stay safe.")

        # Build current transcript
        existing = sos.call_transcript or ""
        new_entry = f"Patient: {speech_result.strip()}"
        updated_transcript = f"{existing}\n{new_entry}".strip()

        # Get wallet context
        wallet_ctx = _build_wallet_summary(db, sos.user_id)

        if turn >= MAX_TURNS - 1:
            # Final turn — close the call
            closing = (
                "Thank you for the information. Our emergency team has received everything. "
                "Responders are on their way to your location right now. "
                "Please stay calm, stay on the line with anyone near you, and do not move unless there is immediate danger. "
                "LifeLink AI will send a full report to you and your emergency contacts. Take care."
            )
            ai_entry = f"AI: {closing}"
            full_transcript = f"{updated_transcript}\n{ai_entry}".strip()
            summary = _generate_call_summary(full_transcript, sos.ai_emergency_report)

            # Persist
            sos.call_transcript = full_transcript
            sos.call_summary = summary
            sos.call_status = "COMPLETED"
            db.commit()

            # Trigger email async-style (inline — fast enough for transcript)
            try:
                from app.services.email_service import EmailService
                EmailService.send_sos_transcript_emails(db, sos_id)
            except Exception as e:
                logger.warning("Email dispatch failed after call turn: %s", e)

            return _twiml_say_hangup(closing)

        # Generate AI response
        ai_text = _generate_ai_response(updated_transcript, speech_result, wallet_ctx, turn)
        ai_entry = f"AI: {ai_text}"
        full_transcript = f"{updated_transcript}\n{ai_entry}".strip()

        # Persist transcript update
        sos.call_transcript = full_transcript
        db.commit()

        next_turn = turn + 1
        action_url = f"{WEBHOOK_BASE_URL}/voice/process-turn/{sos_id}?turn={next_turn}"
        return _twiml_gather_response(ai_text, action_url)

    @staticmethod
    def finalize_call(db: Session, sos_id: int, call_sid: str, call_status: str):
        """
        Called by Twilio status callback when call ends.
        Ensures transcript & email are finalized.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            return

        terminal_statuses = {"completed", "failed", "no-answer", "busy", "canceled"}
        if call_status.lower() not in terminal_statuses:
            return

        status_map = {
            "completed": "COMPLETED",
            "failed": "FAILED",
            "no-answer": "NO_ANSWER",
            "busy": "BUSY",
            "canceled": "CANCELED",
        }
        sos.call_status = status_map.get(call_status.lower(), call_status.upper())
        sos.call_sid = call_sid or sos.call_sid

        # Generate summary if not yet done
        if not sos.call_summary and sos.call_transcript:
            sos.call_summary = _generate_call_summary(sos.call_transcript, sos.ai_emergency_report)

        db.commit()

        # Send email if not already sent
        if not sos.email_sent and sos.call_status == "COMPLETED":
            try:
                from app.services.email_service import EmailService
                EmailService.send_sos_transcript_emails(db, sos_id)
            except Exception as e:
                logger.warning("Email dispatch failed in finalize_call: %s", e)

        logger.info("finalize_call | sos=%s call_status=%s email_sent=%s", sos_id, sos.call_status, sos.email_sent)

    @staticmethod
    def simulate_full_call(db: Session, sos_id: int) -> dict:
        """
        Simulate a full AI call conversation for testing without Twilio credentials.
        Returns the simulated transcript and email dispatch result.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            return {"error": f"SOS {sos_id} not found"}

        wallet_ctx = _build_wallet_summary(db, sos.user_id)

        # Simulated patient responses based on the SOS description
        patient_responses = [
            sos.description or "I need help urgently, something happened.",
            "I am conscious but in pain. I'm at the location I triggered SOS from.",
            "Yes, please send help quickly. My family has been notified.",
        ]

        transcript_lines = []
        transcript_lines.append("AI: Hello, this is LifeLink Emergency AI. We received your SOS. Can you tell me what happened?")

        for turn, patient_text in enumerate(patient_responses):
            transcript_lines.append(f"Patient: {patient_text}")
            if turn >= MAX_TURNS - 1:
                closing = "Thank you. Responders are on the way. A full transcript will be emailed to you and your emergency contacts."
                transcript_lines.append(f"AI: {closing}")
                break
            ai_resp = _generate_ai_response("\n".join(transcript_lines), patient_text, wallet_ctx, turn)
            transcript_lines.append(f"AI: {ai_resp}")

        full_transcript = "\n".join(transcript_lines)
        summary = _generate_call_summary(full_transcript, sos.ai_emergency_report)

        sos.call_transcript = full_transcript
        sos.call_summary = summary
        sos.call_status = "COMPLETED"
        db.commit()

        # Send email
        email_result = {}
        try:
            from app.services.email_service import EmailService
            email_result = EmailService.send_sos_transcript_emails(db, sos_id)
        except Exception as e:
            email_result = {"error": str(e)}

        return {
            "simulated": True,
            "sos_id": sos_id,
            "transcript": full_transcript,
            "summary": summary,
            "email_result": email_result,
        }
