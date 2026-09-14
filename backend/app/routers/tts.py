"""TTS API routes: POST /api/tts, GET /api/voices, GET /api/health."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.middleware.rate_limit import limiter
from app.schemas.tts import (
    BatchItemResult,
    BatchRequest,
    BatchResponse,
    DetectLanguageRequest,
    DetectLanguageResponse,
    HealthResponse,
    TTSRequest,
    TTSResponse,
)
from app.services import voices as voice_catalog
from app.services import voxtral
from app.services.language_detect import detect_language
from app.services.tts_service import TTSGenerationError, generate_speech
from app.services.voxtral import VoxtralError, generate_speech as generate_neural

router = APIRouter(prefix="/api", tags=["tts"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/voices")
def list_voices() -> dict:
    payload = voice_catalog.catalog_payload()
    payload["neural"] = {
        "available": settings.neural_tts_available,
        **voxtral.catalog_payload(),
    }
    return payload


@router.post("/detect-language", response_model=DetectLanguageResponse)
def detect_language_route(payload: DetectLanguageRequest) -> DetectLanguageResponse:
    """Auto-detect the language of pasted text and map it to the catalog."""
    try:
        result = detect_language(payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DetectLanguageResponse(
        detected_code=result.detected_code,
        confidence=result.confidence,
        supported=result.supported,
        language_code=result.language_code,
        language_name=result.language_name,
        voice_id=result.voice_id,
    )


@router.post("/tts", response_model=TTSResponse)
@limiter.limit("20/minute")
def create_tts(request: Request, payload: TTSRequest) -> TTSResponse:
    text = payload.text.strip()

    # --- shared validation (spec §14) ---
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")
    if len(text) > settings.max_text_length:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds the maximum of {settings.max_text_length} characters.",
        )

    if payload.engine == "neural":
        return _create_tts_neural(text, payload)
    return _create_tts_standard(text, payload)


def _create_tts_standard(text: str, payload: TTSRequest) -> TTSResponse:
    """Free/keyless gTTS engine."""
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

    try:
        filename = generate_speech(text, payload.language, voice)
    except TTSGenerationError as exc:
        raise HTTPException(
            status_code=503, detail=f"TTS provider unavailable: {exc}"
        ) from exc

    return TTSResponse(
        success=True, audio_url=f"/audio/{filename}", engine_used="standard"
    )


def _create_tts_neural(text: str, payload: TTSRequest) -> TTSResponse:
    """Premium Voxtral engine, with graceful fallback to gTTS on failure."""
    if not settings.neural_tts_available:
        raise HTTPException(
            status_code=503,
            detail="Neural engine unavailable: MISTRAL_API_KEY is not configured.",
        )
    if voxtral.resolve_voice(payload.language, payload.voice) is None:
        raise HTTPException(
            status_code=400,
            detail=f"Neural voice {payload.voice!r} is not valid for language {payload.language!r}.",
        )

    try:
        filename = generate_neural(text, payload.voice)
        return TTSResponse(
            success=True, audio_url=f"/audio/{filename}", engine_used="neural"
        )
    except VoxtralError:
        # Fall back to the free engine so the user still gets audio.
        fallback = voxtral.FALLBACK_TO_GTTS.get(payload.language)
        if fallback is None:
            raise HTTPException(
                status_code=503, detail="Neural TTS provider unavailable."
            )
        lang_code, voice_id = fallback
        voice = voice_catalog.resolve_voice(lang_code, voice_id)
        try:
            filename = generate_speech(text, lang_code, voice)
        except TTSGenerationError as exc:
            raise HTTPException(
                status_code=503, detail=f"TTS provider unavailable: {exc}"
            ) from exc
        return TTSResponse(
            success=True, audio_url=f"/audio/{filename}", engine_used="standard"
        )


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
