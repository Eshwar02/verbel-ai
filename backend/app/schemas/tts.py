"""Pydantic request/response models for the TTS API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    language: str = Field(..., description="Language code, e.g. 'en'")
    voice: str = Field(..., description="Voice id belonging to the language")
    engine: str = Field(
        "standard",
        description="'standard' (gTTS, free) or 'neural' (Voxtral)",
    )


class TTSResponse(BaseModel):
    success: bool = True
    audio_url: str
    engine_used: str = Field(
        "standard",
        description="Engine that produced the audio (may differ on fallback)",
    )


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


class DetectLanguageRequest(BaseModel):
    text: str = Field(..., description="Text whose language should be detected")


class DetectLanguageResponse(BaseModel):
    success: bool = True
    detected_code: str = Field(..., description="Raw detected ISO code")
    confidence: float = Field(..., description="Detector confidence, 0-1")
    supported: bool = Field(..., description="Whether the app can speak it")
    language_code: str | None = None
    language_name: str | None = None
    voice_id: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None
