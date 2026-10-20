import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # LLM Providers
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # STT Provider
    SARVAM_API_KEY: str = ""
    SARVAM_MODEL: str = "saaras:v3"
    
    # G-ONE Backend Handover
    GONE_BACKEND_URL: str = "http://localhost:8080"
    GONE_HANDOVER_ENDPOINT: str = "/api/v1/emergency/handover"
    USE_MOCK_HANDOVER: bool = True
    
    # Root paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROTOCOLS_DIR: Path = BASE_DIR / "protocols"
    WEB_DIR: Path = BASE_DIR / "web"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()