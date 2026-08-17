import os
from pathlib import Path

import pytesseract
from PIL import Image
from pypdf import PdfReader
from pdf2image import convert_from_path
from dotenv import load_dotenv

load_dotenv()

class OCRService:

    @staticmethod
    def extract_text(
        file_path: str,
        file_type: str
    ) -> str:

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(
                "Medical record file not found."
            )

        # PDF
        if file_type == "application/pdf":
            return OCRService._extract_pdf_text(path)

        # Image
        if file_type.startswith("image/"):
            return OCRService._extract_image_text(path)

        raise ValueError(
            "Unsupported file type for OCR."
        )

    @staticmethod
    def _extract_image_text(
        path: Path
    ) -> str:

        image = Image.open(path)

        text = pytesseract.image_to_string(
            image
        )

        return text.strip()

    @staticmethod
    def _extract_pdf_text(
        path: Path
    ) -> str:

        reader = PdfReader(str(path))

        extracted_text = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                extracted_text.append(text)

        text_result = "\n".join(
            extracted_text
        ).strip()

        # Text-based PDF
        if text_result:
            return text_result

        # Scanned PDF fallback
        poppler_path = os.getenv("POPPLER_PATH")

        if not poppler_path:
            raise RuntimeError(
                "POPPLER_PATH is not configured."
            )

        pages = convert_from_path(
            str(path),
            poppler_path=poppler_path
        )

        ocr_results = []

        for page in pages:
            text = pytesseract.image_to_string(
                page
            )

            if text:
                ocr_results.append(text)

        return "\n".join(
            ocr_results
        ).strip()