"""
Voice Router — Bland AI Webhook Endpoints + Utilities.

Endpoints:
    GET/POST /voice/call-twiml/{sos_id}    — Legacy telephony compatibility endpoint
  POST     /voice/process-turn/{sos_id}  — Speech recognition result processing
    POST     /voice/status/{sos_id}        — Legacy telephony compatibility endpoint
    POST     /voice/simulate/{sos_id}      — Full call simulation without a live call
  POST     /voice/resend-email/{sos_id}  — Re-trigger email for any completed SOS
  GET      /voice/transcript/{sos_id}    — Retrieve call transcript for a SOS
"""

import os
import re
import time

import requests
from fastapi import APIRouter, BackgroundTasks, Body, Depends, Request, Form, Query, HTTPException, status
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

try:
    from agora_token_builder import RtcTokenBuilder
except ImportError:  # pragma: no cover - package may be installed later
    RtcTokenBuilder = None

from app.database.session import SessionLocal, get_db
from app.services.voice_service import VoiceService
from app.services.email_service import EmailService
from app.models.sos import SOS
from app.security.dependencies import get_current_user

router = APIRouter(
    prefix="/voice",
    tags=["Voice Call"]
)


def _save_agora_results_in_background(
    sos_id: int,
    uid: int,
    transcript: str,
    summary: str,
) -> None:
    """Keep slow AI/email work out of the phone's finalization request."""
    db = SessionLocal()
    try:
        VoiceService.save_call_results(
            db,
            sos_id=sos_id,
            call_sid=f"agora-{sos_id}-{uid}",
            status="COMPLETED",
            transcript=transcript,
            summary=summary,
        )
    finally:
        db.close()


@router.post(
    "/agora-token",
    summary="Generate a temporary Agora RTC token for in-app voice calls"
)
async def generate_agora_token(
    payload: dict = Body(...),
    current_user=Depends(get_current_user),
):
    """Generate an Agora RTC token on the backend and return it to the app."""
    if RtcTokenBuilder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agora token builder is not installed. Install agora-token-builder in backend/requirements.txt.",
        )

    app_id = (os.getenv("AGORA_APP_ID") or "").strip()
    app_certificate = (os.getenv("AGORA_APP_CERTIFICATE") or "").strip()
    ttl = int(os.getenv("AGORA_TOKEN_TTL", "3600"))

    if not app_id or not app_certificate:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in backend/.env.",
        )

    channel_name = str(payload.get("channelName") or "lifelink-voice").strip()
    uid = payload.get("uid")
    if uid is None:
        uid = current_user.user_id

    try:
        uid = int(uid)
        privilege_expired_at = int(time.time()) + ttl
        if hasattr(RtcTokenBuilder, "build_token_with_uid"):
            token = RtcTokenBuilder.build_token_with_uid(
                app_id,
                app_certificate,
                channel_name,
                uid,
                ttl,
            )
        else:
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id,
                app_certificate,
                channel_name,
                uid,
                1,
                privilege_expired_at,
            )
    except Exception as exc:  # pragma: no cover - runtime validation only
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to generate Agora token: {exc}",
        ) from exc

    return {
        "success": True,
        "provider": "agora",
        "token": token,
        "channelName": channel_name,
        "uid": uid,
        "appId": app_id,
        "expiresIn": ttl,
    }


@router.post(
    "/agora-session",
    summary="Create a session for the in-app voice workflow and return channel metadata"
)
async def create_agora_session(
    payload: dict = Body(default={}),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a voice session and bind it to an SOS if one is provided."""
    channel_name = str(payload.get("channelName") or f"lifelink-sos-{current_user.user_id}").strip()
    uid = int(payload.get("uid") or current_user.user_id)
    sos_id = payload.get("sosId")

    if sos_id is not None:
        sos = db.query(SOS).filter(SOS.sos_id == int(sos_id)).first()
        if not sos:
            raise HTTPException(status_code=404, detail=f"SOS {sos_id} not found")
        channel_name = str(payload.get("channelName") or f"lifelink-sos-{sos.sos_id}").strip()

    token_response = await generate_agora_token({"channelName": channel_name, "uid": uid}, current_user)
    return {
        "success": True,
        "provider": "agora",
        "channelName": channel_name,
        "uid": uid,
        "token": token_response["token"],
        "appId": token_response["appId"],
        "expiresIn": token_response["expiresIn"],
        "sosId": int(sos_id) if sos_id is not None else None,
    }


@router.post(
    "/agent-questions",
    summary="Return the emergency AI interview questions for the in-app voice assistant"
)
async def get_agent_questions(
    payload: dict = Body(default={}),
):
    """Return the exact question sequence the emergency voice agent should ask."""
    patient_name = str(payload.get("patientName") or "Patient").strip() or "Patient"
    emergency_description = str(payload.get("emergencyDescription") or "").strip()
    return {
        "success": True,
        "questions": VoiceService.build_agent_questions(patient_name, emergency_description),
    }


@router.post(
    "/agora-finish",
    summary="Finalize the in-app AI voice session by saving the transcript and dispatching email"
)
async def finish_agora_session(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Acknowledge immediately; persist transcript and send email in background."""
    sos_id = payload.get("sosId")
    transcript = payload.get("transcript") or ""
    summary = payload.get("summary") or "No summary provided."

    if sos_id is None:
        raise HTTPException(status_code=400, detail="sosId is required.")

    sos = db.query(SOS).filter(SOS.sos_id == int(sos_id)).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS not found.")
    if sos.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You may only save transcripts for your own SOS.")

    background_tasks.add_task(
        _save_agora_results_in_background,
        int(sos_id),
        int(payload.get('uid') or 0),
        str(transcript),
        str(summary),
    )

    return {
        "success": True,
        "provider": "agora",
        "sosId": int(sos_id),
        "status": "COMPLETED",
    }


# ── 1. Legacy telephony compatibility ────────────────────────────────────────

@router.get(
    "/call-twiml/{sos_id}",
    response_class=Response,
    summary="Legacy telephony entry endpoint (GET)",
    operation_id="call_twiml_get",
)
@router.post(
    "/call-twiml/{sos_id}",
    response_class=Response,
    summary="Legacy telephony entry endpoint (POST)",
    operation_id="call_twiml_post",
)
async def call_twiml(sos_id: int, db: Session = Depends(get_db)):
    """
    Retained for compatibility with older clients. New calls are placed and
    handled entirely by the Bland AI agent.
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
    Legacy telephony clients may post speech here.
    Returns the next TwiML response.
    """
    # Legacy telephony clients send speech as form data.
    form = await request.form()
    speech_result = str(form.get("SpeechResult", "")).strip()

    if not speech_result:
        speech_result = "[inaudible]"

    twiml = VoiceService.process_speech_turn(db, sos_id, speech_result, turn)
    return Response(content=twiml, media_type="application/xml")


# ── 3. Bland AI Post-Call Webhook Callback ────────────────────────────────────

@router.post(
    "/bland-webhook/{sos_id}",
    summary="Bland AI post-call webhook callback (path with sos_id)"
)
@router.post(
    "/bland-webhook",
    summary="Bland AI post-call webhook callback (general)"
)
async def bland_call_webhook(
    request: Request,
    sos_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Bland AI posts full call metadata here upon call completion:
    call_id, concatenated_transcript, summary, status, etc.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    target_sos_id = sos_id
    if not target_sos_id:
        req_data = data.get("request_data") or data.get("variables") or {}
        target_sos_id = req_data.get("sos_id")

    call_id = str(data.get("call_id", ""))
    call_status_val = str(data.get("status", "completed")).upper()
    transcript = str(data.get("concatenated_transcript") or "")
    summary = str(data.get("summary") or "")

    if target_sos_id:
        VoiceService.save_call_results(
            db,
            sos_id=int(target_sos_id),
            call_sid=call_id,
            status=call_status_val,
            transcript=transcript,
            summary=summary,
        )

    return JSONResponse({"received": True, "sos_id": target_sos_id, "call_id": call_id})


# ── Legacy Telephony Status Callback (for backward compatibility) ─────────────

@router.post(
    "/status/{sos_id}",
    summary="Legacy call status lifecycle callback"
)
async def call_status(
    sos_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    call_status_val = str(form.get("CallStatus", ""))
    VoiceService.finalize_call(db, sos_id, call_sid, call_status_val)
    return JSONResponse({"received": True, "sos_id": sos_id, "call_status": call_status_val})


# ── 4. Simulation Endpoint ────────────────────────────────────────────────────

@router.post(
    "/simulate/{sos_id}",
    summary="Simulate a full AI voice call conversation (no live call)"
)
async def simulate_call(sos_id: int, db: Session = Depends(get_db)):
    """
    Simulates the full AI phone call: generates a mock conversation,
    saves the transcript, and dispatches the transcript email.
    Use this to test the full flow without Bland AI credentials.
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
