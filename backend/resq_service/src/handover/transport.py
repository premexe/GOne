import logging
from abc import ABC, abstractmethod
from typing import Optional
import httpx
from src.handover.models import HandoverPayload
from src.core.config import settings

logger = logging.getLogger(__name__)

class HandoverTransport(ABC):
    @abstractmethod
    async def send_handover(self, payload: HandoverPayload) -> bool:
        pass

class MockHandoverTransport(HandoverTransport):
    """Simulates sending the payload to the hospital dashboard / teammate backend."""
    async def send_handover(self, payload: HandoverPayload) -> bool:
        logger.info(f"[MOCK HANDOVER] Dispatched payload for session {payload.session_id}:")
        logger.info(payload.model_dump_json(indent=2))
        return True

class HTTPHandoverTransport(HandoverTransport):
    """Transmits the schema-versioned JSON to the real G-ONE backend URL."""
    def __init__(self, base_url: Optional[str] = None, endpoint: Optional[str] = None):
        self.target_url = (base_url or settings.GONE_BACKEND_URL).rstrip("/") + (endpoint or settings.GONE_HANDOVER_ENDPOINT)

    async def send_handover(self, payload: HandoverPayload) -> bool:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(self.target_url, json=payload.model_dump())
                if resp.status_code in [200, 201, 202]:
                    logger.info(f"Handover transmitted to {self.target_url} successfully.")
                    return True
                else:
                    logger.warning(f"Handover endpoint returned status {resp.status_code}: {resp.text}")
                    return False
        except Exception as e:
            logger.warning(f"Failed to transmit HTTP handover to {self.target_url}: {e}")
            return False