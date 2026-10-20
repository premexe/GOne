import json
import logging
from pathlib import Path
from typing import Dict, Optional
from src.core.config import settings
from src.protocols.models import EmergencyProtocol

logger = logging.getLogger(__name__)

class ProtocolRegistry:
    def __init__(self, protocols_dir: Optional[Path] = None):
        self.protocols_dir = protocols_dir or settings.PROTOCOLS_DIR
        self._protocols: Dict[str, EmergencyProtocol] = {}
        self.load_protocols()

    def load_protocols(self):
        if not self.protocols_dir.exists():
            logger.warning(f"Protocols directory {self.protocols_dir} does not exist.")
            return

        for file_path in self.protocols_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    protocol = EmergencyProtocol(**data)
                    self._protocols[protocol.emergency_type] = protocol
            except Exception as e:
                logger.error(f"Failed to load protocol from {file_path}: {e}")

    def get_protocol(self, emergency_type: str) -> EmergencyProtocol:
        if emergency_type in self._protocols:
            return self._protocols[emergency_type]
        # Fallback to general emergency
        return self._protocols.get(
            "general_emergency",
            EmergencyProtocol(
                emergency_type="general_emergency",
                severity="high",
                escalation_condition="Acute instability",
                source="Fallback standard EMS first aid",
                approved_actions=[
                    "Keep patient still and calm.",
                    "Ensure adequate breathing and airway.",
                    "Monitor closely until medical services arrive."
                ],
                critical_actions=["Do not leave patient alone."],
                contraindications=["Never give oral medications without doctor instructions."]
            )
        )