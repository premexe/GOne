from src.emergency.analyzer import EmergencyAnalyzer

def test_language_detection():
    assert EmergencyAnalyzer.detect_language("मुझे सांस लेने में दिक्कत हो रही है") == "hi"
    assert EmergencyAnalyzer.detect_language("Bohot khoon beh raha hai jaldi madad karo") == "hinglish"
    assert EmergencyAnalyzer.detect_language("Patient is having severe chest pain") == "en"

def test_cardiac_emergency_and_severity():
    em_type, severity, escalate = EmergencyAnalyzer.analyze("Severe pressure in chest and left arm pain")
    assert em_type == "cardiac_chest_pain"
    assert severity == "critical"
    assert escalate is True

def test_bleeding_hinglish_escalation():
    em_type, severity, escalate = EmergencyAnalyzer.analyze("Deep cut hai haath me bohot khoon beh raha hai")
    assert em_type == "severe_bleeding"
    assert severity == "critical"
    assert escalate is True

def test_severity_never_lowers():
    # Once severity is critical, a subsequent mild phrase should not lower it
    em_type, severity, _ = EmergencyAnalyzer.analyze("I just feel slightly dizzy", current_severity="critical")
    assert severity == "critical"