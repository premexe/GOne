import logging
from typing import List, Dict, Optional
import httpx
from src.llm.base import LLMProvider
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol
from src.core.config import settings

logger = logging.getLogger(__name__)

class GroqProvider(LLMProvider):
    """Groq Free-Tier API Provider using ultra-fast LPU inference (OpenAI-compatible)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = settings.GROQ_API_KEY if api_key is None else api_key
        self.model = settings.GROQ_MODEL if model is None else model
        self.url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_first_aid_guidance(
        self,
        transcript: str,
        protocol: EmergencyProtocol,
        patient_context: Optional[PatientContext],
        history: List[Dict[str, str]],
        language: str
    ) -> str:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        system_instruction = (
            "You are G-ONE ResQ, a calm emergency first-aid voice assistant. "
            "You are giving critical phone first-aid guidance. "
            "NEVER diagnose, NEVER prescribe any medication or dosage. "
            "Answer in 2-3 spoken sentences directly matching the caller's language (" + language + "). "
            "Use the caller's latest details and the conversation history: give one immediate approved action and ask one new, focused triage question. "
            "Instruct ONLY using the provided Approved Actions. Do not use lists or markdown."
        )

        patient_info = patient_context.summarize_for_prompt() if patient_context else "None."
        approved_text = "; ".join(protocol.approved_actions)

        prompt = (
            f"Patient Info: {patient_info}\n"
            f"Protocol: {protocol.emergency_type}\n"
            f"Approved actions: {approved_text}\n"
            f"Caller said: '{transcript}'\n"
            "Instruct them calmly now."
        )

        messages = [{"role": "system", "content": system_instruction}]
        for h in history[-4:]:
            role = "user" if h["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": h["text"]})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 512
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(self.url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Groq API returned {resp.status_code}: {resp.text}")
            
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
