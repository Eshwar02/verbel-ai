"""verbel-ai FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import tts

app = FastAPI(
    title="verbel-ai TTS API",
    description="Convert text into natural-sounding speech.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tts.router)

# Serve generated audio files at /audio/<filename>
app.mount(
    "/audio",
    StaticFiles(directory=str(settings.audio_dir)),
    name="audio",
)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {"name": "verbel-ai", "docs": "/docs", "health": "/api/health"}
