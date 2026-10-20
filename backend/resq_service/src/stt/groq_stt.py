"""Multilingual audio transcription fallback for G-ONE ResQ."""

import logging
from typing import Optional, Tuple

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)


class GroqSTTProvider:
    """Transcribe audio with Groq Whisper when Sarvam is unavailable."""

    URL = "https://api.groq.com/openai/v1/audio/transcriptions"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> Tuple[Optional[str], Optional[str]]:
        if not self.api_key:
            return None, None

        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {"file": (filename, audio_bytes, "application/octet-stream")}
        data = {
            "model": "whisper-large-v3-turbo",
            "response_format": "verbose_json",
            "temperature": "0",
            "prompt": "Emergency medical conversation. Preserve the caller's original language.",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(self.URL, headers=headers, files=files, data=data)
            if response.status_code != 200:
                logger.warning("Groq STT returned %s", response.status_code)
                return None, None
            payload = response.json()
            return payload.get("text") or None, payload.get("language") or None
        except Exception as exc:
            logger.warning("Groq STT failed: %s", exc)
            return None, None
