"""Unit tests for Phase 2: AI Health Summary Generator."""

import pytest

from src.schemas.contract import NormalizedMedicalRecord, NormalizedWallet
from src.services.health_summary import NO_HEALTH_INFO_MESSAGE, generate_health_summary


def test_complete_wallet_information():
    wallet = NormalizedWallet(
        blood_group="O+",
        allergies="Penicillin",
        chronic_conditions="Hypertension, Asthma",
        current_medications="Amlodipine 5mg",
        emergency_notes="Previous cardiac bypass in 2021",
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert "Blood group: O+" in summary
    assert "Known allergies: Penicillin" in summary
    assert "Chronic conditions: Hypertension, Asthma" in summary
    assert "Current medications: Amlodipine 5mg" in summary
    assert "Emergency notes: Previous cardiac bypass in 2021" in summary


def test_missing_wallet_information():
    wallet = NormalizedWallet(
        blood_group=None,
        allergies=None,
        chronic_conditions=None,
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == NO_HEALTH_INFO_MESSAGE


def test_blood_group_present_only():
    wallet = NormalizedWallet(
        blood_group="AB-",
        allergies=None,
        chronic_conditions=None,
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Blood group: AB-."


def test_allergy_present_only():
    wallet = NormalizedWallet(
        blood_group=None,
        allergies="Peanuts, Shellfish",
        chronic_conditions=None,
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Known allergies: Peanuts, Shellfish."


def test_chronic_condition_present_only():
    wallet = NormalizedWallet(
        blood_group=None,
        allergies=None,
        chronic_conditions="Type 2 Diabetes",
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Chronic conditions: Type 2 Diabetes."


def test_medication_present_only():
    wallet = NormalizedWallet(
        blood_group=None,
        allergies=None,
        chronic_conditions=None,
        current_medications="Metformin 500mg, Atorvastatin 20mg",
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Current medications: Metformin 500mg, Atorvastatin 20mg."


def test_relevant_ocr_information_extracted():
    records = [
        NormalizedMedicalRecord(
            record_id=1,
            record_type="Discharge Summary",
            title="Hospital Discharge",
            hospital_name="City Care Hospital",
            doctor_name="Dr. Smith",
            record_date="2026-01-10",
            ocr_text="Patient admitted for chest discomfort. Diagnosis confirmed: mild myocardial ischemia. Recommended regular follow-up.",
        )
    ]
    summary = generate_health_summary(wallet=None, medical_records=records)
    assert "Relevant medical record findings:" in summary
    assert "Diagnosis confirmed: mild myocardial ischemia" in summary


def test_empty_medical_records():
    wallet = NormalizedWallet(
        blood_group="B+",
        allergies=None,
        chronic_conditions="Hypertension",
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Blood group: B+. Chronic conditions: Hypertension."


def test_multiple_medical_records():
    records = [
        NormalizedMedicalRecord(
            record_id=1,
            record_type="Cardiology Note",
            title="ECG Evaluation",
            hospital_name="General Hospital",
            doctor_name="Dr. A",
            record_date="2025-05-12",
            ocr_text="ECG report noted sinus tachycardia. Patient has cardiac evaluation pending.",
        ),
        NormalizedMedicalRecord(
            record_id=2,
            record_type="Lab Report",
            title="Blood Analysis",
            hospital_name="Central Lab",
            doctor_name="Dr. B",
            record_date="2025-06-01",
            ocr_text="Routine lipid panel. Patient reports known asthma treatment history.",
        ),
    ]
    summary = generate_health_summary(wallet=None, medical_records=records)
    assert "Relevant medical record findings:" in summary
    assert "ECG report noted sinus tachycardia" in summary
    assert "Patient reports known asthma treatment history" in summary


def test_no_meaningful_health_information():
    summary = generate_health_summary(wallet=None, medical_records=None)
    assert summary == NO_HEALTH_INFO_MESSAGE

    empty_wallet = NormalizedWallet(None, None, None, None, None)
    summary_empty = generate_health_summary(wallet=empty_wallet, medical_records=[])
    assert summary_empty == NO_HEALTH_INFO_MESSAGE


def test_unavailable_information_not_converted_to_negative():
    wallet = NormalizedWallet(
        blood_group=None,
        allergies=None,
        chronic_conditions="Hypertension",
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert "Hypertension" in summary
    # Must not contain negative assumptions
    assert "no allergies" not in summary.lower()
    assert "no medication" not in summary.lower()
    assert "negative" not in summary.lower()
    assert "none" not in summary.lower()


def test_does_not_contain_invented_information():
    wallet = NormalizedWallet(
        blood_group="A+",
        allergies=None,
        chronic_conditions=None,
        current_medications=None,
        emergency_notes=None,
    )
    summary = generate_health_summary(wallet=wallet, medical_records=[])
    assert summary == "Blood group: A+."
    for forbidden in ["diabetes", "penicillin", "aspirin", "cancer", "hypertension"]:
        assert forbidden not in summary.lower()


def test_ocr_text_not_blindly_dumped():
    records = [
        NormalizedMedicalRecord(
            record_id=1,
            record_type="Note",
            title="Clinical Evaluation",
            hospital_name="Clinic",
            doctor_name="Dr. Jane",
            record_date="2026-03-01",
            ocr_text="Billing code 12345. Page 1 of 5. Patient has history of asthma. Copay collected $20.",
        )
    ]
    summary = generate_health_summary(wallet=None, medical_records=records)
    assert "Patient has history of asthma" in summary
    assert "Billing code" not in summary
    assert "Copay" not in summary