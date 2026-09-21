"""
Shared test fixtures.

`build_valid_payload()` returns a fresh, deep-copyable dict matching the
Backend -> AI Input Contract exactly (see AI_Input_Output_Contract.md,
Section 3), so individual tests can mutate a copy without affecting other
tests.
"""

import copy

import pytest


def _canonical_payload():
    return {
        "user_id": 1,
        "emergency_description": "Patient has severe chest pain and difficulty breathing.",
        "emergency_wallet": {
            "blood_group": "B+",
            "allergies": "Penicillin",
            "chronic_conditions": "Hypertension",
            "current_medications": "Amlodipine",
            "emergency_notes": "Previous cardiac history",
        },
        "medical_records": [
            {
                "record_id": 10,
                "record_type": "Lab Report",
                "title": "Blood Test",
                "hospital_name": "ABC Hospital",
                "doctor_name": "Dr. XYZ",
                "record_date": "2026-08-20",
                "ocr_text": "Patient has a history of hypertension.",
            }
        ],
        "emergency": {
            "sos_id": 25,
            "description": "Patient has severe chest pain.",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "status": "ACTIVE",
        },
    }


@pytest.fixture
def valid_payload():
    """A fresh deep copy of a fully populated, contract-valid payload."""
    return copy.deepcopy(_canonical_payload())
