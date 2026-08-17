from fastapi import FastAPI

from app.database.connection import engine
from app.database.base import Base

import app.models

from app.routers.users import router as user_router
from app.routers.emergency_wallet import router as emergency_wallet_router
from app.routers.sos import router as sos_router
from app.routers.emergency_contacts import router as emergency_contact_router
from app.routers.emergency_response import (
    router as emergency_response_router
)
from app.routers.notifications import (
    router as notification_router
)
from app.routers.emergency_orchestration import (
    router as emergency_orchestration_router
)
from app.routers.medical_records import router as medical_records_router

app = FastAPI(title="LifeLink AI API")

Base.metadata.create_all(bind=engine)

app.include_router(user_router)
app.include_router(emergency_wallet_router)
app.include_router(sos_router)
app.include_router(emergency_contact_router)
app.include_router(emergency_response_router)
app.include_router(notification_router)
app.include_router(emergency_orchestration_router)
app.include_router(medical_records_router)


@app.get("/")
def root():
    return {
        "message": "LifeLink AI Backend Running Successfully 🚑"
    }