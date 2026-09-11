"""verbel-ai FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.routers import auth, documents, enhance, history, tts

app = FastAPI(
    title="verbel-ai TTS API",
    description="Convert text into natural-sounding speech.",
    version="0.1.0",
)

# Rate limiting (slowapi reads the limiter from app.state at request time)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tts.router)
app.include_router(enhance.router)
app.include_router(documents.router)
app.include_router(auth.router)
app.include_router(history.router)

# Serve generated audio files at /audio/<filename>
app.mount(
    "/audio",
    StaticFiles(directory=str(settings.audio_dir)),
    name="audio",
)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {"name": "verbel-ai", "docs": "/docs", "health": "/api/health"}
