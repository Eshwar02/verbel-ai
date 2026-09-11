"""TTS generation — gTTS wrapper.

Isolated behind a single function so the provider can be swapped (ElevenLabs,
Azure, Polly) without touching routers or validation. Raises TTSGenerationError
on any provider/network failure so the router can map it to HTTP 503.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from gtts import gTTS
from gtts.tts import gTTSError

from app.config import settings
from app.services.voices import Voice


class TTSGenerationError(Exception):
    """Raised when the TTS provider fails to generate audio."""


def generate_speech(text: str, language_code: str, voice: Voice) -> str:
    """Generate an mp3 for the given text/voice and return its filename.

    The file is written into settings.audio_dir; the caller builds the public
    /audio/<filename> URL.
    """
    filename = f"{uuid.uuid4().hex}.mp3"
    out_path: Path = settings.audio_dir / filename
    try:
        tts = gTTS(text=text, lang=language_code, tld=voice.tld, slow=voice.slow)
        tts.save(str(out_path))
    except (gTTSError, AssertionError, ValueError) as exc:
        raise TTSGenerationError(str(exc)) from exc
    except Exception as exc:  # network / unexpected provider failure
        raise TTSGenerationError(str(exc)) from exc
    return filename
