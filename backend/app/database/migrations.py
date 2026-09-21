"""
Lightweight database migration utility.
Checks and adds missing columns dynamically to existing SQLite/PostgreSQL tables.
"""

import logging
from sqlalchemy import inspect, text
from app.database.connection import engine

logger = logging.getLogger(__name__)


def run_migrations():
    """Ensure newly introduced columns exist in the database."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        with engine.connect() as conn:
            # 1. SOS Table Columns
            if "sos" in tables:
                sos_cols = {c["name"] for c in inspector.get_columns("sos")}
                
                columns_to_add = [
                    ("ai_emergency_understanding", "TEXT"),
                    ("ai_severity", "VARCHAR(30)"),
                    ("ai_required_capabilities", "TEXT"),
                    ("ai_health_summary", "TEXT"),
                    ("ai_emergency_report", "TEXT"),
                    ("call_sid", "VARCHAR(100)"),
                    ("call_status", "VARCHAR(50)"),
                    ("call_transcript", "TEXT"),
                    ("call_summary", "TEXT"),
                    ("email_sent", "INTEGER DEFAULT 0"),
                    ("email_sent_at", "TIMESTAMP"),
                ]

                for col_name, col_type in columns_to_add:
                    if col_name not in sos_cols:
                        logger.info(f"Adding column {col_name} to sos table...")
                        try:
                            conn.execute(text(f"ALTER TABLE sos ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                            logger.info(f"Successfully added {col_name} to sos.")
                        except Exception as e:
                            logger.warning(f"Could not add column {col_name} to sos: {e}")

            # 2. Emergency Contacts Table Columns
            if "emergency_contacts" in tables:
                contact_cols = {c["name"] for c in inspector.get_columns("emergency_contacts")}
                if "email" not in contact_cols:
                    logger.info("Adding email column to emergency_contacts table...")
                    try:
                        conn.execute(text("ALTER TABLE emergency_contacts ADD COLUMN email VARCHAR(100)"))
                        conn.commit()
                        logger.info("Successfully added email to emergency_contacts.")
                    except Exception as e:
                        logger.warning(f"Could not add email column to emergency_contacts: {e}")

        logger.info("Database schema verification and migrations completed successfully.")
    except Exception as e:
        logger.error(f"Migration check encountered error: {e}")
