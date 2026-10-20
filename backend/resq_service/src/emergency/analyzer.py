import re
from typing import Tuple

class EmergencyAnalyzer:
    """Deterministic, rule-based emergency classifier with language-aware output.
    Strictly escalates severity; never lowers it below triggered threshold.
    """

    # Keyword rules mapped to emergency categories
    PATTERNS = {
        "cardiac_chest_pain": [
            r"chest\s*pain", r"heart\s*attack", r"chaati\s*me(in)?\s*dard", 
            r"dil\s*ka\s*daura", r"chhati\s*me(in)?\s*jalan", r"left\s*arm\s*pain", 
            r"seene\s*me(in)?\s*dard", r"छाती\s*में\s*दर्द", r"दिल\s*का\s*दौरा",
            r"cardiac", r"angina", r"heavy\s*chest", r"pressure\s*in\s*chest"
        ],
        "severe_bleeding": [
            r"bleeding", r"khoon\s*beh\s*raha", r"khun", r"blood", 
            r"खून", r"heavily\s*bleeding", r"kat\s*gaya", r"deep\s*cut", 
            r"spurting", r"stab", r"hemorrhage", r"ruk\s*nahi\s*raha\s*khoon"
        ],
        "breathing_difficulty": [
            r"breath", r"saans", r"sans\s*nahi\s*aa\s*rahi", r"suffocation", 
            r"asthma", r"wheezing", r"gasping", r"सांस", r"shortness\s*of\s*breath", 
            r"dam\s*ghut\s*raha", r"cant\s*breathe", r"saans\s*lene\s*me\s*takleef"
        ],
        "choking": [
            r"chok(e|ing)", r"gale\s*me(in)?\s*atak\s*gaya", r"gala\s*dab\s*raha", 
            r"swallow", r"गले\s*में\s*अटक", r"food\s*stuck", r"khana\s*atak\s*gaya"
        ],
        "unconscious_unresponsive": [
            r"unconscious", r"behosh", r"be\s*hosh", r"fainted", r"fainting", 
            r"unresponsive", r"collapsed", r"hosh\s*kho", r"बेहोश", 
            r"no\s*pulse", r"eyes\s*closed.*not\s*waking", r"not\s*responding"
        ],
        "burns": [
            r"burn(s|ing|t)?", r"jal\s*gaya", r"aag\s*lagi", r"hot\s*oil", 
            r"boiling\s*water", r"जल\s*गया", r"acid\s*burn", r"chaala\s*pad\s*gaya"
        ],
        "neurological_symptoms": [
            r"stroke", r"paralysis", r"lakwa", r"seizure", r"fit\s*pad\s*raha", 
            r"mirgi", r"slurred\s*speech", r"face\s*droop", r"लकवा", r"दौरा",
            r"sudden\s*numbness", r"bol\s*nahi\s*pa\s*rahe"
        ],
        "trauma_injury": [
            r"accident", r"fracture", r"gir\s*gaye", r"fall\s*down", r"bone\s*broken", 
            r"haddi\s*toot\s*gayi", r"chot\s*lagi", r"हादसा", r"हड्डी\s*टूट", 
            r"head\s*injury", r"crash"
        ]
    }

    SEVERITY_TIERS = {
        "critical": 3,
        "high": 2,
        "moderate": 1,
        "low": 0
    }

    @classmethod
    def detect_language(cls, text: str) -> str:
        """Determines Hindi/Hinglish/English, otherwise preserves auto-language mode."""
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', text))
        if devanagari_chars > 2:
            return "hi"
        
        # Hinglish detection via common transliterated markers
        hinglish_words = {"hai", "mera", "meri", "dard", "saans", "khoon", "ho", "raha", 
                          "gaya", "batao", "madad", "chhati", "gale", "kuch", "karo", "nahi"}
        words = set(re.findall(r'\b[a-zA-Z]+\b', text.lower()))
        if len(words.intersection(hinglish_words)) >= 1:
            return "hinglish"
        
        # Let Gemini/Groq match all other languages instead of falsely labelling
        # every non-Indian language as English.
        non_latin = len(re.findall(r'[^\x00-\x7F]', text))
        return "auto" if non_latin else "en"

    @classmethod
    def analyze(cls, text: str, current_type: str = "general_emergency", current_severity: str = "moderate") -> Tuple[str, str, bool]:
        """Returns: (detected_emergency_type, final_severity, should_escalate)"""
        text_lower = text.lower()
        matched_type = None

        for em_type, patterns in cls.PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text_lower):
                    matched_type = em_type
                    break
            if matched_type:
                break

        final_type = matched_type or current_type
        
        # Determine inherent severity
        if final_type in ["cardiac_chest_pain", "severe_bleeding", "choking", "unconscious_unresponsive", "neurological_symptoms"]:
            new_severity = "critical"
        elif final_type in ["breathing_difficulty", "trauma_injury"]:
            new_severity = "high"
        elif final_type == "burns":
            new_severity = "moderate"
        else:
            new_severity = "high"

        # Severity escalation rule: Severity may escalate, but never lower automatically
        if cls.SEVERITY_TIERS.get(new_severity, 0) < cls.SEVERITY_TIERS.get(current_severity, 0):
            final_severity = current_severity
        else:
            final_severity = new_severity

        # Handover trigger: Any critical severity, or rapid deterioration cues
        deterioration_triggers = [
            "worse", "not waking", "blue", "gasps", "collapsing", "kharab", "behosh ho gaya", "jyada", "critical"
        ]
        has_deterioration = any(dt in text_lower for dt in deterioration_triggers)
        
        should_escalate = (final_severity == "critical") or has_deterioration

        return final_type, final_severity, should_escalate
