import re
from typing import Tuple
from src.protocols.models import EmergencyProtocol

class SafetyValidator:
    """Lightweight Clinical Safety Guardrail.
    Validates LLM output against dangerous medical claims, medication prescriptions,
    and protocol contraindications without false-triggering on normal conversational words.
    """

    # Strictly target actual medical prescription and diagnosis phrasing
    PROHIBITED_PATTERNS = [
        r"\b(take|swallow|inject|prescribe|mg|milligrams?)\s+(aspirin|paracetamol|ibuprofen|antibiotic|disprin|tablet|dose|combiflam)\b",
        r"\b(you have|you are diagnosed with|this is definitely)\s+(a heart attack|stroke|asthma attack|cardiac arrest)\b",
        r"\b(put ice|apply butter|apply toothpaste|cut the blister)\b",
        r"\b(put something in (his|her|their) mouth)\b",
        r"\b(force the bone|straighten the broken bone)\b"
    ]

    @classmethod
    def validate(cls, generated_text: str, protocol: EmergencyProtocol, language: str = "en") -> Tuple[bool, str]:
        """Returns: (is_safe, final_response)"""
        text_lower = generated_text.lower()

        # Check for illegal prescriptions or definitive clinical diagnoses
        for pattern in cls.PROHIBITED_PATTERNS:
            if re.search(pattern, text_lower):
                return False, cls._generate_safe_replacement(protocol, language=language)

        return True, generated_text

    @classmethod
    def _generate_safe_replacement(cls, protocol: EmergencyProtocol, language: str = "en") -> str:
        if language in ["hi", "hinglish"]:
            actions = " ".join([f"{act}" for act in protocol.approved_actions[:2]])
            return f"Kripya dhyan dein aur surakshit rahein: {actions} Bina doctor ki salah ke koi dawai na lein. Hum madad coordinate kar rahe hain."
        
        actions = " ".join([f"{act}" for act in protocol.approved_actions[:2]])
        return (
            f"Please focus on immediate safety: {actions} "
            f"Do not take unverified medications. Medical assistance is being coordinated."
        )