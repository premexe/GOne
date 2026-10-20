from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol

class LLMProvider(ABC):
    """Abstract Base Class for LLM Providers."""
    
    @abstractmethod
    async def generate_first_aid_guidance(
        self,
        transcript: str,
        protocol: EmergencyProtocol,
        patient_context: Optional[PatientContext],
        history: List[Dict[str, str]],
        language: str
    ) -> str:
        pass