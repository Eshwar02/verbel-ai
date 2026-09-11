"""API tests for the verbel-ai TTS backend."""
from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.tts_service import TTSGenerationError

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_voices_lists_languages_and_voices():
    r = client.get("/api/voices")
    assert r.status_code == 200
    data = r.json()
    codes = {lang["code"] for lang in data["languages"]}
    assert {"en", "hi", "gu", "mr", "es", "fr", "de"} <= codes
    english = next(l for l in data["languages"] if l["code"] == "en")
    assert any(v["id"] == "en-us" for v in english["voices"])


@patch("app.routers.tts.generate_speech", return_value="abc123.mp3")
def test_tts_success(mock_gen):
    r = client.post(
        "/api/tts", json={"text": "Hello world", "language": "en", "voice": "en-us"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["audio_url"] == "/audio/abc123.mp3"
    mock_gen.assert_called_once()


def test_tts_empty_text_rejected():
    r = client.post(
        "/api/tts", json={"text": "   ", "language": "en", "voice": "en-us"}
    )
    assert r.status_code == 400


def test_tts_too_long_rejected():
    r = client.post(
        "/api/tts",
        json={"text": "a" * 6000, "language": "en", "voice": "en-us"},
    )
    assert r.status_code == 400


def test_tts_bad_language_rejected():
    r = client.post(
        "/api/tts", json={"text": "hi", "language": "xx", "voice": "en-us"}
    )
    assert r.status_code == 400


def test_tts_voice_not_in_language_rejected():
    # en-us is a valid voice, but not under Hindi
    r = client.post(
        "/api/tts", json={"text": "hi", "language": "hi", "voice": "en-us"}
    )
    assert r.status_code == 400


@patch(
    "app.routers.tts.generate_speech",
    side_effect=TTSGenerationError("provider down"),
)
def test_tts_provider_failure_returns_503(mock_gen):
    r = client.post(
        "/api/tts", json={"text": "Hello", "language": "en", "voice": "en-us"}
    )
    assert r.status_code == 503
