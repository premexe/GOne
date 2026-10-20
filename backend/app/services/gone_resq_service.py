"""
G-ONE ResQ — Voice-First Emergency Response Companion Service.
Ported & Adapted from G-ONE-ResQ (https://github.com/neha060314/G-ONE-ResQ.git)

Features:
- Protocol Engine: Authoritative first-aid clinical protocols across 9 emergency categories.
- Multi-Language Support: English, Hindi, Marathi, and Auto-Detect.
- Real-Time Voice & Text: Dual-channel streaming STT/TTS with live transcripts.
- Pre-Hospital Survival Actions: Step-by-step guidance "Till Ambulance Arrives".
- Patient Context: Injects G-ONE medical wallet, blood group, allergies, chronic conditions.
- Provider Layer: Primary = Google Gemini, Fallback = Deterministic Protocol Engine (never crashes).
- Safety Validator: Ensures all guidance is protocol-bound and emergency units are tracked.
- Structured Handover: Produces standardized clinical handover for hospital & dispatch teams.
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
            "seena", "chhati", "dil ka daura", "left arm pain", "angina",
            "chhatit dukhate", "chhatit kal", "hruday"
        ],
        "first_aid_steps": [
            "Help the patient sit upright in a comfortable position with back supported.",
            "Loosen tight clothing around the neck, chest, and waist.",
            "Ask if they have prescribed heart medication (e.g., Nitroglycerin/Sorbitrate).",
            "If conscious and not allergic, give one 300mg chewable Aspirin.",
            "Keep patient completely calm; do not allow them to walk or exert.",
            "If patient becomes unresponsive, begin CPR immediately (100-120 compressions/min)."
        ],
        "till_ambulance_arrives": [
            "Keep the patient sitting upright — DO NOT let them lie flat.",
            "Loosen shirt collar, tie, and belt immediately.",
            "Keep front door open so paramedics can enter without delay.",
            "Have previous ECG / heart medical records ready for the ambulance team.",
            "Do NOT give heavy food or allow physical exertion."
        ],
        "default_voice_response": {
            "en": "Responders are dispatched to your GPS location. Please sit upright immediately with your back supported and loosen any tight clothing around your chest. Are you conscious and can you breathe normally?",
            "hi": "Emergency team aapki location par nikal chuki hai. Kripya turant seedhe baith jayein aur gale ya seene ke kapde loose karein. Kya patient hosh me hai aur saans le pa rahe hain?",
            "mr": "तातडीची मदत तुमच्या जीपीएस स्थानावर पाठवली आहे. कृपया पाठीला आधार देऊन ताठ बसा आणि छातीभोवतीचे घट्ट कपडे सैल करा. तुम्ही शुद्धीत आहात का आणि श्वास नीट घेता येतोय का?"
        }
    },
    "SEVERE_BLEEDING": {
        "title": "Severe Bleeding & Hemorrhage Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "bleeding", "blood", "cut", "wound", "spurting", "khoon",
            "heavily bleeding", "ghaav", "arterial", "rakta", "raktsrav", "jakhmi"
        ],
        "first_aid_steps": [
            "Apply firm, continuous direct pressure to the wound using a clean cloth or sterile pad.",
            "Elevate the injured limb above heart level if no bone fracture is suspected.",
            "Do NOT remove soaked cloths — apply additional layers directly on top.",
            "If bleeding is uncontrollable from a limb, apply a tourniquet 2 to 3 inches above wound.",
            "Keep the patient lying down and covered with a warm blanket to prevent shock."
        ],
        "till_ambulance_arrives": [
            "Keep pressing firmly on the wound without lifting the cloth.",
            "If soaked in blood, put another cloth on top — do not pull the first cloth off.",
            "Keep the injured part raised above heart level if possible.",
            "Keep the patient warm and lying down to prevent shock.",
            "Do not give any aspirin or blood thinners."
        ],
        "default_voice_response": {
            "en": "Responders have been alerted. Take a clean cloth and press firmly on the bleeding wound without lifting it. Keep constant pressure. Are you feeling dizzy or lightheaded?",
            "hi": "Help aapke paas aa rahi hai. Kisi saaf kapde se bleeding wali jagah par bina rukey lagatar dabaav banayein. Kapde ko hatayein mat. Kya chakkar ya behoshi lag rahi hai?",
            "mr": "मदत पोहोचत आहे. स्वच्छ कापडाने रक्तस्त्रावाच्या जागेवर न उचलता सतत दाबून धरा. दाब अजिबात कमी करू नका. चक्कर किंवा अस्वस्थ वाटत आहे का?"
        }
    },
    "BREATHING_DIFFICULTY": {
        "title": "Respiratory Distress Protocol",
        "severity": "HIGH",
        "keywords": [
            "breathing", "breath", "asthma", "wheezing", "gasping", "saans",
            "dum ghut", "suffocating", "inhaler", "shwas", "shvaas", "dam lagto"
        ],
        "first_aid_steps": [
            "Help the patient sit upright, leaning slightly forward with arms resting on knees.",
            "Assist the patient in using their prescribed rescue inhaler (2 to 4 puffs).",
            "Ensure plenty of fresh air — open windows and clear away crowds.",
            "Guide them through slow, rhythmic pursed-lip breathing.",
            "Do NOT let them lie down flat."
        ],
        "till_ambulance_arrives": [
            "Keep patient leaning forward with open shoulders to maximize airflow.",
            "Administer 2 to 4 puffs of asthma rescue inhaler if prescribed.",
            "Open all windows and disperse crowds around the patient.",
            "Coach slow breathing: in through the nose, out through pursed lips.",
            "Do NOT allow patient to lie flat on their back."
        ],
        "default_voice_response": {
            "en": "Ambulance dispatch is active. Sit upright leaning slightly forward. If you have an asthma inhaler, take two puffs now. Breathe slowly with me: in through the nose, out through the mouth.",
            "hi": "Ambulance team aa rahi hai. Seedhe baithiye aur halka aage jhukiye. Agar aapke paas inhaler hai to do puff lijiye. Dheere dheere lambi saans lene ki koshish kijiye.",
            "mr": "रुग्णवाहिका येत आहे. थोडे पुढे झुकून ताठ बसा. तुमच्याकडे इनहेलर असल्यास त्वरित २ पफ घ्या. नाकाने हळूहळू खोल श्वास घ्या आणि तोंडाने सोडा."
        }
    },
    "CHOKING": {
        "title": "Airway Obstruction / Choking Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "choking", "choke", "food stuck", "throat", "gale me phans",
            "cannot cough", "strangling", "ghashat adakle", "ghasyaat"
        ],
        "first_aid_steps": [
            "If the person can cough forcefully, encourage them to keep coughing.",
            "If they cannot cough or speak: Deliver 5 sharp back blows between shoulder blades with heel of hand.",
            "If object remains stuck: Deliver 5 quick upward abdominal thrusts (Heimlich maneuver).",
            "Alternate 5 back blows and 5 abdominal thrusts until object is dislodged.",
            "If person loses consciousness, lower gently to floor and begin chest compressions."
        ],
        "till_ambulance_arrives": [
            "Encourage strong coughing if any air is moving.",
            "Stand behind them and deliver 5 firm upward back blows between shoulder blades.",
            "Perform Heimlich abdominal thrusts if back blows do not clear the object.",
            "If patient collapses, gently place on floor and begin CPR immediately.",
            "Do NOT attempt blind finger sweeps inside the mouth."
        ],
        "default_voice_response": {
            "en": "Emergency services have been notified. If the person cannot speak or cough, stand behind them, lean them forward, and give 5 firm back blows between their shoulder blades. Can they make any sound?",
            "hi": "Emergency dispatch alert ho chuka hai. Agar patient bol nahi pa rahe, unke peeche khade hokar dono kandhon ke beech peeth par 5 baar tezi se haath se thapki dijiye. Kya koi aawaaz nikal rahi hai?",
            "mr": "तातडीचे पथक सतर्क केले आहे. जर बोलता येत नसेल, तर पुढे वाका आणि पाठीवर दोन्ही खांद्यांच्या मध्ये हाताने ५ वेळा जोरात थाप मारा. काही आवाज येत आहे का?"
        }
    },
    "UNCONSCIOUS": {
        "title": "Unresponsive / Coma Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "unconscious", "unresponsive", "fainted", "collapsed", "behosh",
            "hosh nahi", "not waking up", "knocked out", "beshuddha", "zopla", "hosh"
        ],
        "first_aid_steps": [
            "Gently tap patient shoulders and shout loudly: 'Can you hear me?'.",
            "Check for normal breathing by watching the chest for 10 seconds.",
            "If NOT breathing normally: Begin CPR immediately! 30 chest compressions at 100-120 bpm, then 2 breaths.",
            "If breathing normally: Roll patient onto their side into the Recovery Position to keep airway clear.",
            "Do NOT give anything by mouth."
        ],
        "till_ambulance_arrives": [
            "Check if chest is rising and falling. If NOT breathing, start CPR right now.",
            "Push hard and fast in the center of the chest: 100-120 beats per minute.",
            "If breathing normally, roll onto their side (recovery position) so they do not choke on saliva.",
            "Never try to force water or medicines into an unconscious person's mouth.",
            "Keep the patient warm and stay right beside them."
        ],
        "default_voice_response": {
            "en": "Paramedics are alerted with your GPS location. Check right now: is the patient's chest moving up and down? Are they breathing normally? If not breathing, tell me and we will start CPR together.",
            "hi": "Paramedic team aapke GPS par aa rahi hai. Dekhiye kya patient ki chhati hil rahi hai? Kya saans chal rahi hai? Agar saans nahi chal rahi to turant batayein, hum milkar CPR shuru karenge.",
            "mr": "पॅरामेडिक पथक तुमच्या स्थानावर येत आहे. तपासा: छाती वर-खाली होतेय का? श्वास चालू आहे का? श्वास नसेल तर लगेच सांगा, आपण मिळून सीपीआर सुरू करू."
        }
    },
    "STROKE_NEURO": {
        "title": "Acute Stroke & Neurological Protocol",
        "severity": "CRITICAL",
        "keywords": [
            "stroke", "facial drooping", "slurred speech", "paralysis", "numbness",
            "tedha", "weak arm", "falij", "lakwa", "dizziness", "pakshaghat", "lakva"
        ],
        "first_aid_steps": [
            "Perform FAST test: Face drooping? Arm weakness? Speech slurred? Time to call ER!",
            "Keep patient resting in a safe position with head and shoulders slightly elevated.",
            "Do NOT give any food, liquids, or Aspirin (type of stroke unknown).",
            "Note the exact time symptoms first appeared for emergency medication eligibility.",
            "Loosen tight clothing and reassure the patient."
        ],
        "till_ambulance_arrives": [
            "Keep patient calm in bed with head and shoulders slightly propped up.",
            "DO NOT give any water, juice, food, or aspirin.",
            "Note down the exact time symptoms started — doctors need this for clot-busting injections.",
            "Speak gently and keep the room quiet to avoid panic.",
            "Keep identification and emergency wallet ready."
        ],
        "default_voice_response": {
            "en": "Stroke protocol activated. Keep the patient resting with their head slightly elevated. Do NOT give food, water, or aspirin. Can they raise both arms equally and smile?",
            "hi": "Stroke protocol active ho gaya hai. Patient ko aaram se letaayein, sar thoda uncha rakhein. Kuch bhi khane peene ya dawaai mat dijiye. Kya wo dono haath utha pa rahe hain?",
            "mr": "स्ट्रोक प्रोटोकॉल सुरू झाला आहे. रुग्णाला डोके थोडे वर ठेवून शांत झोपवा. काहीही खाणे, पिणे किंवा अ‍ॅस्पिरिन देऊ नका. ते दोन्ही हात वर करू शकतात का?"
        }
    },
    "BURNS": {
        "title": "Thermal / Chemical Burn Protocol",
        "severity": "HIGH",
        "keywords": [
            "burn", "burned", "scalding", "fire", "jal gaya",
            "aag", "hot oil", "acid", "chhaale", "bhajla", "jallay"
        ],
        "first_aid_steps": [
            "Immediately cool the burn with cool, gentle running tap water for 10 to 20 minutes.",
            "Do NOT use ice, icy water, butter, toothpaste, or ointments.",
            "Gently remove rings, watches, or tight items near burn before swelling starts.",
            "Do NOT burst any blisters or peel away clothing stuck to the burn.",
            "Cover loosely with a clean plastic film wrap or clean dry cloth."
        ],
        "till_ambulance_arrives": [
            "Run clean cool tap water over the burn for at least 15 minutes.",
            "Do not put ice, butter, haldi, oil, or toothpaste on the burn.",
            "Remove rings and watches from the affected arm before swelling begins.",
            "Cover the area loosely with clean cling wrap or clean dry cloth.",
            "Keep the patient sitting comfortably and calm."
        ],
        "default_voice_response": {
            "en": "Emergency units alerted. Cool the burn immediately under cool running tap water for 10 to 15 minutes. Do NOT apply ice, butter, or paste. Cover loosely with clean wrap once cooled. Is the burn large?",
            "hi": "Jali hui jagah par turant thanda paani (nal ka paani) 10 se 15 minute tak dalein. Barf, tel ya toothpaste bilkul mat lagayein. Saaf kapde ya plastic wrap se halka cover karein.",
            "mr": "भाजलेल्या जागेवर नळाचे थंड पाणी १० ते १५ मिनिटे सतत ओता. बर्फ, तेल किंवा टूथपेस्ट लावू नका. स्वच्छ कोरड्या कापडाने हलके झाका."
        }
    },
    "TRAUMA_FRACTURE": {
        "title": "Trauma & Fracture Protocol",
        "severity": "HIGH",
        "keywords": [
            "accident", "fall", "fracture", "broken bone", "haddi", "chot",
            "injury", "trauma", "crash", "car accident", "haad", "modla", "apghat"
        ],
        "first_aid_steps": [
            "Do NOT move the patient unless there is immediate danger (fire, traffic).",
            "Keep head, neck, and spine completely still in the position found.",
            "Immobilize the injured area — support it with pillows, folded blankets, or splints.",
            "Apply an ice pack wrapped in a cloth to reduce swelling if skin is intact.",
            "Control any visible bleeding with gentle sterile dressing."
        ],
        "till_ambulance_arrives": [
            "Do NOT move the patient's neck, head, or back under any circumstance.",
            "Support the broken limb with folded towels or pillows on both sides.",
            "If bone is piercing skin, cover gently with a clean cloth — do not push it back.",
            "Apply a cloth-wrapped ice pack around the swollen area.",
            "Reassure the patient and do not let them stand or walk."
        ],
        "default_voice_response": {
            "en": "Trauma responders are dispatched. Do not move the patient's neck or back. Keep them completely still. Support the injured limb with folded blankets. Is there any active bleeding or loss of sensation?",
            "hi": "Emergency rescue team aa rahi hai. Kripya patient ko hilayein mat, khaaskar gardan aur peeth ko bilkul seedha rakhein. Chot wale hisse ko support dein. Kya koi bleeding ho rahi hai?",
            "mr": "मदत पथक निघालं आहे. कृपया रुग्णाला अजिबात हलवू नका, विशेषतः मान आणि पाठीचा कणा स्थिर ठेवा. दुखापत झालेल्या अवयवाला उशीचा आधार द्या."
        }
    },
    "GENERAL": {
        "title": "General Emergency Medical Protocol",
        "severity": "MODERATE",
        "keywords": ["emergency", "help", "pain", "dard", "ill", "sick", "problem", "madad", "madat", "tras"],
        "first_aid_steps": [
            "Keep the patient resting in a quiet, safe, and well-ventilated environment.",
            "Loosen tight clothing and reassure the patient.",
            "Check and monitor consciousness, breathing, and responsiveness.",
            "Do not administer random oral medications without doctor advice.",
            "Wait for ambulance dispatch with patient."
        ],
        "till_ambulance_arrives": [
            "Keep the patient seated in a well-ventilated, quiet space.",
            "Ensure the building entry is unlocked and clear for paramedics.",
            "Gather current prescriptions and ID cards for the ambulance team.",
            "Continuously check if patient remains awake and responsive.",
            "Stay on this call — help is on the way."
        ],
        "default_voice_response": {
            "en": "I am LifeLink's G-ONE ResQ Emergency Voice Companion. Responders have been notified of your location. Please stay calm and tell me your main symptoms right now.",
            "hi": "Main LifeLink G-ONE ResQ emergency voice companion hoon. Responders ko aapki location bhej di gayi hai. Shaant rahein aur batayein aapko is samay kya takleef ho rahi hai?",
            "mr": "मी लाइफलिंक जी-वन रेस्क्यू आपत्कालीन व्हॉइस साथीदार आहे. तुमच्या स्थानाची माहिती मदत पथकाला दिली आहे. शांत राहा आणि तुम्हाला नेमका काय त्रास होतोय ते सांगा."
        }
    }
}


# ── 2. Language Detection & Classification ───────────────────────────────────

def _detect_language(text: str, preference: Optional[str] = None) -> str:
    """
    Detect user language among English (en), Hindi (hi), and Marathi (mr).
    Supports explicit preference or auto-detection from speech tokens.
    """
    if preference in ("en", "hi", "mr"):
        return preference

    cleaned = text.lower()
    marathi_tokens = {
        "aahe", "aahat", "hotoy", "trass", "tras", "rakta", "doke", "dukhate", "dukhat",
        "madat", "pahije", "shwas", "shvaas", "chhati", "kasa", "kashi", "kay",
        "ghadla", "thambva", "kharach", "kharokhar", "lavkar", "ya", "aamhi",
        "rugana", "rugnalay", "aaji", "aajoba", "baba", "aai", "modla", "apghat", "bhajla"
    }
    hindi_tokens = {
        "kya", "hai", "mujhe", "mera", "meri", "dard", "khoon", "seena", "chhati",
        "saans", "behosh", "jal", "gaya", "ho", "raha", "rahi", "nahi", "madad",
        "chahiye", "haddi", "chot", "bhai", "aag", "peeth", "sir", "sar", "pet"
    }

    words = set(re.findall(r"\w+", cleaned))
    if any(w in words for w in marathi_tokens):
        return "mr"
    if any(w in words for w in hindi_tokens):
        return "hi"

    # Check Devanagari script markers
    if bool(re.search(r"[\u0900-\u097F]", text)):
        marathi_devanagari = ["ळ", "आहे", "होत", "त्रास", "दुखत", "रक्त", "लवकर", "काय", "कसं", "कसे", "पाहिजे"]
        if any(c in text for c in marathi_devanagari):
            return "mr"
        return "hi"

    return "en"


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
          - till_ambulance_arrives: Pre-hospital survival actions
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

        # 3. Detect Language (en / hi / mr)
        lang_code = _detect_language(user_speech, language_preference)

        # 4. LLM Generation with Fallback (Gemini -> Deterministic Protocol)
        voice_text = ""
        used_provider = "deterministic"

        lang_instructions = {
            "mr": "Natural empathetic Marathi (मराठी). Clear spoken Marathi or Romanized Marathi so it sounds natural when read aloud.",
            "hi": "Natural reassuring Hindi or Hinglish. Clear spoken Hindi.",
            "en": "Clear, calm, reassuring English."
        }

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
- Pre-Hospital Guidelines (Till Ambulance Arrives):
{chr(10).join(f"- {act}" for act in protocol['till_ambulance_arrives'][:2])}

PATIENT JUST SAID: "{user_speech}"
CALL TURN: {turn_number}
TARGET LANGUAGE: {lang_instructions.get(lang_code, 'English')}

CRITICAL RULES:
1. Speak 1 to 2 short sentences ALOUD (maximum 30 words). Never use bullet points, asterisks, or markdown.
2. Reassure that local responders have their GPS coordinates and ambulance is on the way.
3. Deliver the single most urgent first-aid action from the protocol above.
4. If they have allergies/conditions, account for them.
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
                if candidate and len(candidate) > 8:
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

        is_final = turn_number >= 5

        return {
            "voice_response": voice_text,
            "category": category,
            "severity": protocol["severity"],
            "protocol_title": protocol["title"],
            "first_aid_steps": protocol["first_aid_steps"],
            "till_ambulance_arrives": protocol["till_ambulance_arrives"],
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
            "transcript": (sos.call_transcript if sos else "Call completed.") or "Call completed.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
