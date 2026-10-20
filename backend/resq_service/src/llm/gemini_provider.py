import logging
from typing import List, Dict, Optional
import httpx
from src.llm.base import LLMProvider
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol
from src.core.config import settings

logger = logging.getLogger(__name__)

class GeminiProvider(LLMProvider):
    """Google Gemini API Provider using Google AI Studio REST endpoints."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = settings.GEMINI_API_KEY if api_key is None else api_key
        raw_model = settings.GEMINI_MODEL if model is None else model
        # Strip 'models/' if user included it in .env
        self.model = raw_model.replace("models/", "")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_first_aid_guidance(
        self,
        transcript: str,
        protocol: EmergencyProtocol,
        patient_context: Optional[PatientContext],
        history: List[Dict[str, str]],
        language: str
    ) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"

        system_instruction = (
            "You are G-ONE ResQ, an empathetic, calm emergency first-aid nurse speaking over the phone.\n\n"
            "BEHAVIOR GUIDELINES:\n"
            "1. Speak conversationally and naturally like a caring Indian emergency nurse.\n"
            "2. If the user greets (like 'Namaste' or 'Hello'), warmly greet back, ask what emergency they are facing, and ask how you can help.\n"
            "3. If the user mentions or repeats a symptom (e.g., 'haath kat gaya', 'chakkar aa raha hai'), guide them with immediate, approved protocol steps and ask a quick triage question.\n"
            "4. Language matching: Reply in the caller's language and script whenever possible. If language is uncertain, use simple English and ask which language they prefer.\n"
            "5. Address the patient warmly by name (e.g. 'Aarav ji') if known.\n"
            "6. Safety: NEVER diagnose conditions. NEVER prescribe medicines or dosages.\n"
            "7. Keep responses concise for phone audio (2 to 3 complete, natural sentences)."
        )

        patient_info = patient_context.summarize_for_prompt() if patient_context else "No prior medical records."
        approved_text = "\n- ".join(protocol.approved_actions)

        prompt_context = (
            f"Patient Record: {patient_info}\n"
            f"Emergency Protocol: {protocol.emergency_type} (Severity: {protocol.severity})\n"
            f"Approved Protocol Actions:\n- {approved_text}\n"
            f"Caller just said: '{transcript}'\n\n"
            "Reply as the nurse over the phone right now:"
        )

        contents = []
        for h in history[-4:]:
            role = "user" if h.get("sender") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h.get("text", "")}]})
        contents.append({"role": "user", "parts": [{"text": prompt_context}]})

        payload = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 600
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code != 200:
                    raise RuntimeError(f"Gemini API returned {resp.status_code}: {resp.text}")

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    raise RuntimeError(f"Empty candidates returned by Gemini: {data}")

                parts = candidates[0].get("content", {}).get("parts", [])
                text_response = "".join([p.get("text", "") for p in parts if "text" in p]).strip()
                if not text_response:
                    raise RuntimeError("Gemini returned empty text response")
                return text_response
        except Exception as e:
            logger.error(f"Gemini request failed: {e}")
            raise
