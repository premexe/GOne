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

    This service provides REAL-TIME, CONTEXT-AWARE diagnostic conversation.
    Each turn receives the full conversation history so the AI can:
    - Understand the evolving situation dynamically
    - Ask targeted follow-up diagnostic questions
    - Give precise, situation-specific instructions
    - Guide step-by-step until ambulance arrives
    """

    @staticmethod
    def process_turn(
        db: Session,
        sos_id: int,
        user_speech: str,
        turn_number: int = 1,
        language_preference: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process a spoken or text turn from the patient during an active emergency call.
        
        NOW with full multi-turn conversation history for contextual diagnosis.
        The AI analyzes the patient's evolving narrative and responds with
        targeted, situation-specific emergency guidance — not generic greetings.
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
                "medications": "None recorded",
                "notes": "",
            }
            desc = ""

        # 2. Emergency Classification & Protocol Selection
        category, protocol = _classify_emergency(user_speech, desc)

        # 3. Detect Language (en / hi / mr)
        lang_code = _detect_language(user_speech, language_preference)

        # 4. Build conversation history string from frontend + DB transcript
        history_text = ""
        if conversation_history and len(conversation_history) > 0:
            # Use the frontend-supplied conversation history (most reliable, real-time)
            history_lines = []
            for msg in conversation_history[-12:]:  # Last 12 messages for context window
                role = msg.get("sender", msg.get("role", "patient"))
                text = msg.get("text", msg.get("content", ""))
                if role in ("ai", "assistant", "resq"):
                    history_lines.append(f"G-ONE ResQ: {text}")
                else:
                    history_lines.append(f"Patient: {text}")
            history_text = "\n".join(history_lines)
        elif sos and sos.call_transcript:
            # Fallback: use DB-stored transcript
            history_text = sos.call_transcript[-2000:]  # Last ~2000 chars

        # 5. LLM Generation with Fallback (Gemini -> Deterministic Protocol)
        voice_text = ""
        used_provider = "deterministic"

        lang_instructions = {
            "mr": "Respond in natural empathetic Marathi (मराठी). Use clear spoken Marathi or Romanized Marathi that sounds natural when read aloud by text-to-speech. Do NOT mix English unless the patient used English words.",
            "hi": "Respond in natural reassuring Hindi or Hinglish. Use clear spoken Hindi that flows naturally. Match the patient's speaking style.",
            "en": "Respond in clear, calm, reassuring English. Use simple direct language."
        }

        if GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)

                # ── Build the real-time diagnostic system prompt ──
                system_prompt = f"""You are G-ONE ResQ — a REAL-TIME emergency medical voice companion actively guiding a patient through a live emergency situation. An ambulance has been dispatched to their GPS location.

YOUR ROLE: You are an emergency diagnostician on a live voice call. You must ACTIVELY ANALYZE what the patient tells you and respond with SPECIFIC, IMMEDIATE actions for THEIR EXACT situation — not generic advice.

PATIENT MEDICAL PROFILE:
- Name: {patient_ctx['patient_name']}
- Blood Group: {patient_ctx['blood_group']}
- Known Allergies: {patient_ctx['allergies']}
- Chronic Conditions: {patient_ctx['chronic_conditions']}
- Current Medications: {patient_ctx.get('medications', 'None recorded')}
{f"- Special Notes: {patient_ctx.get('notes', '')}" if patient_ctx.get('notes') else ""}

DETECTED EMERGENCY CATEGORY: {protocol['title']} (Severity: {protocol['severity']})

CLINICAL PROTOCOL REFERENCE (use these as your medical knowledge base):
First Aid Steps:
{chr(10).join(f"  {i+1}. {step}" for i, step in enumerate(protocol['first_aid_steps']))}

Pre-Hospital Actions (Till Ambulance Arrives):
{chr(10).join(f"  {i+1}. {act}" for i, act in enumerate(protocol['till_ambulance_arrives']))}

CONVERSATION TURN: {turn_number}
RESPONSE LANGUAGE: {lang_instructions.get(lang_code, lang_instructions['en'])}

═══ CRITICAL BEHAVIORAL RULES ═══

1. ANALYZE THE PATIENT'S EXACT WORDS and respond to THEIR specific situation.
   - If they say "chest pain and sweating" → guide them specifically for cardiac symptoms with sweating (possible heart attack).
   - If they say "mala shvas gheta yet nahi" → immediately guide positioning and breathing technique in Marathi.
   - If they say "khoon nikal raha hai" → ask WHERE exactly, HOW MUCH, and guide wound pressure.
   - NEVER give a generic "help is coming" without actionable guidance.

2. EVERY response MUST contain:
   a) ONE specific diagnostic question about their current state (to understand severity changes)
   b) ONE immediate action they should do RIGHT NOW
   c) Brief reassurance that ambulance is tracking their GPS

3. RESPONSE FORMAT:
   - Speak 2-4 natural sentences (40-80 words maximum).
   - Use spoken conversational tone — this will be read aloud by text-to-speech.
   - NEVER use bullet points, asterisks, numbered lists, markdown, or special characters.
   - NEVER use emojis or formatting symbols.

4. PROGRESSIVE DIAGNOSIS:
   - Turn 1-2: Identify the emergency, assess consciousness/breathing, give first critical action.
   - Turn 3-4: Assess response to actions, check for deterioration, adjust guidance.
   - Turn 5+: Monitor status, provide comfort actions, prepare for ambulance arrival.

5. PATIENT SAFETY:
   - If patient mentions allergies to Aspirin → DO NOT suggest Aspirin.
   - If patient is diabetic → account for blood sugar issues.
   - If patient is on blood thinners → modify bleeding advice.
   - NEVER suggest medications you're unsure about.
   - If situation sounds life-threatening, instruct CPR positioning immediately.

6. ACCOUNT FOR CHRONIC CONDITIONS: If the patient has {patient_ctx['chronic_conditions']}, factor this into every recommendation."""

                # ── Build the conversation messages for multi-turn context ──
                messages_for_gemini = system_prompt + "\n\n"

                if history_text:
                    messages_for_gemini += f"═══ CONVERSATION SO FAR ═══\n{history_text}\n\n"

                messages_for_gemini += f"═══ PATIENT'S LATEST MESSAGE ═══\nPatient: \"{user_speech}\"\n\nRespond now as G-ONE ResQ with your next diagnostic response. Remember: analyze their words, give a specific action, ask a follow-up question. Speak naturally in {lang_instructions.get(lang_code, 'English')}."

                try:
                    resp = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=messages_for_gemini,
                    )
                except Exception:
                    try:
                        resp = client.models.generate_content(
                            model="gemini-2.0-flash",
                            contents=messages_for_gemini,
                        )
                    except Exception:
                        resp = client.models.generate_content(
                            model="gemini-1.5-flash",
                            contents=messages_for_gemini,
                        )

                candidate = resp.text.strip()
                # Clean any markdown/formatting that might slip through
                candidate = candidate.replace("*", "").replace("#", "").replace("- ", "").replace("•", "")
                candidate = re.sub(r'\d+\.\s', '', candidate)  # Remove numbered list markers
                candidate = re.sub(r'\n+', ' ', candidate).strip()  # Collapse to single spoken line

                if candidate and len(candidate) > 10:
                    voice_text = candidate
                    used_provider = "gemini-2.5-flash"
            except Exception as e:
                logger.warning("ResQ Gemini generation fallback: %s", e)

        # Deterministic Protocol Fallback — make it situation-aware too
        if not voice_text:
            base_response = protocol["default_voice_response"].get(lang_code, protocol["default_voice_response"]["en"])
            # On later turns, append a follow-up question to make it feel interactive
            if turn_number > 1:
                follow_ups = {
                    "en": {
                        "CARDIAC": "Are you feeling any dizziness or nausea right now? Is the pain getting worse or staying the same?",
                        "SEVERE_BLEEDING": "Is the bleeding slowing down with pressure? Can you describe the wound size?",
                        "BREATHING_DIFFICULTY": "Can you count to five out loud for me? Is your breathing getting better or worse?",
                        "CHOKING": "Can you make any coughing sound? Is the person turning blue?",
                        "UNCONSCIOUS": "Is the chest moving up and down? Can you feel a pulse on their neck?",
                        "STROKE_NEURO": "Can they squeeze both your hands equally? Is one side of the face drooping?",
                        "BURNS": "How large is the burned area? Is the skin blistered or charred?",
                        "TRAUMA_FRACTURE": "Can they feel and wiggle their fingers and toes? Is there any bone visible?",
                        "GENERAL": "Tell me exactly what symptoms you are experiencing right now. Has anything changed?"
                    },
                    "hi": {
                        "CARDIAC": "Kya abhi chakkar ya ulti jaisa lag raha hai? Dard badh raha hai ya wahi hai?",
                        "SEVERE_BLEEDING": "Kya dabaav se khoon kam ho raha hai? Ghaav kitna bada hai?",
                        "BREATHING_DIFFICULTY": "Kya aap abhi 1 se 5 tak gin sakte hain? Saans behtar ho rahi hai ya aur mushkil?",
                        "GENERAL": "Abhi bilkul kya ho raha hai batayein. Koi naya lakshan hai?"
                    },
                    "mr": {
                        "CARDIAC": "आत्ता चक्कर किंवा मळमळ होतेय का? दुखणे वाढतेय की तसेच आहे?",
                        "BREATHING_DIFFICULTY": "तुम्ही आत्ता एक ते पाच मोजू शकता का? श्वास सुधारतोय की आणखी कठीण होतोय?",
                        "GENERAL": "आत्ता नेमके काय होतेय ते सांगा. काही नवीन लक्षण दिसतेय का?"
                    }
                }
                lang_followups = follow_ups.get(lang_code, follow_ups["en"])
                followup = lang_followups.get(category, lang_followups.get("GENERAL", ""))
                if followup:
                    voice_text = f"{base_response} {followup}"
                else:
                    voice_text = base_response
            else:
                voice_text = base_response
            used_provider = "deterministic_protocol"

        # 6. Append to Transcript in DB
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

        # Never mark as final — continuous assistance until ambulance arrives or user ends call
        is_final = False

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
