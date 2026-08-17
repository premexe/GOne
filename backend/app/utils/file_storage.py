import os
import uuid
from pathlib import Path

from fastapi import UploadFile


UPLOAD_DIR = Path("uploads/medical_records")

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def save_medical_record_file(
    file: UploadFile
):
    # Make sure upload directory exists
    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # Get extension
    extension = Path(
        file.filename or ""
    ).suffix.lower()

    # Validate extension
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            "Unsupported file type. "
            "Only PDF, JPG, JPEG and PNG files are allowed."
        )

    # Read file
    file_content = file.file.read()

    # Validate size
    if len(file_content) > MAX_FILE_SIZE:
        raise ValueError(
            "File size exceeds the maximum limit of 10 MB."
        )

    # Generate unique filename
    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )

    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(
        file_path,
        "wb"
    ) as buffer:
        buffer.write(file_content)

    return (
        str(file_path),
        file.filename,
        file.content_type
    )