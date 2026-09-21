"""
Email Service — SOS Transcript Delivery.

Sends a fully formatted HTML emergency alert email to:
  • The patient (user.email)
  • All emergency contacts that have a registered email

Uses SMTP credentials from environment variables.
If credentials are not configured, the email is simulated (logged) instead.

Required environment variables:
  SMTP_HOST       — e.g. smtp.resend.com
  SMTP_PORT       — e.g. 587
  SMTP_USERNAME   — e.g. resend
  SMTP_PASSWORD   — your SMTP / Resend API key
  EMAIL_FROM      — e.g. "LifeLink Emergency <alerts@yourdomain.com>"
"""

import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sos import SOS
from app.models.users import User
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_wallet import EmergencyWallet

logger = logging.getLogger(__name__)

# ── Env ──────────────────────────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "LifeLink Emergency <noreply@lifelink.ai>")

_SMTP_READY = all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD])


# ── HTML Template ─────────────────────────────────────────────────────────────

def _build_html(sos: SOS, user: User, wallet: Optional[EmergencyWallet]) -> str:
    severity = sos.ai_severity or "UNKNOWN"
    severity_color = {
        "CRITICAL": "#dc2626",
        "HIGH": "#ea580c",
        "MODERATE": "#d97706",
        "LOW": "#16a34a",
        "UNKNOWN": "#6b7280",
    }.get(severity, "#6b7280")

    location_text = "Not available"
    maps_link = ""
    if sos.latitude and sos.longitude:
        location_text = f"{sos.latitude:.6f}, {sos.longitude:.6f}"
        maps_link = f"https://maps.google.com/?q={sos.latitude},{sos.longitude}"

    transcript_html = ""
    if sos.call_transcript:
        lines = sos.call_transcript.split("\n")
        for line in lines:
            if line.strip():
                if line.startswith("AI:"):
                    transcript_html += f'<div style="background:#1e40af22;border-left:3px solid #3b82f6;padding:8px 12px;margin:4px 0;border-radius:4px;"><strong style="color:#3b82f6;">🤖 AI:</strong> {line[3:].strip()}</div>'
                elif line.startswith("Patient:"):
                    transcript_html += f'<div style="background:#16a34a22;border-left:3px solid #22c55e;padding:8px 12px;margin:4px 0;border-radius:4px;"><strong style="color:#22c55e;">🗣 Patient:</strong> {line[8:].strip()}</div>'
                else:
                    transcript_html += f'<div style="padding:4px 12px;color:#9ca3af;font-size:13px;">{line}</div>'
    else:
        transcript_html = '<p style="color:#6b7280;font-style:italic;">No call transcript available.</p>'

    wallet_rows = ""
    if wallet:
        for label, val in [
            ("Blood Group", wallet.blood_group or "—"),
            ("Allergies", wallet.allergies or "—"),
            ("Chronic Conditions", wallet.chronic_conditions or "—"),
            ("Current Medications", wallet.current_medications or "—"),
            ("Emergency Notes", wallet.emergency_notes or "—"),
        ]:
            wallet_rows += f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:13px;white-space:nowrap;">{label}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-size:13px;">{val}</td>
            </tr>"""

    ai_understanding = sos.ai_emergency_understanding or "AI triage pending or unavailable."
    call_summary = sos.call_summary or "No call summary available."
    ts = sos.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if sos.created_at else "Unknown"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>LifeLink Emergency Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626,#7f1d1d);border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">🚨</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">EMERGENCY SOS ACTIVATED</h1>
      <p style="color:#fca5a5;margin:8px 0 0;font-size:14px;">LifeLink AI Emergency Response System</p>
    </div>

    <!-- Patient Info -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#f3f4f6;font-size:16px;margin:0 0 16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Patient Information</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:13px;width:40%;">Name</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-size:13px;font-weight:600;">{sos.patient_name or user.full_name or "Unknown"}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:13px;">Phone</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-size:13px;">{sos.patient_phone or user.phone_number or "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:13px;">SOS ID</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-size:13px;">#{sos.sos_id}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:13px;">Triggered At</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-size:13px;">{ts}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#9ca3af;font-size:13px;">Severity</td>
          <td style="padding:8px 12px;font-size:13px;">
            <span style="background:{severity_color}22;color:{severity_color};padding:3px 10px;border-radius:20px;font-weight:700;font-size:12px;">{severity}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Location -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#f3f4f6;font-size:16px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">📍 Location</h2>
      <p style="color:#d1d5db;margin:0 0 12px;font-size:14px;">{location_text}</p>
      {f'<a href="{maps_link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">🗺 Open in Google Maps</a>' if maps_link else ''}
    </div>

    <!-- Medical Wallet -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#f3f4f6;font-size:16px;margin:0 0 16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🏥 Medical Wallet</h2>
      <table style="width:100%;border-collapse:collapse;">
        {wallet_rows if wallet_rows else '<tr><td colspan="2" style="padding:8px;color:#6b7280;font-size:13px;">No medical wallet on file.</td></tr>'}
      </table>
    </div>

    <!-- AI Assessment -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#f3f4f6;font-size:16px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🤖 AI Emergency Assessment</h2>
      <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 12px;">{ai_understanding}</p>
      <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:8px;padding:12px 16px;">
        <p style="color:#93c5fd;font-size:13px;font-weight:600;margin:0 0 6px;">Call Summary</p>
        <p style="color:#cbd5e1;font-size:13px;line-height:1.5;margin:0;">{call_summary}</p>
      </div>
    </div>

    <!-- Transcript -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <h2 style="color:#f3f4f6;font-size:16px;margin:0 0 16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">📞 AI Voice Call Transcript</h2>
      {transcript_html}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;">
      <p style="color:#4b5563;font-size:12px;margin:0;">This is an automated emergency notification from <strong style="color:#6b7280;">LifeLink AI</strong>.</p>
      <p style="color:#4b5563;font-size:12px;margin:4px 0 0;">Do not reply to this email. If this is a false alarm, please contact the patient directly.</p>
    </div>

  </div>
</body>
</html>"""


def _send_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level SMTP send. Falls back gracefully to simulation mode when SMTP credentials are not configured."""
    if not _SMTP_READY:
        logger.info(
            "[EMAIL SIMULATED — configure SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD in .env for live delivery] To: %s | Subject: %s",
            to_email,
            subject,
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, to_email, msg.as_string())

        logger.info("[EMAIL SENT] To: %s | Subject: %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("[EMAIL FAILED] To: %s | Error: %s", to_email, e)
        return False


class EmailService:

    @staticmethod
    def send_sos_transcript_emails(db: Session, sos_id: int) -> dict:
        """
        Main entry point. Fetches SOS context and sends email to:
          - Patient (user.email)
          - All emergency contacts with a non-empty email
        Returns a summary dict.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first()
        if not sos:
            logger.warning("EmailService: SOS %s not found.", sos_id)
            return {"sent": 0, "errors": 1}

        user: Optional[User] = db.query(User).filter(User.user_id == sos.user_id).first()
        if not user:
            logger.warning("EmailService: User not found for SOS %s.", sos_id)
            return {"sent": 0, "errors": 1}

        wallet: Optional[EmergencyWallet] = (
            db.query(EmergencyWallet)
            .filter(EmergencyWallet.user_id == sos.user_id)
            .first()
        )

        html = _build_html(sos, user, wallet)
        subject = f"🚨 LifeLink SOS Alert — {user.full_name} (SOS #{sos_id})"

        sent = 0
        errors = 0
        recipients = []

        # 1. Patient email
        if user.email:
            recipients.append(("patient", user.email))

        # 2. Emergency contacts with email
        contacts = (
            db.query(EmergencyContact)
            .filter(EmergencyContact.user_id == sos.user_id)
            .all()
        )
        for contact in contacts:
            if contact.email and contact.email.strip():
                recipients.append((f"contact:{contact.name}", contact.email.strip()))

        if not recipients:
            logger.warning(
                "EmailService: No email recipients for SOS %s (patient=%s, contacts=%d)",
                sos_id, user.email, len(contacts)
            )
            return {"sent": 0, "errors": 0, "note": "No email recipients registered."}

        for label, email_addr in recipients:
            ok = _send_smtp(email_addr, subject, html)
            if ok:
                sent += 1
            else:
                errors += 1

        # Mark as sent in DB
        if sent > 0:
            from sqlalchemy.sql import func
            sos.email_sent = 1
            sos.email_sent_at = datetime.utcnow()
            db.commit()

        logger.info(
            "EmailService complete | sos=%s sent=%d errors=%d recipients=%s",
            sos_id, sent, errors, [r[1] for r in recipients]
        )
        return {"sent": sent, "errors": errors, "recipients": [r[1] for r in recipients]}
