from typing import Dict, Optional
from src.patient.models import PatientContext

class MockPatientProvider:
    """Provides mock patient health records for testing.
    Can be replaced with an HTTP client hitting the real G-ONE patient database.
    """
    def __init__(self):
        self._database: Dict[str, PatientContext] = {
            "PAT-101": PatientContext(
                patient_id="PAT-101",
                name="Aarav Sharma",
                age=48,
                blood_group="B+",
                allergies=["Penicillin", "NSAIDs (Ibuprofen)"],
                existing_conditions=["Hypertension", "Type 2 Diabetes"],
                medications=["Amlodipine 5mg", "Metformin 500mg"],
                emergency_contacts=["Sunita Sharma (Wife): +91-9876543210"],
                medical_reports=["Recent ECG (June 2025): Borderline sinus bradycardia"],
                relevant_medical_history="Mild angina episode 1 year ago"
            ),
            "PAT-102": PatientContext(
                patient_id="PAT-102",
                name="Priya Patel",
                age=24,
                blood_group="O+",
                allergies=["Peanuts", "Sulfa drugs"],
                existing_conditions=["Asthma"],
                medications=["Salbutamol Inhaler (as needed)"],
                emergency_contacts=["Karan Patel (Brother): +91-9811122233"],
                medical_reports=["Pulmonary function report: Mild persistent asthma"],
                relevant_medical_history="Frequent allergic wheezing triggers during seasonal changes"
            ),
            "PAT-103": PatientContext(
                patient_id="PAT-103",
                name="Ramesh Verma",
                age=67,
                blood_group="A+",
                allergies=[],
                existing_conditions=["Coronary Artery Disease", "High Cholesterol"],
                medications=["Atorvastatin 20mg", "Sorbitrate (prescribed for acute angina)"],
                emergency_contacts=["Ankit Verma (Son): +91-9922334455"],
                relevant_medical_history="Stent placement 2022"
            )
        }

    def get_patient(self, patient_id: Optional[str]) -> PatientContext:
        if not patient_id or patient_id not in self._database:
            return PatientContext(patient_id=patient_id or "ANONYMOUS_EMERGENCY")
        return self._database[patient_id]