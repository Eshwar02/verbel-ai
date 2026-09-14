"""Neural TTS provider — Mistral Voxtral (`voxtral-mini-tts-2603`).

The premium engine alongside the free/keyless gTTS provider. Voxtral offers
expressive, emotion-tagged neural voices via Mistral's /v1/audio/speech
endpoint, authenticated with the same MISTRAL_API_KEY used for text
enhancement. Isolated here so the router treats it as one more engine.

Preset voices are referenced by a `voice` string of the form
``<accent>_<speaker>_<emotion>`` (e.g. ``en_paul_neutral``). The catalog below
mirrors Voxtral's 31 built-in presets, grouped by spoken language so the
existing frontend language/voice pickers render it unchanged.

Failures (missing key, rate limits, provider/network errors) raise
VoxtralError so the router can fall back to gTTS or return a clean 503.
"""
from __future__ import annotations

import base64
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

import httpx

from app.config import settings

API_URL = "https://api.mistral.ai/v1/audio/speech"
TIMEOUT = 60.0

# Transient failures are retried with exponential backoff (mirrors ai_service).
MAX_RETRIES = 3
BACKOFF_BASE = 0.5
_RETRY_STATUS = {429, 500, 502, 503, 504}


class VoxtralError(Exception):
    """Raised when the neural provider is unconfigured or fails."""


@dataclass(frozen=True)
class NeuralVoice:
    id: str  # the Voxtral `voice` string, e.g. "en_paul_neutral"
    label: str


@dataclass(frozen=True)
class NeuralLanguage:
    code: str
    name: str
    voices: list[NeuralVoice]


def _variants(prefix: str, speaker: str, accent: str, emotions: list[str]) -> list[NeuralVoice]:
    """Build voice presets like en_paul_happy → 'Paul · Happy (US)'."""
    return [
        NeuralVoice(
            id=f"{prefix}_{speaker.lower()}_{emo}",
            label=f"{speaker} · {emo.capitalize()} ({accent})",
        )
        for emo in emotions
    ]


# Voxtral's 31 built-in preset voices (verified against Mistral/OpenRouter).
NEURAL_CATALOG: list[NeuralLanguage] = [
    NeuralLanguage(
        code="en",
        name="English",
        voices=[
            *_variants(
                "en", "Paul", "US",
                ["neutral", "happy", "sad", "excited", "confident",
                 "cheerful", "frustrated", "angry"],
            ),
            *_variants(
                "gb", "Oliver", "UK",
                ["neutral", "sad", "excited", "curious", "confident",
                 "cheerful", "angry"],
            ),
            *_variants(
                "gb", "Jane", "UK",
                ["neutral", "sad", "curious", "confident", "frustrated",
                 "sarcasm", "confused", "shameful", "jealousy"],
            ),
        ],
    ),
    NeuralLanguage(
        code="fr",
        name="French",
        voices=_variants(
            "fr", "Marie", "FR",
            ["neutral", "happy", "sad", "excited", "curious", "angry"],
        ),
    ),
]

_LANG_BY_CODE = {lang.code: lang for lang in NEURAL_CATALOG}
_VOICE_IDS = {v.id for lang in NEURAL_CATALOG for v in lang.voices}

# Neural language code -> (gTTS language, default gTTS voice) for graceful
# fallback when Voxtral is unavailable.
FALLBACK_TO_GTTS = {
    "en": ("en", "en-us"),
    "fr": ("fr", "fr-fr"),
}


def catalog_payload() -> dict:
    """Serializable neural catalog for GET /api/voices."""
    return {
        "languages": [
            {
                "code": lang.code,
                "name": lang.name,
                "voices": [asdict(v) for v in lang.voices],
            }
            for lang in NEURAL_CATALOG
        ]
    }


def get_language(code: str) -> NeuralLanguage | None:
    return _LANG_BY_CODE.get(code)


def resolve_voice(language_code: str, voice_id: str) -> NeuralVoice | None:
    """Return the voice only if it exists AND belongs to the language."""
    lang = _LANG_BY_CODE.get(language_code)
    if lang is None:
        return None
    for voice in lang.voices:
        if voice.id == voice_id:
            return voice
    return None


def is_valid_voice(voice_id: str) -> bool:
    return voice_id in _VOICE_IDS


def _write_audio(resp: httpx.Response) -> str:
    """Persist a speech response (raw bytes or base64 JSON) as an mp3."""
    filename = f"{uuid.uuid4().hex}.mp3"
    out_path: Path = settings.audio_dir / filename
    content_type = resp.headers.get("content-type", "")
    if "application/json" in content_type:
        data = resp.json()
        # Mistral SDK returns base64 in `audio` / `audio_data`.
        b64 = data.get("audio_data") or data.get("audio")
        if not b64:
            raise VoxtralError("No audio in provider response.")
        out_path.write_bytes(base64.b64decode(b64))
    else:
        out_path.write_bytes(resp.content)
    return filename


def generate_speech(text: str, voice_id: str, response_format: str = "mp3") -> str:
    """Generate an mp3 with Voxtral and return its filename.

    Raises VoxtralError if the key is missing or the provider fails after
    retries.
    """
    api_key = settings.mistral_api_key
    if not api_key:
        raise VoxtralError("MISTRAL_API_KEY is not configured.")

    payload = {
        "model": settings.voxtral_model,
        "input": text,
        "voice": voice_id,
        "response_format": response_format,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.post(
                API_URL, json=payload, headers=headers, timeout=TIMEOUT
            )
            resp.raise_for_status()
            return _write_audio(resp)
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code not in _RETRY_STATUS:
                raise VoxtralError(str(exc)) from exc
        except httpx.TransportError as exc:
            last_exc = exc  # network/timeout — retry
        except VoxtralError:
            raise
        except Exception as exc:  # unexpected — don't retry
            raise VoxtralError(str(exc)) from exc

        if attempt < MAX_RETRIES - 1:
            time.sleep(BACKOFF_BASE * (2**attempt))

    raise VoxtralError(str(last_exc))
