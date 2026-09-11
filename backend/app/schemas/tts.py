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


class BatchRequest(BaseModel):
    texts: list[str] = Field(..., description="One or more text segments")
    language: str
    voice: str


class BatchItemResult(BaseModel):
    text: str
    success: bool
    audio_url: str | None = None
    error: str | None = None


class BatchResponse(BaseModel):
    success: bool = True
    results: list[BatchItemResult]


class HealthResponse(BaseModel):
    status: str = "ok"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None
