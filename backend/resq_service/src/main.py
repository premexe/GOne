import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.api.websocket import router as ws_router
from src.api.routes import router as api_router

# 1. Instantiate the FastAPI application at module level
app = FastAPI(
    title="G-ONE ResQ",
    description="Voice-based First-Aid Emergency Companion with Safe Protocol Verification",
    version="1.0.0"
)

# 2. Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include WebSocket and REST routers
app.include_router(ws_router)
app.include_router(api_router)

# 4. Mount static frontend files
if settings.WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=str(settings.WEB_DIR), html=True), name="web")

# 5. CLI entrypoint
if __name__ == "__main__":
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=True)