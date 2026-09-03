from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware

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

# Development origins for Expo web and devices on the local network.
app.add_middleware(
    CORSMiddleware,
    # Local development: permit browser clients on localhost and private LANs.
    # Expo Go is a native client, but Expo web still needs this CORS policy.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
