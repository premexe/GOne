import logging
from typing import Optional, Tuple
import httpx
from src.core.config import settings

logger = logging.getLogger(__name__)

class SarvamSTTProvider:
    """Transcribes audio using Sarvam AI Saaras API with fallback handling."""
    
    URL = "https://api.sarvam.ai/speech-to-text"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.SARVAM_API_KEY

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.wav") -> Tuple[Optional[str], Optional[str]]:
        """Returns: (transcript, detected_language_code)"""
        if not self.api_key:
            logger.info("Sarvam API key not set. Skipping server-side STT.")
            return None, None

        headers = {
            "api-subscription-key": self.api_key
        }
        
        files = {
            "file": (filename, audio_bytes, "audio/wav")
        }
        data = {
            "model": settings.SARVAM_MODEL,
            "language_code": "unknown",
            "mode": "transcribe"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.URL, headers=headers, files=files, data=data)
                if response.status_code == 200:
                    res_data = response.json()
                    transcript = res_data.get("transcript", "")
                    lang = res_data.get("language_code", "en")
                    return transcript, lang
                else:
                    logger.warning(f"Sarvam STT returned status {response.status_code}: {response.text}")
                    return None, None
        except Exception as e:
            logger.warning(f"Sarvam STT connection error: {e}")
            return None, None