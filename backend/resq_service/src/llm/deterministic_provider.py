from typing import List, Dict, Optional
from src.llm.base import LLMProvider
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol

class DeterministicFallbackProvider(LLMProvider):
    """100% reliable offline fallback. Formulates clear first-aid instructions
    directly from verified clinical protocol actions without calling any external LLM.
    """

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
        
        # English fallback
        greeting = "Stay calm, I am here with you."
        steps = " ".join([f"Step {i+1}: {act}" for i, act in enumerate(protocol.approved_actions[:2])])
        caution = ""
        if patient_context and patient_context.allergies:
            caution = f" Note: Patient has recorded allergies to {', '.join(patient_context.allergies)}."
        return f"{greeting} Take these steps immediately: {steps}.{caution} An emergency alert is being coordinated."