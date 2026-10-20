import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from src.patient.models import PatientContext
from src.protocols.models import EmergencyProtocol

class Message(BaseModel):
    sender: str  # "user" or "assistant"
    text: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class EmergencySession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"SES-{uuid.uuid4().hex[:8].upper()}")
    patient_id: Optional[str] = None
    detected_language: str = "en"
    emergency_type: str = "general_emergency"
    severity: str = "moderate"
    patient_context: Optional[PatientContext] = None
    current_protocol: Optional[EmergencyProtocol] = None
    conversation_history: List[Message] = Field(default_factory=list)
    actions_given: List[str] = Field(default_factory=list)
    escalation_triggered: bool = False
    handover_dispatched: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    def append_message(self, sender: str, text: str):
        self.conversation_history.append(Message(sender=sender, text=text))
        self.updated_at = datetime.utcnow().isoformat()

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, EmergencySession] = {}

    def get_or_create(self, session_id: Optional[str] = None) -> EmergencySession:
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        
        new_session = EmergencySession()
        if session_id:
            new_session.session_id = session_id
        self._sessions[new_session.session_id] = new_session
        return new_session

    def save(self, session: EmergencySession):
        session.updated_at = datetime.utcnow().isoformat()
        self._sessions[session.session_id] = session