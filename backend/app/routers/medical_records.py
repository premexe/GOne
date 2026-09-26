from datetime import date
from pathlib import Path
import re

from fastapi.responses import FileResponse

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status
)

from sqlalchemy.orm import Session

from app.database.session import get_db

from app.schemas.medical_record import (
    MedicalRecordResponse
)

from app.services.medical_record_service import (
    MedicalRecordService
)

from app.utils.file_storage import (
    save_medical_record_file
)

from app.models.medical_record import MedicalRecord
from app.models.emergency_wallet import EmergencyWallet

from app.security.dependencies import get_current_user
from app.services.ocr_service import OCRService


router = APIRouter(
    prefix="/medical-records",
    tags=["Medical Records"]
)

def _merge_wallet_values(current: str | None, extracted: str | None) -> str | None:
    """Merge clearly labelled OCR values without overwriting patient-entered data."""
    values = [item.strip() for item in (current or "").split(",") if item.strip()]
    if extracted:
        values.extend(item.strip(" .;") for item in re.split(r"[,;/]", extracted) if item.strip())
    return ", ".join(dict.fromkeys(values)) or None

def _labelled_value(text: str, labels: str) -> str | None:
    match = re.search(rf"(?:{labels})\s*[:\-]\s*([^\n\r]+)", text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


@router.post(
    "/upload",
    response_model=MedicalRecordResponse,
    status_code=status.HTTP_201_CREATED
)
def upload_medical_record(
    file: UploadFile = File(...),
    record_type: str = Form(...),
    title: str = Form(...),
    hospital_name: str | None = Form(None),
    doctor_name: str | None = Form(None),
    record_date: date | None = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    try:
        (
            file_path,
            original_file_name,
            content_type
        ) = save_medical_record_file(file)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    record = MedicalRecord(
        user_id=current_user.user_id,
        record_type=record_type,
        title=title,
        hospital_name=hospital_name,
        doctor_name=doctor_name,
        record_date=record_date,
        file_name=original_file_name,
        file_path=file_path,
        file_type=content_type or "unknown"
    )

    return MedicalRecordService.create_record(
        db,
        current_user.user_id,
        record
    )

@router.get(
    "/{user_id}",
    response_model=list[MedicalRecordResponse]
)
def get_medical_records(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to access "
                "these medical records."
            )
        )

    return MedicalRecordService.get_records(
        db,
        user_id
    )

@router.get(
    "/record/{record_id}",
    response_model=MedicalRecordResponse
)
def get_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    return MedicalRecordService.get_record(
        db,
        current_user.user_id,
        record_id
    )

@router.get(
    "/record/{record_id}/file"
)
def get_medical_record_file(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    record = MedicalRecordService.get_record(
        db,
        current_user.user_id,
        record_id
    )

    file_path = Path(record.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record file not found."
        )

    return FileResponse(
        path=file_path,
        media_type=record.file_type,
        filename=record.file_name
    )

@router.post(
    "/record/{record_id}/process-ocr",
    response_model=MedicalRecordResponse
)
def process_medical_record_ocr(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    record = MedicalRecordService.get_record(
        db,
        current_user.user_id,
        record_id
    )

    try:
        text = OCRService.extract_text(
            record.file_path,
            record.file_type
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    record.ocr_text = text

    wallet = db.query(EmergencyWallet).filter(EmergencyWallet.user_id == current_user.user_id).first()
    if wallet:
        wallet.allergies = _merge_wallet_values(wallet.allergies, _labelled_value(text, r"allerg(?:y|ies)"))
        wallet.current_medications = _merge_wallet_values(wallet.current_medications, _labelled_value(text, r"medications?|prescriptions?"))
        wallet.chronic_conditions = _merge_wallet_values(wallet.chronic_conditions, _labelled_value(text, r"conditions?|diagnoses"))

    db.commit()
    db.refresh(record)

    return record
