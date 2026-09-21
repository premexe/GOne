"""
Centralized taxonomy and mapping rules for Required Medical Capability Identification.

Maps emergency categories, indicators, and severity levels into controlled,
hospital-oriented care capabilities.
"""

from typing import Dict, List
from src.schemas.emergency_understanding import EmergencyCategory
from src.schemas.medical_capability import MedicalCapability

# Canonical V1 Base Capability Mapping
CATEGORY_BASE_CAPABILITIES: Dict[str, List[MedicalCapability]] = {
    EmergencyCategory.CARDIAC.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.CARDIOLOGY_SUPPORT,
    ],
    EmergencyCategory.RESPIRATORY.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.RESPIRATORY_SUPPORT,
    ],
    EmergencyCategory.TRAUMA.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.TRAUMA_CARE,
    ],
    EmergencyCategory.SEVERE_BLEEDING.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.BLEEDING_SURGICAL_SUPPORT,
    ],
    EmergencyCategory.NEUROLOGICAL.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.NEUROLOGICAL_CARE,
    ],
    EmergencyCategory.UNCONSCIOUSNESS.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.CRITICAL_CARE_SUPPORT,
    ],
    EmergencyCategory.BURN_INJURY.value: [
        MedicalCapability.GENERAL_EMERGENCY_CARE,
        MedicalCapability.BURN_CARE,
    ],
}

# Explicit multi-system compound indicator mapping
INDICATOR_CAPABILITY_ADDITIONS: Dict[str, MedicalCapability] = {
    "heavy bleeding": MedicalCapability.BLEEDING_SURGICAL_SUPPORT,
    "uncontrolled or continuous heavy bleeding": MedicalCapability.BLEEDING_SURGICAL_SUPPORT,
    "noticeable controlled bleeding": MedicalCapability.BLEEDING_SURGICAL_SUPPORT,
    "severe respiratory distress": MedicalCapability.RESPIRATORY_SUPPORT,
    "difficulty breathing": MedicalCapability.RESPIRATORY_SUPPORT,
    "wheezing and moderate breathlessness": MedicalCapability.RESPIRATORY_SUPPORT,
    "airway burns": MedicalCapability.RESPIRATORY_SUPPORT,
    "major physical trauma": MedicalCapability.TRAUMA_CARE,
    "severe trauma with head injury or confusion": MedicalCapability.TRAUMA_CARE,
    "acute stroke-like signs": MedicalCapability.NEUROLOGICAL_CARE,
    "crushing chest pain": MedicalCapability.CARDIOLOGY_SUPPORT,
    "unresponsiveness or prolonged collapse": MedicalCapability.CRITICAL_CARE_SUPPORT,
}