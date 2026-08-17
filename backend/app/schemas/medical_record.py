from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MedicalRecordResponse(BaseModel):

    record_id: int
    user_id: int

    record_type: str
    title: str

    hospital_name: str | None = None
    doctor_name: str | None = None
    record_date: date | None = None

    file_name: str
    file_type: str

    ocr_text: str | None = None
    ai_summary: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )