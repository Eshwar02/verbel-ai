"""Pydantic request/response models for the TTS API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    language: str = Field(..., description="Language code, e.g. 'en'")
    voice: str = Field(..., description="Voice id belonging to the language")


class TTSResponse(BaseModel):
    success: bool = True
    audio_url: str


class HealthResponse(BaseModel):
    status: str = "ok"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None
