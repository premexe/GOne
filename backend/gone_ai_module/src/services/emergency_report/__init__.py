"""Emergency Report Generator service package."""

from src.services.emergency_report.report_generator import (
    EmergencyReportGenerator,
    generate_emergency_report,
)

__all__ = ["EmergencyReportGenerator", "generate_emergency_report"]