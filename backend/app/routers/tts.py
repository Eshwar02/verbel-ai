"""TTS API routes: POST /api/tts, GET /api/voices, GET /api/health."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.middleware.rate_limit import limiter
from app.schemas.tts import (
    BatchItemResult,
    BatchRequest,
    BatchResponse,
    HealthResponse,
    TTSRequest,
    TTSResponse,
)
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
@limiter.limit("20/minute")
def create_tts(request: Request, payload: TTSRequest) -> TTSResponse:
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


MAX_BATCH_ITEMS = 20


@router.post("/tts/batch", response_model=BatchResponse)
@limiter.limit("5/minute")
def create_tts_batch(request: Request, payload: BatchRequest) -> BatchResponse:
    # Validate language + voice once for the whole batch.
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

    segments = [t.strip() for t in payload.texts if t.strip()]
    if not segments:
        raise HTTPException(status_code=400, detail="No non-empty text segments.")
    if len(segments) > MAX_BATCH_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many segments (max {MAX_BATCH_ITEMS}).",
        )

    results: list[BatchItemResult] = []
    for segment in segments:
        if len(segment) > settings.max_text_length:
            results.append(
                BatchItemResult(
                    text=segment, success=False, error="Segment exceeds max length."
                )
            )
            continue
        try:
            filename = generate_speech(segment, payload.language, voice)
            results.append(
                BatchItemResult(
                    text=segment, success=True, audio_url=f"/audio/{filename}"
                )
            )
        except TTSGenerationError as exc:
            results.append(
                BatchItemResult(text=segment, success=False, error=str(exc))
            )

    return BatchResponse(success=True, results=results)
