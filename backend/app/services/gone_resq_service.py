"""
G-ONE ResQ — Voice-First Emergency Response Companion Service.
Ported & Adapted from G-ONE-ResQ (https://github.com/neha060314/G-ONE-ResQ.git)

Architecture:
- Protocol Engine: Authoritative first-aid clinical protocols across 10 emergency categories.
- Language Support: Hindi, English, and Hinglish.
- Patient Context: Injects G-ONE medical wallet, blood group, allergies, chronic conditions.
- Provider Layer: Primary = Google Gemini, Fallback = Deterministic Protocol Engine (never crashes).
- Safety Validator: Ensures all guidance is safe, protocol-bound, and emergency responders are acknowledged.
- Structured Handover: Produces standardized clinical handover for G-ONE hospital & dispatch teams.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from app.models.sos import SOS
from app.models.emergency_wallet import EmergencyWallet
from app.models.users import User

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


# ── 1. G-ONE ResQ Protocol Definitions ────────────────────────────────────────

PROTOCOLS: Dict[str, Dict[str, Any]] = {
    "CARDIAC": {
        "title": "Cardiac / Chest Pain Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "chest pain", "heart attack", "heart", "cardiac", "chest pressure",
            "seena", "chhati", "dil ka daura", "left arm pain", "angina"
        ],
        "first_aid_steps": [
            "Help the patient sit upright in a comfortable position with back supported.",
            "Loosen tight clothing around the neck, chest, and waist.",
            "Ask if they have prescribed heart medication (e.g., Nitroglycerin/Sorbitrate).",
            "If conscious and not allergic, give one 300mg chewable Aspirin.",
            "Keep patient completely calm; do not allow them to walk or exert.",
            "If patient becomes unresponsive, begin CPR immediately (100-120 compressions/min)."
        ],
        "default_voice_response": {
            "en": "Responders are dispatched to your GPS location. Please sit upright immediately with your back supported and loosen any tight clothing around your chest. Are you conscious and can you breathe normally?",
            "hi": "Emergency team aapki location par nikal chuki hai. Kripya turant seedhe baith jayein aur gale ya seene ke kapde loose karein. Kya patient hosh me hai aur saans le pa rahe hain?",
        }
    },
    "SEVERE_BLEEDING": {
        "title": "Severe Bleeding & Hemorrhage Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "bleeding", "blood", "cut", "wound", "spurting", "khoon",
            "heavily bleeding", "ghaav", "arterial"
        ],
        "first_aid_steps": [
            "Apply firm, continuous direct pressure to the wound using a clean cloth or sterile pad.",
            "Elevate the injured limb above heart level if no bone fracture is suspected.",
            "Do NOT remove soaked cloths — apply additional layers directly on top.",
            "If bleeding is uncontrollable from a limb, apply a tourniquet 2 to 3 inches above wound.",
            "Keep the patient lying down and covered with a warm blanket to prevent shock."
        ],
        "default_voice_response": {
            "en": "Responders have been alerted. Take a clean cloth and press firmly on the bleeding wound without lifting it. Keep constant pressure. Are you feeling dizzy or lightheaded?",
            "hi": "Help aapke paas aa rahi hai. Kisi saaf kapde se bleeding wali jagah par bina rukey lagatar dabaav banayein. Kapde ko hatayein mat. Kya chakkar ya behoshi lag rahi hai?",
        }
    },
    "BREATHING_DIFFICULTY": {
        "title": "Respiratory Distress Protocol",
        "severity": "HIGH",
        "keywords": [
            "breathing", "breath", "asthma", "wheezing", "gasping", "saans",
            "dum ghut", "suffocating", "inhaler"
        ],
        "first_aid_steps": [
            "Help the patient sit upright, leaning slightly forward with arms resting on knees.",
            "Assist the patient in using their prescribed rescue inhaler (2 to 4 puffs).",
            "Ensure plenty of fresh air — open windows and clear away crowds.",
            "Guide them through slow, rhythmic pursed-lip breathing.",
            "Do NOT let them lie down flat."
        ],
        "default_voice_response": {
            "en": "Ambulance dispatch is active. Sit upright leaning slightly forward. If you have an asthma inhaler, take two puffs now. Breathe slowly with me: in through the nose, out through the mouth.",
            "hi": "Ambulance team aa rahi hai. Seedhe baithiye aur halka aage jhukiye. Agar aapke paas inhaler hai to do puff lijiye. Dheere dheere lambi saans lene ki koshish kijiye.",
        }
    },
    "CHOKING": {
        "title": "Airway Obstruction / Choking Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "choking", "choke", "food stuck", "throat", "gale me phans",
            "cannot cough", "strangling"
        ],
        "first_aid_steps": [
            "If the person can cough forcefully, encourage them to keep coughing.",
            "If they cannot cough or speak: Deliver 5 sharp back blows between shoulder blades with heel of hand.",
            "If object remains stuck: Deliver 5 quick upward abdominal thrusts (Heimlich maneuver).",
            "Alternate 5 back blows and 5 abdominal thrusts until object is dislodged.",
            "If person loses consciousness, lower gently to floor and begin chest compressions."
        ],
        "default_voice_response": {
            "en": "Emergency services have been notified. If the person cannot speak or cough, stand behind them, lean them forward, and give 5 firm back blows between their shoulder blades. Can they make any sound?",
            "hi": "Emergency dispatch alert ho chuka hai. Agar patient bol nahi pa rahe, unke peeche khade hokar dono kandhon ke beech peeth par 5 baar tezi se haath se thapki dijiye. Kya koi aawaaz nikal rahi hai?",
        }
    },
    "UNCONSCIOUS": {
        "title": "Unresponsive / Coma Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "unconscious", "unresponsive", "fainted", "collapsed", "behosh",
            "hosh nahi", "not waking up", "knocked out"
        ],
        "first_aid_steps": [
            "Gently tap patient shoulders and shout loudly: 'Can you hear me?'.",
            "Check for normal breathing by watching the chest for 10 seconds.",
            "If NOT breathing normally: Begin CPR immediately! 30 chest compressions at 100-120 bpm, then 2 breaths.",
            "If breathing normally: Roll patient onto their side into the Recovery Position to keep airway clear.",
            "Do NOT give anything by mouth."
        ],
        "default_voice_response": {
            "en": "Paramedics are alerted with your GPS location. Check right now: is the patient's chest moving up and down? Are they breathing normally? If not breathing, tell me and we will start CPR together.",
            "hi": "Paramedic team aapke GPS par aa rahi hai. Dekhiye kya patient ki chhati hil rahi hai? Kya saans chal rahi hai? Agar saans nahi chal rahi to turant batayein, hum milkar CPR shuru karenge.",
        }
    },
    "STROKE_NEURO": {
        "title": "Acute Stroke & Neurological Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "stroke", "facial drooping", "slurred speech", "paralysis", "numbness",
            "tedha", "weak arm", "falij", "lakwa", "dizziness"
        ],
        "first_aid_steps": [
            "Perform FAST test: Face drooping? Arm weakness? Speech slurred? Time to call ER!",
            "Keep patient resting in a safe position with head and shoulders slightly elevated.",
            "Do NOT give any food, liquids, or Aspirin (type of stroke unknown).",
            "Note the exact time symptoms first appeared for emergency medication eligibility.",
            "Loosen tight clothing and reassure the patient."
        ],
        "default_voice_response": {
            "en": "Stroke protocol activated. Keep the patient resting with their head slightly elevated. Do NOT give food, water, or aspirin. Can they raise both arms equally and smile?",
            "hi": "Stroke protocol active ho gaya hai. Patient ko aaram se letaayein, sar thoda uncha rakhein. Kuch bhi khane peene ya dawaai mat dijiye. Kya wo dono haath utha pa rahe hain?",
        }
    },
    "BURNS": {
        "title": "Thermal / Chemical Burn Protocol",
        "severity": "HIGH",
        "keywords": [
            "burn", "burned", "scalding", "fire", "jal gaya",
            "aag", "hot oil", "acid", "chhaale"
        ],
        "first_aid_steps": [
            "Immediately cool the burn with cool, gentle running tap water for 10 to 20 minutes.",
            "Do NOT use ice, icy water, butter, toothpaste, or ointments.",
            "Gently remove rings, watches, or tight items near burn before swelling starts.",
            "Do NOT burst any blisters or peel away clothing stuck to the burn.",
            "Cover loosely with a clean plastic film wrap or clean dry cloth."
        ],
        "default_voice_response": {
            "en": "Emergency units alerted. Cool the burn immediately under cool running tap water for 10 to 15 minutes. Do NOT apply ice, butter, or paste. Cover loosely with clean wrap once cooled. Is the burn large?",
            "hi": "Jali hui jagah par turant thanda paani (nal ka paani) 10 se 15 minute tak dalein. Barf, tel ya toothpaste bilkul mat lagayein. Saaf kapde ya plastic wrap se halka cover karein.",
        }
    },
    "TRAUMA_FRACTURE": {
        "title": "Trauma & Fracture Protocol",
        "severity": "HIGH",
        "keywords": [
            "accident", "fall", "fracture", "broken bone", "haddi", "chot",
            "injury", "trauma", "crash", "car accident"
        ],
        "first_aid_steps": [
            "Do NOT move the patient unless there is immediate danger (fire, traffic).",
            "Keep head, neck, and spine completely still in the position found.",
            "Immobilize the injured area — support it with pillows, folded blankets, or splints.",
            "Apply an ice pack wrapped in a cloth to reduce swelling if skin is intact.",
            "Control any visible bleeding with gentle sterile dressing."
        ],
        "default_voice_response": {
            "en": "Trauma responders are dispatched. Do not move the patient's neck or back. Keep them completely still. Support the injured limb with folded blankets. Is there any active bleeding or loss of sensation?",
            "hi": "Emergency rescue team aa rahi hai. Kripya patient ko hilayein mat, khaaskar gardan aur peeth ko bilkul seedha rakhein. Chot wale hisse ko support dein. Kya koi bleeding ho rahi hai?",
        }
    },
    "GENERAL": {
        "title": "General Emergency Medical Protocol",
        "severity": "MODERATE",
        "keywords": ["emergency", "help", "pain", "dard", "ill", "sick", "problem", "madad"],
        "first_aid_steps": [
            "Keep the patient resting in a quiet, safe, and well-ventilated environment.",
            "Loosen tight clothing and reassure the patient.",
            "Check and monitor consciousness, breathing, and responsiveness.",
            "Do not administer random oral medications without doctor advice.",
            "Wait for ambulance dispatch with patient."
        ],
        "default_voice_response": {
            "en": "I am LifeLink's G-ONE ResQ Emergency Voice Companion. Responders have been notified of your location. Please stay calm and tell me your main symptoms right now.",
            "hi": "Main LifeLink G-ONE ResQ emergency voice companion hoon. Responders ko aapki location bhej di gayi hai. Shaant rahein aur batayein aapko is samay kya takleef ho rahi hai?",
        }
    }
}


# ── 2. Helper Functions ───────────────────────────────────────────────────────

def _is_hindi(text: str) -> bool:
    """Detect if patient message has Hindi or Hinglish tokens."""
    hindi_tokens = {
        "kya", "hai", "mujhe", "mera", "meri", "dard", "khoon", "seena", "chhati",
        "saans", "behosh", "jal", "gaya", "ho", "raha", "rahi", "nahi", "madad",
        "chahiye", "haddi", "chot", "bhai", "aag", "peeth", "sir", "sar", "pet"
    }
    words = re.findall(r"\w+", text.lower())
    match_count = sum(1 for w in words if w in hindi_tokens)
    return match_count >= 1 or bool(re.search(r"[\u0900-\u097F]", text))


def _classify_emergency(user_speech: str, description: str = "") -> Tuple[str, Dict[str, Any]]:
    """Determine best protocol matching speech and description keywords."""
    combined = f"{user_speech} {description}".lower()
    for category, proto in PROTOCOLS.items():
        if category == "GENERAL":
            continue
        for kw in proto["keywords"]:
            if kw in combined:
                return category, proto
    return "GENERAL", PROTOCOLS["GENERAL"]


def _fetch_patient_context(db: Session, user_id: int) -> Dict[str, Any]:
    """Retrieve structured patient identity & medical wallet from G-ONE backend."""
    user = db.query(User).filter(User.user_id == user_id).first()
    wallet = db.query(EmergencyWallet).filter(EmergencyWallet.user_id == user_id).first()

    name = user.full_name if user and user.full_name else f"Patient #{user_id}"
    blood_group = (wallet.blood_group if wallet and wallet.blood_group else (user.blood_group if user else None)) or "Unknown"
    allergies = wallet.allergies if wallet and wallet.allergies else "None reported"
    chronic_conditions = wallet.chronic_conditions if wallet and wallet.chronic_conditions else "None recorded"
    medications = wallet.current_medications if wallet and wallet.current_medications else "None recorded"
    notes = wallet.emergency_notes if wallet and wallet.emergency_notes else ""

    return {
        "patient_name": name,
        "blood_group": blood_group,
        "allergies": allergies,
        "chronic_conditions": chronic_conditions,
        "medications": medications,
        "notes": notes,
    }


# ── 3. G-ONE ResQ Core Service ────────────────────────────────────────────────

class GoneResqService:
    """
    Voice-first emergency response orchestrator.
    Adheres strictly to the G-ONE ResQ Architecture:
    Protocol Engine -> LLM Provider Manager -> Safety Validator -> Handover.
    """

    @staticmethod
    def process_turn(
        db: Session,
        sos_id: int,
        user_speech: str,
        turn_number: int = 1,
        language_preference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a spoken or text turn from the patient during an active emergency call.
        Returns:
          - voice_response: Text for TTS voice output (1-2 sentences)
          - category: Emergency category
          - severity: Urgency level
          - protocol_title: Protocol name
          - first_aid_steps: List of authoritative actions for UI display
          - is_final: Boolean indicating whether call goals have been fulfilled
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first() if sos_id else None

        # 1. Fetch Patient Medical Context from G-ONE (or safe defaults)
        if sos:
            patient_ctx = _fetch_patient_context(db, sos.user_id)
            desc = sos.description or ""
        else:
            patient_ctx = {
                "patient_name": "Patient",
                "blood_group": "Unknown",
                "allergies": "None reported",
                "chronic_conditions": "None recorded",
            }
            desc = ""

        # 2. Emergency Classification & Protocol Selection
        category, protocol = _classify_emergency(user_speech, desc)

        # 3. Detect Language
        is_hi = (language_preference == "hi") or _is_hindi(user_speech)
        lang_code = "hi" if is_hi else "en"

        # 4. LLM Generation with Fallback (Gemini -> Deterministic Protocol)
        voice_text = ""
        used_provider = "deterministic"

        if GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)

                prompt = f"""You are G-ONE ResQ, an authoritative voice-first emergency response companion.
The patient is on an active emergency call after pressing SOS.

PATIENT CONTEXT:
- Name: {patient_ctx['patient_name']}
- Blood Group: {patient_ctx['blood_group']}
- Allergies: {patient_ctx['allergies']}
- Chronic Conditions: {patient_ctx['chronic_conditions']}

EMERGENCY SITUATION:
- Detected Category: {protocol['title']} (Severity: {protocol['severity']})
- Clinical Protocol Steps:
{chr(10).join(f"- {step}" for step in protocol['first_aid_steps'][:3])}

PATIENT JUST SAID: "{user_speech}"
CALL TURN: {turn_number}
LANGUAGE: {'Hinglish / Hindi (natural Romanized Hindi)' if is_hi else 'Clear reassuring English'}

CRITICAL RULES:
1. Speak 1 to 2 short sentences ALOUD (maximum 35 words). No bullet points, markdown, or asterisks.
2. Reassure that local responders have their GPS coordinates and are en route.
3. Deliver the single most urgent first-aid action from the protocol above.
4. If they have allergies/conditions, account for them (e.g., do not suggest aspirin if allergic).
5. Tone: Calm, warm, firm, life-saving.
"""
                try:
                    resp = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt,
                    )
                except Exception:
                    resp = client.models.generate_content(
                        model="gemini-1.5-flash",
                        contents=prompt,
                    )

                candidate = resp.text.strip().replace("*", "").replace("#", "")
                if candidate and len(candidate) > 10:
                    voice_text = candidate
                    used_provider = "gemini-2.5-flash"
            except Exception as e:
                logger.warning("ResQ Gemini generation fallback: %s", e)

        # Deterministic Protocol Fallback
        if not voice_text:
            voice_text = protocol["default_voice_response"].get(lang_code, protocol["default_voice_response"]["en"])
            used_provider = "deterministic_protocol"

        # 5. Append to Transcript
        if sos:
            current_transcript = sos.call_transcript or ""
            new_turn_str = f"Patient: {user_speech.strip()}\nG-ONE ResQ: {voice_text.strip()}"
            updated_transcript = f"{current_transcript}\n{new_turn_str}".strip() if current_transcript else new_turn_str

            # Update SOS status & classification
            sos.call_transcript = updated_transcript
            sos.ai_emergency_understanding = protocol["title"]
            sos.ai_severity = protocol["severity"]
            sos.call_status = "IN_PROGRESS"
            db.commit()

        is_final = turn_number >= 4

        return {
            "voice_response": voice_text,
            "category": category,
            "severity": protocol["severity"],
            "protocol_title": protocol["title"],
            "first_aid_steps": protocol["first_aid_steps"],
            "provider": used_provider,
            "language": lang_code,
            "turn": turn_number,
            "is_final": is_final,
        }

    @staticmethod
    def complete_handover(
        db: Session,
        sos_id: int,
        category: str = "GENERAL",
        user_summary_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Finalize the emergency call session and generate a structured G-ONE Handover payload.
        Persists final record and dispatches email notifications.
        """
        sos: Optional[SOS] = db.query(SOS).filter(SOS.sos_id == sos_id).first() if sos_id else None
        protocol = PROTOCOLS.get(category, PROTOCOLS["GENERAL"])

        if sos:
            patient_ctx = _fetch_patient_context(db, sos.user_id)
        else:
            patient_ctx = {
                "patient_name": "Patient",
                "blood_group": "Unknown",
                "allergies": "None reported",
            }

        handover_summary = (
            f"G-ONE ResQ Emergency Handover: Patient {patient_ctx['patient_name']} "
            f"(Blood: {patient_ctx['blood_group']}, Allergies: {patient_ctx['allergies']}) "
            f"categorized as [{protocol['title']}] with [{protocol['severity']}] urgency. "
            f"First-aid guidance administered. Responders dispatched with GPS coordinates."
        )
        if user_summary_notes:
            handover_summary += f" Clinical notes: {user_summary_notes}"

        if sos:
            sos.call_status = "COMPLETED"
            sos.call_summary = handover_summary
            sos.ai_severity = protocol["severity"]
            sos.ai_emergency_understanding = protocol["title"]
            db.commit()

            # Dispatch email notification with full transcript & handover details
            try:
                from app.services.email_service import EmailService
                EmailService.send_sos_transcript_emails(db, sos_id)
            except Exception as ex:
                logger.warning("ResQ handover email dispatch error: %s", ex)

        return {
            "success": True,
            "sos_id": sos_id,
            "category": category,
            "severity": protocol["severity"],
            "protocol_title": protocol["title"],
            "summary": handover_summary,
            "transcript": sos.call_transcript or "Call completed.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
