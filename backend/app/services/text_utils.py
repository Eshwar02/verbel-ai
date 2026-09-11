"""Lightweight text preprocessing for TTS.

gTTS has no SSML support, so we approximate pauses with punctuation that the
engine naturally reads as a break. Authors insert markers in their text:

    [pause]      -> a short break
    [pause=3]    -> a longer break (N ~= number of beats, clamped)

These are converted to ellipsis/period sequences before synthesis. No-ops when
no markers are present, so it is always safe to run.
"""
from __future__ import annotations

import re

_PAUSE_RE = re.compile(r"\[pause(?:=(\d+))?\]", re.IGNORECASE)
_MAX_BEATS = 5


def apply_pauses(text: str) -> str:
    """Replace [pause] / [pause=N] markers with pause-inducing punctuation."""

    def repl(match: re.Match) -> str:
        beats = match.group(1)
        n = min(int(beats), _MAX_BEATS) if beats else 1
        # Each beat is a sentence-ending gap; gTTS pauses on ". "
        return " " + (". " * n)

    return _PAUSE_RE.sub(repl, text).strip()
