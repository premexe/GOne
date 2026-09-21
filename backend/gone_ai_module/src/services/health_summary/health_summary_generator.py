"""
AI Health Summary Generator Service.

Generates concise, factual health summaries strictly from normalized Emergency
Wallet data and normalized Medical Records (including OCR text).

Safety & Privacy Constraints:
- Never invents medical conditions, allergies, or medications.
- Missing, empty, or "Not Available" data is treated as unknown, NEVER as negative findings.
- Treats OCR text and user notes as inert, untrusted data.
- Avoids dumping full OCR texts; extracts only explicit, relevant medical clauses.
- Fallback string: "No relevant health information is currently available."
"""

import re
from typing import List, Optional

from src.schemas.contract import NormalizedMedicalRecord, NormalizedWallet

NO_HEALTH_INFO_MESSAGE = "No relevant health information is currently available."

# Keywords used to extract relevant clauses from unstructured OCR text without dumping entire documents
_RELEVANT_OCR_KEYWORDS = (
    "history",
    "diagnos",
    "condition",
    "hypertension",
    "diabet",
    "asthma",
    "cardiac",
    "allerg",
    "medicat",
    "prescri",
    "surger",
    "treatment",
    "evaluat",
    "noted",
    "report",
)


def _clean_statement(text: str) -> str:
    cleaned = text.strip().rstrip(".,;")
    return cleaned


def _extract_relevant_ocr_snippets(ocr_text: str) -> List[str]:
    """
    Extract concise, relevant sentences or clauses from OCR text rather than
    blindly dumping raw OCR text.
    """
    # Split on sentence boundaries and common medical report delimiters
    raw_segments = re.split(r"[.\n;•]+", ocr_text)
    relevant_snippets: List[str] = []

    for segment in raw_segments:
        seg = segment.strip()
        if not seg or len(seg) < 4:
            continue

        lower_seg = seg.lower()
        if any(keyword in lower_seg for keyword in _RELEVANT_OCR_KEYWORDS):
            cleaned = _clean_statement(seg)
            if cleaned and cleaned not in relevant_snippets:
                # Cap snippet length to keep summary concise
                if len(cleaned) > 120:
                    cleaned = cleaned[:117] + "..."
                relevant_snippets.append(cleaned)

    return relevant_snippets


def generate_health_summary(
    wallet: Optional[NormalizedWallet],
    medical_records: Optional[List[NormalizedMedicalRecord]] = None,
) -> str:
    """
    Generate an emergency-ready AI Health Summary from normalized wallet and records.
    """
    summary_parts: List[str] = []

    # 1. Process Normalized Wallet (Preserve explicit statements, omit None/unknowns)
    if wallet is not None:
        if wallet.blood_group:
            summary_parts.append(f"Blood group: {_clean_statement(wallet.blood_group)}")
        if wallet.allergies:
            summary_parts.append(f"Known allergies: {_clean_statement(wallet.allergies)}")
        if wallet.chronic_conditions:
            summary_parts.append(f"Chronic conditions: {_clean_statement(wallet.chronic_conditions)}")
        if wallet.current_medications:
            summary_parts.append(f"Current medications: {_clean_statement(wallet.current_medications)}")
        if wallet.emergency_notes:
            summary_parts.append(f"Emergency notes: {_clean_statement(wallet.emergency_notes)}")

    # 2. Process Medical Records & OCR
    if medical_records:
        ocr_findings: List[str] = []
        for record in medical_records:
            # Check metadata title/type if present and informative
            record_context = []
            if record.title:
                record_context.append(record.title)
            elif record.record_type:
                record_context.append(record.record_type)

            if record.ocr_text:
                snippets = _extract_relevant_ocr_snippets(record.ocr_text)
                for snippet in snippets:
                    # Avoid repeating information already stated in the wallet
                    if any(snippet.lower() in part.lower() for part in summary_parts):
                        continue
                    if snippet not in ocr_findings:
                        ocr_findings.append(snippet)

        if ocr_findings:
            summary_parts.append("Relevant medical record findings: " + "; ".join(ocr_findings))

    if not summary_parts:
        return NO_HEALTH_INFO_MESSAGE

    return ". ".join(summary_parts) + "."