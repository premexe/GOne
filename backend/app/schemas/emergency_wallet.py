from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmergencyWalletUpdate(BaseModel):

    blood_group: str | None = None

    allergies: str | None = None

    chronic_conditions: str | None = None

    current_medications: str | None = None

    emergency_notes: str | None = None


class EmergencyWalletResponse(BaseModel):

    wallet_id: int
    user_id: int

    blood_group: str | None = None

    allergies: str | None = None

    chronic_conditions: str | None = None

    current_medications: str | None = None

    emergency_notes: str | None = None

    readiness_score: int | None = None

    ai_health_summary: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )