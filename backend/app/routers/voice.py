"""
Voice Router — Twilio Webhook Endpoints + Utilities.

Endpoints:
  GET/POST /voice/call-twiml/{sos_id}    — Entry webhook (Twilio calls this first)
  POST     /voice/process-turn/{sos_id}  — Speech recognition result processing
  POST     /voice/status/{sos_id}        — Twilio call lifecycle status callback
  POST     /voice/simulate/{sos_id}      — Full call simulation without Twilio
  POST     /voice/resend-email/{sos_id}  — Re-trigger email for any completed SOS
  GET      /voice/transcript/{sos_id}    — Retrieve call transcript for a SOS
"""

from fastapi import APIRouter, Depends, Request, Form, Query
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.services.voice_service import VoiceService
from app.services.email_service import EmailService
from app.models.sos import SOS

router = APIRouter(
    prefix="/voice",
    tags=["Voice Call"]
)


# ── 1. Twilio Entry Webhook ───────────────────────────────────────────────────

@router.get(
    "/call-twiml/{sos_id}",
    response_class=Response,
    summary="Twilio entry webhook (GET) — returns initial TwiML greeting",
    operation_id="call_twiml_get",
)
@router.post(
    "/call-twiml/{sos_id}",
    response_class=Response,
    summary="Twilio entry webhook (POST) — returns initial TwiML greeting",
    operation_id="call_twiml_post",
)
async def call_twiml(sos_id: int, db: Session = Depends(get_db)):
    """
    Twilio calls this URL when the patient picks up.
    Returns TwiML that greets the patient and begins voice capture.
    """
    twiml = VoiceService.get_initial_twiml(db, sos_id)
    return Response(content=twiml, media_type="application/xml")


# ── 2. Speech Turn Processing ─────────────────────────────────────────────────

@router.post(
    "/process-turn/{sos_id}",
    response_class=Response,
    summary="Process patient speech and return next TwiML (POST)",
    operation_id="process_turn_post"
)
@router.get(
    "/process-turn/{sos_id}",
    response_class=Response,
    summary="Process patient speech and return next TwiML (GET)",
    operation_id="process_turn_get"
)
async def process_turn(
    sos_id: int,
    request: Request,
    turn: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Twilio posts here with the speech transcript (SpeechResult).
    Returns the next TwiML response.
    """
    # Twilio sends speech as form data
    form = await request.form()
    speech_result = str(form.get("SpeechResult", "")).strip()

    if not speech_result:
        speech_result = "[inaudible]"

    twiml = VoiceService.process_speech_turn(db, sos_id, speech_result, turn)
    return Response(content=twiml, media_type="application/xml")


# ── 3. Twilio Status Callback ─────────────────────────────────────────────────

@router.post(
    "/status/{sos_id}",
    summary="Twilio call status lifecycle callback"
)
async def call_status(
    sos_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Twilio posts lifecycle events here (completed, failed, no-answer, busy).
    Triggers transcript finalization and email dispatch.
    """
    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    call_status_val = str(form.get("CallStatus", ""))

    VoiceService.finalize_call(db, sos_id, call_sid, call_status_val)

    return JSONResponse({"received": True, "sos_id": sos_id, "call_status": call_status_val})


# ── 4. Simulation Endpoint ────────────────────────────────────────────────────

@router.post(
    "/simulate/{sos_id}",
    summary="Simulate a full AI voice call conversation (no real Twilio call)"
)
async def simulate_call(sos_id: int, db: Session = Depends(get_db)):
    """
    Simulates the full AI phone call: generates a mock conversation,
    saves the transcript, and dispatches the transcript email.
    Use this to test the full flow without Twilio credentials.
    """
    result = VoiceService.simulate_full_call(db, sos_id)
    return JSONResponse(result)


# ── 5. Resend Email ───────────────────────────────────────────────────────────

@router.post(
    "/resend-email/{sos_id}",
    summary="Re-send the SOS transcript email for a completed SOS"
)
async def resend_email(sos_id: int, db: Session = Depends(get_db)):
    """
    Re-triggers email dispatch for any SOS that has a transcript.
    Useful if the initial email failed or to test email formatting.
    """
    sos = db.query(SOS).filter(SOS.sos_id == sos_id).first()
    if not sos:
        return JSONResponse({"error": f"SOS {sos_id} not found"}, status_code=404)

    result = EmailService.send_sos_transcript_emails(db, sos_id)
    return JSONResponse({"sos_id": sos_id, **result})


# ── 6. Transcript Retrieval ───────────────────────────────────────────────────

@router.get(
    "/transcript/{sos_id}",
    summary="Get call transcript and summary for a SOS"
)
async def get_transcript(sos_id: int, db: Session = Depends(get_db)):
    """Returns the AI voice call transcript and summary for a given SOS."""
    sos = db.query(SOS).filter(SOS.sos_id == sos_id).first()
    if not sos:
        return JSONResponse({"error": f"SOS {sos_id} not found"}, status_code=404)

    return JSONResponse({
        "sos_id": sos_id,
        "call_sid": sos.call_sid,
        "call_status": sos.call_status,
        "call_transcript": sos.call_transcript,
        "call_summary": sos.call_summary,
        "email_sent": bool(sos.email_sent),
        "email_sent_at": str(sos.email_sent_at) if sos.email_sent_at else None,
    })
