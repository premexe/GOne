from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
import logging

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SQLITE_FALLBACK_URL = "sqlite:///./lifelink_ai.db"

def get_engine():
    if DATABASE_URL and not DATABASE_URL.startswith("sqlite"):
        try:
            # Test PostgreSQL connection with a short timeout
            test_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
            with test_engine.connect() as conn:
                pass
            test_engine.dispose()
            return create_engine(DATABASE_URL, echo=False)
        except Exception as e:
            logging.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database at {SQLITE_FALLBACK_URL}")

    return create_engine(
        SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

engine = get_engine()