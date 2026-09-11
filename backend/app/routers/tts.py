"""TTS API routes: POST /api/tts, GET /api/voices, GET /api/health."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas.tts import HealthResponse, TTSRequest, TTSResponse
from app.services import voices as voice_catalog
from app.services.tts_service import TTSGenerationError, generate_speech

router = APIRouter(prefix="/api", tags=["tts"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/voices")
def list_voices() -> dict:
    return voice_catalog.catalog_payload()


@router.post("/tts", response_model=TTSResponse)
def create_tts(payload: TTSRequest) -> TTSResponse:
    text = payload.text.strip()

    # --- validation (spec §14) ---
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")
    if len(text) > settings.max_text_length:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds the maximum of {settings.max_text_length} characters.",
        )
    if voice_catalog.get_language(payload.language) is None:
        raise HTTPException(
            status_code=400, detail=f"Unsupported language: {payload.language!r}."
        )
    voice = voice_catalog.resolve_voice(payload.language, payload.voice)
    if voice is None:
        raise HTTPException(
            status_code=400,
            detail=f"Voice {payload.voice!r} is not valid for language {payload.language!r}.",
        )

    # --- generation ---
    try:
        filename = generate_speech(text, payload.language, voice)
    except TTSGenerationError as exc:
        raise HTTPException(
            status_code=503, detail=f"TTS provider unavailable: {exc}"
        ) from exc

    return TTSResponse(success=True, audio_url=f"/audio/{filename}")
