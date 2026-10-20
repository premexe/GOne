import logging
from typing import List, Dict, Optional, Tuple
from src.llm.base import LLMProvider
from src.llm.gemini_provider import GeminiProvider
from src.llm.groq_provider import GroqProvider
from src.llm.deterministic_provider import DeterministicFallbackProvider
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol

logger = logging.getLogger(__name__)

class ProviderManager:
    """Multi-tiered LLM fallback manager:
    1. Gemini API (Primary)
    2. Groq API (Secondary)
    3. Deterministic Protocol Fallback (Guaranteed safe fallback)
    """

    def __init__(self):
        self.providers: List[Tuple[str, LLMProvider]] = [
            ("Gemini", GeminiProvider()),
            ("Groq", GroqProvider()),
            ("DeterministicFallback", DeterministicFallbackProvider())
        ]

    async def generate_guidance(
        self,
        transcript: str,
        protocol: EmergencyProtocol,
        patient_context: Optional[PatientContext],
        history: List[Dict[str, str]],
        language: str
    ) -> Dict[str, str]:
        for name, provider in self.providers:
            try:
                response_text = await provider.generate_first_aid_guidance(
                    transcript=transcript,
                    protocol=protocol,
                    patient_context=patient_context,
                    history=history,
                    language=language
                )
                if response_text and response_text.strip():
                    return {
                        "text": response_text.strip(),
                        "provider": name,
                        "fallback_used": (name != "Gemini")
                    }
            except Exception as e:
                logger.warning(f"Provider '{name}' failed with error: {e}. Cascading to next available provider...")
                continue

        # Ultimate safety fallback
        fallback = DeterministicFallbackProvider()
        res = await fallback.generate_first_aid_guidance(transcript, protocol, patient_context, history, language)
        return {
            "text": res,
            "provider": "DeterministicFallback",
            "fallback_used": True
        }