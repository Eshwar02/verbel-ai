"""Voice/language catalog — the single source of truth for what the API offers.

A gTTS "voice" is a named preset over a language: an accent (Google TLD) plus a
`slow` flag. Keeping the catalog here means the router and tests validate
against one place, and swapping to a neural provider later only means rewriting
this file and `tts_service.py`.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class Voice:
    id: str
    label: str
    tld: str = "com"
    slow: bool = False


@dataclass(frozen=True)
class Language:
    code: str  # gTTS language code
    name: str
    voices: list[Voice]


# gTTS language codes: en, hi, gu, mr, es, fr, de
CATALOG: list[Language] = [
    Language(
        code="en",
        name="English",
        voices=[
            Voice("en-us", "English (US)", tld="com"),
            Voice("en-uk", "English (UK)", tld="co.uk"),
            Voice("en-au", "English (Australia)", tld="com.au"),
            Voice("en-in", "English (India)", tld="co.in"),
            Voice("en-us-slow", "English (US, slow)", tld="com", slow=True),
        ],
    ),
    Language(
        code="hi",
        name="Hindi",
        voices=[
            Voice("hi-in", "Hindi"),
            Voice("hi-in-slow", "Hindi (slow)", slow=True),
        ],
    ),
    Language(
        code="gu",
        name="Gujarati",
        voices=[Voice("gu-in", "Gujarati")],
    ),
    Language(
        code="mr",
        name="Marathi",
        voices=[Voice("mr-in", "Marathi")],
    ),
    Language(
        code="es",
        name="Spanish",
        voices=[
            Voice("es-es", "Spanish (Spain)", tld="es"),
            Voice("es-us", "Spanish (US)", tld="com"),
        ],
    ),
    Language(
        code="fr",
        name="French",
        voices=[
            Voice("fr-fr", "French (France)", tld="fr"),
            Voice("fr-ca", "French (Canada)", tld="ca"),
        ],
    ),
    Language(
        code="de",
        name="German",
        voices=[Voice("de-de", "German")],
    ),
]

_LANG_BY_CODE = {lang.code: lang for lang in CATALOG}


def catalog_payload() -> dict:
    """Serializable catalog for GET /api/voices."""
    return {
        "languages": [
            {
                "code": lang.code,
                "name": lang.name,
                "voices": [asdict(v) for v in lang.voices],
            }
            for lang in CATALOG
        ]
    }


def get_language(code: str) -> Language | None:
    return _LANG_BY_CODE.get(code)


def resolve_voice(language_code: str, voice_id: str) -> Voice | None:
    """Return the Voice only if it exists AND belongs to the given language."""
    lang = _LANG_BY_CODE.get(language_code)
    if lang is None:
        return None
    for voice in lang.voices:
        if voice.id == voice_id:
            return voice
    return None
