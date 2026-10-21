from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sys

from app.database.connection import engine
from app.database.base import Base
from app.database.migrations import run_migrations
from app.database.seeder import seed_default_data
from app.database.session import SessionLocal

import app.models

from app.routers.users import router as user_router
from app.routers.emergency_wallet import router as emergency_wallet_router
from app.routers.sos import router as sos_router
from app.routers.emergency_contacts import router as emergency_contact_router
from app.routers.emergency_response import router as emergency_response_router
from app.routers.notifications import router as notification_router
from app.routers.emergency_orchestration import router as emergency_orchestration_router
from app.routers.medical_records import router as medical_records_router
from app.routers.hospitals import router as hospital_router
from app.routers.doctors import router as doctors_router
from app.routers.ambulances import router as ambulances_router
from app.routers.voice import router as voice_router

# Host the supplied G-ONE ResQ service in this API so its browser client and
# WebSocket share the same deployment and origin as the rest of G-ONE.
_resq_root = Path(__file__).resolve().parents[1] / "resq_service"
if str(_resq_root) not in sys.path:
    sys.path.insert(0, str(_resq_root))

from src.api.routes import router as resq_api_router
from src.api.websocket import router as resq_websocket_router

app = FastAPI(title="G-ONE API")
Path("uploads/profile-photos").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Run lightweight schema migrations to add new columns to existing tables
run_migrations()

# Auto-seed verified accounts and hospital network
try:
    _db = SessionLocal()
    seed_default_data(_db)
    _db.close()
except Exception as _e:
    pass

app.include_router(user_router)
app.include_router(emergency_wallet_router)
app.include_router(sos_router)
app.include_router(emergency_contact_router)
app.include_router(emergency_response_router)
app.include_router(notification_router)
app.include_router(emergency_orchestration_router)
app.include_router(medical_records_router)
app.include_router(hospital_router)
app.include_router(doctors_router)
app.include_router(ambulances_router)
app.include_router(voice_router)
app.include_router(resq_api_router)
app.include_router(resq_websocket_router)
app.mount("/resq", StaticFiles(directory=str(_resq_root / "web"), html=True), name="resq")

@app.get("/")
def root():
    return {
        "message": "G-ONE Backend Running Successfully"
    }


@app.get("/health")
def health():
    """Lightweight readiness probe for the mobile app and deployment checks."""
    return {"status": "ok"}
