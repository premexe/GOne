"""
Centralized, maintainable indicator definitions for G-ONE Emergency Understanding.

Maps clinical indicators and keyword patterns to Version 1 emergency categories
and conservative severity ratings.
"""

from dataclasses import dataclass
from typing import List, Tuple
from src.schemas.emergency_understanding import EmergencyCategory, SeverityLevel


@dataclass(frozen=True)
class IndicatorDefinition:
    name: str
    category: EmergencyCategory
    severity: SeverityLevel
    patterns: Tuple[str, ...]
    is_critical: bool = False


# Version 1 Emergency Indicators Taxonomy
INDICATOR_DEFINITIONS: List[IndicatorDefinition] = [
    # --- Cardiac Emergency ---
    IndicatorDefinition(
        name="crushing chest pain",
        category=EmergencyCategory.CARDIAC,
        severity=SeverityLevel.CRITICAL,
        patterns=(r"\bcrushing chest pain\b", r"\bchest pain.*(collapsed|unconscious|fainted)\b"),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="severe chest pain with sweating",
        category=EmergencyCategory.CARDIAC,
        severity=SeverityLevel.HIGH,
        patterns=(r"\bchest pain.*(sweat|sweating)\b", r"\b(sweat|sweating).*chest pain\b"),
    ),
    IndicatorDefinition(
        name="chest pain or pressure",
        category=EmergencyCategory.CARDIAC,
        severity=SeverityLevel.HIGH,
        patterns=(r"\bsevere chest pain\b", r"\bchest pressure\b", r"\bchest tightness\b", r"\bheavy chest\b"),
    ),
    IndicatorDefinition(
        name="mild chest discomfort",
        category=EmergencyCategory.CARDIAC,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bmild chest discomfort\b", r"\bchest discomfort after exertion\b"),
    ),

    # --- Respiratory Emergency ---
    IndicatorDefinition(
        name="severe respiratory distress",
        category=EmergencyCategory.RESPIRATORY,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\bcannot speak full sentences\b",
            r"\bstruggling to breathe\b",
            r"\bbreathing very slowly\b",
            r"\bstopped breathing\b",
            r"\bchoking\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="difficulty breathing",
        category=EmergencyCategory.RESPIRATORY,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\bdifficulty breathing\b",
            r"\bsevere breathing difficulty\b",
            r"\bshortness of breath\b",
            r"\bunable to breathe\b",
            r"\btrouble breathing\b",
        ),
    ),
    IndicatorDefinition(
        name="wheezing and moderate breathlessness",
        category=EmergencyCategory.RESPIRATORY,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bwheezing\b", r"\bmild shortness of breath\b", r"\basthma attack\b"),
    ),

    # --- Trauma / Accident ---
    IndicatorDefinition(
        name="severe trauma with head injury or confusion",
        category=EmergencyCategory.TRAUMA,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\b(accident|collision|fall).*(confused|unconscious|head injury|not moving)\b",
            r"\bmultiple visible injuries\b",
            r"\bcar accident.*confused\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="major physical trauma",
        category=EmergencyCategory.TRAUMA,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\broad accident\b",
            r"\bcar accident\b",
            r"\bbike accident\b",
            r"\bfell from (a )?height\b",
            r"\bfell down stairs\b",
            r"\bbadly injured\b",
            r"\bcannot stand\b",
            r"\bpossible fracture\b",
            r"\bunable to move (his|her|their)? ?leg\b",
        ),
    ),
    IndicatorDefinition(
        name="minor physical trauma",
        category=EmergencyCategory.TRAUMA,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bminor bicycle fall\b", r"\bminor fall\b", r"\barm pain\b", r"\blimping\b"),
    ),

    # --- Severe Bleeding ---
    IndicatorDefinition(
        name="uncontrolled or continuous heavy bleeding",
        category=EmergencyCategory.SEVERE_BLEEDING,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\bblood is continuously flowing\b",
            r"\bcontinuous(ly)? heavy bleeding\b",
            r"\bsevere external bleeding\b",
            r"\bdeep wound.*blood is continuously flowing\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="heavy bleeding",
        category=EmergencyCategory.SEVERE_BLEEDING,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\bheavy bleeding\b",
            r"\bbleeding is not stopping\b",
            r"\bdeep leg wound\b",
            r"\bdeep wound\b",
            r"\bbleeding profusely\b",
        ),
    ),
    IndicatorDefinition(
        name="noticeable controlled bleeding",
        category=EmergencyCategory.SEVERE_BLEEDING,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bcut with noticeable bleeding\b", r"\bminor bleeding\b", r"\bnoticeable bleeding\b"),
    ),

    # --- Neurological Emergency ---
    IndicatorDefinition(
        name="acute stroke-like signs",
        category=EmergencyCategory.NEUROLOGICAL,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\bweakness on one side\b",
            r"\bfacial drooping\b",
            r"\bcannot move.*arm\b",
            r"\bdifficulty speaking and weakness\b",
            r"\bsudden paralysis\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="sudden neurological alteration",
        category=EmergencyCategory.NEUROLOGICAL,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\bsudden severe headache\b",
            r"\bheadache and (repeated )?vomiting\b",
            r"\bsuddenly feels confused\b",
            r"\bdifficulty speaking\b",
            r"\bslurred speech\b",
        ),
    ),
    IndicatorDefinition(
        name="unusual weakness and dizziness",
        category=EmergencyCategory.NEUROLOGICAL,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bunusual weakness and dizziness\b", r"\bdizziness\b", r"\bmild numbness\b"),
    ),

    # --- Unconsciousness / Altered Consciousness ---
    IndicatorDefinition(
        name="unresponsiveness or prolonged collapse",
        category=EmergencyCategory.UNCONSCIOUSNESS,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\bcollapsed and is unconscious\b",
            r"\bunconscious\b",
            r"\bnot responding\b",
            r"\bunresponsive\b",
            r"\bdifficult to wake up\b",
            r"\bpassed out and not waking\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="transient collapse or acute severe confusion",
        category=EmergencyCategory.UNCONSCIOUSNESS,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\bbriefly (fainted|collapsed)\b",
            r"\bfainted\b",
            r"\bcollapsed\b",
            r"\bextremely confused\b",
            r"\bnot responding properly\b",
        ),
    ),

    # --- Burn Injury ---
    IndicatorDefinition(
        name="extensive or airway burns",
        category=EmergencyCategory.BURN_INJURY,
        severity=SeverityLevel.CRITICAL,
        patterns=(
            r"\bextensive (?:fire )?burns\b",
            r"\bburns on the face.*breathing\b",
            r"\bbreathing.*burns on the face\b",
            r"\bburns in a fire\b",
            r"\bsevere electrical burn\b",
        ),
        is_critical=True,
    ),
    IndicatorDefinition(
        name="significant burn",
        category=EmergencyCategory.BURN_INJURY,
        severity=SeverityLevel.HIGH,
        patterns=(
            r"\blarge burn\b",
            r"\bburn on the arm and chest\b",
            r"\bbadly burned\b",
            r"\bhot oil burn\b",
            r"\bchemical burn\b",
        ),
    ),
    IndicatorDefinition(
        name="minor localized burn",
        category=EmergencyCategory.BURN_INJURY,
        severity=SeverityLevel.MODERATE,
        patterns=(r"\bsmall burn\b", r"\bminor burn\b", r"\bburn on the hand\b"),
    ),
]
