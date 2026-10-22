from typing import List, Dict, Optional
from src.llm.base import LLMProvider
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol

class DeterministicFallbackProvider(LLMProvider):
    """100% reliable offline fallback. Formulates clear first-aid instructions
    directly from verified clinical protocol actions without calling any external LLM.
    """

    @staticmethod
    def _follow_up(transcript: str, emergency_type: str) -> str:
        """Ask one useful question that follows the caller's latest words."""
        text = transcript.lower()
        if any(word in text for word in ("unconscious", "unresponsive", "fainted", "breathing", "saans", "shwas")):
            return "Is the person awake and breathing normally right now?"
        if emergency_type == "severe_bleeding":
            return "Is blood still soaking through the cloth, and where is the wound?"
        if emergency_type == "cardiac_chest_pain":
            return "Is the pain spreading to the arm, jaw, or back, or is there sweating or breathlessness?"
        if emergency_type == "breathing_difficulty":
            return "Can they speak a full short sentence, or are their lips turning blue?"
        if emergency_type == "choking":
            return "Can they cough or make any sound at all?"
        if emergency_type == "neurological_symptoms":
            return "Can they smile and lift both arms equally, and when did this begin?"
        if emergency_type == "burns":
            return "Is the burn larger than their palm, blistered, or on the face, hands, or genitals?"
        if emergency_type == "trauma_injury":
            return "Is there bleeding, numbness, or pain in the neck or back?"
        return "What is the main symptom now, and is it getting worse?"

    async def generate_first_aid_guidance(
        self,
        transcript: str,
        protocol: EmergencyProtocol,
        patient_context: Optional[PatientContext],
        history: List[Dict[str, str]],
        language: str
    ) -> str:
        # Check language tone
        if language in ["hi", "hinglish"]:
            greeting = "शांत रहें, मैं आपकी मदद कर रहा हूँ।"
            action_lead = "तुरंत ये कदम उठाइए:"
            steps = " ".join([f"{i+1}. {act}" for i, act in enumerate(protocol.approved_actions[:2])])
            caution = ""
            if patient_context and patient_context.allergies:
                caution = f" ध्यान दें: मरीज को {', '.join(patient_context.allergies)} से एलर्जी है।"
            return f"{greeting} {action_lead} {steps}{caution} हम मेडिकल टीम को अलर्ट कर रहे हैं।"
        
        # Keep this short and conversational: it is also the response used when
        # external AI is unavailable, so it must not sound like a generic script.
        greeting = "I heard you say: " + transcript.strip().rstrip(".") + "."
        action = protocol.approved_actions[0] if protocol.approved_actions else "Keep the patient safe and still."
        question = self._follow_up(transcript, protocol.emergency_type)
        caution = ""
        if patient_context and patient_context.allergies:
            caution = f" Avoid anything they are allergic to, including {', '.join(patient_context.allergies)}."
        return f"{greeting} Right now, {action} Emergency help is being coordinated.{caution} {question}"
