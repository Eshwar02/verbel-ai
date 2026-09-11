"""Tests for the pause-marker preprocessor."""
from __future__ import annotations

from app.services.text_utils import apply_pauses


def test_no_markers_is_noop():
    assert apply_pauses("Hello world") == "Hello world"


def test_simple_pause_marker_becomes_punctuation():
    out = apply_pauses("Hello [pause] world")
    assert "[pause]" not in out
    assert "." in out
    assert "world" in out


def test_counted_pause_is_clamped():
    out = apply_pauses("a [pause=99] b")
    # clamped to 5 beats -> 5 ". "
    assert out.count(".") == 5


def test_case_insensitive():
    assert "[pause]" not in apply_pauses("x [PAUSE] y")
