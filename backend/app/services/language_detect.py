"""Automatic language detection for TTS input.

Detects the language of arbitrary pasted text and maps it onto the voice
catalog so the frontend can auto-select the right language + a default voice.
This mirrors what commercial voice agents (ElevenLabs, Google) do: the user
pastes text in any supported language and the app "just knows" how to read it.

langdetect is deterministic (we seed it) and dependency-light. Its ISO-639-1
codes line up with our gTTS catalog codes, so the mapping is mostly identity.
"""
from __future__ import annotations

from dataclasses import dataclass

from langdetect import DetectorFactory, LangDetectException, detect_langs

from app.services import voices as voice_catalog

# Deterministic results for identical input (langdetect is otherwise random).
DetectorFactory.seed = 0

# langdetect code -> catalog code. Identity for most; a few dialects collapse
# onto the base language we support.
_ALIASES = {
    "en": "en",
    "hi": "hi",
    "gu": "gu",
    "mr": "mr",
    "es": "es",
    "fr": "fr",
    "de": "de",
}


@dataclass(frozen=True)
class DetectionResult:
    detected_code: str  # raw langdetect code (may be unsupported)
    confidence: float
    supported: bool
    language_code: str | None  # catalog code, when supported
    language_name: str | None
    voice_id: str | None  # default voice for the language, when supported


def detect_language(text: str) -> DetectionResult:
    """Detect the language of ``text`` and map it to the voice catalog.

    Raises ValueError if the text is empty or too short to detect.
    """
    stripped = text.strip()
    if not stripped:
        raise ValueError("Text must not be empty.")

    try:
        candidates = detect_langs(stripped)
    except LangDetectException as exc:
        raise ValueError("Could not detect a language from the text.") from exc

    top = candidates[0]
    detected_code = top.lang
    confidence = round(float(top.prob), 4)

    catalog_code = _ALIASES.get(detected_code)
    if catalog_code is None:
        return DetectionResult(
            detected_code=detected_code,
            confidence=confidence,
            supported=False,
            language_code=None,
            language_name=None,
            voice_id=None,
        )

    lang = voice_catalog.get_language(catalog_code)
    default_voice = lang.voices[0].id if lang and lang.voices else None
    return DetectionResult(
        detected_code=detected_code,
        confidence=confidence,
        supported=True,
        language_code=catalog_code,
        language_name=lang.name if lang else None,
        voice_id=default_voice,
    )
