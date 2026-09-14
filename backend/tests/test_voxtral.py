"""Tests for the Voxtral neural TTS engine and engine selection.

External Mistral/Voxtral calls are mocked — no real API calls are made.
"""
from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import voxtral
from app.services.voxtral import VoxtralError

client = TestClient(app)


# --- catalog ----------------------------------------------------------------


def test_voices_includes_neural_block():
    r = client.get("/api/voices")
    assert r.status_code == 200
    data = r.json()
    assert "neural" in data
    assert "available" in data["neural"]
    en = next(l for l in data["neural"]["languages"] if l["code"] == "en")
    assert any(v["id"] == "en_paul_neutral" for v in en["voices"])


def test_neural_catalog_presets_count():
    # Paul 8 + Oliver 7 + Jane 9 + Marie 6 = 30 enumerated preset voices.
    total = sum(len(l.voices) for l in voxtral.NEURAL_CATALOG)
    assert total == 30


# --- engine routing ---------------------------------------------------------


@patch("app.routers.tts.settings")
@patch("app.routers.tts.generate_neural", return_value="neural123.mp3")
def test_neural_engine_success(mock_neural, mock_settings):
    mock_settings.neural_tts_available = True
    mock_settings.max_text_length = 5000
    r = client.post(
        "/api/tts",
        json={
            "text": "Hello from Voxtral",
            "language": "en",
            "voice": "en_paul_neutral",
            "engine": "neural",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["audio_url"] == "/audio/neural123.mp3"
    assert body["engine_used"] == "neural"
    mock_neural.assert_called_once()


@patch("app.routers.tts.settings")
def test_neural_engine_503_when_key_missing(mock_settings):
    mock_settings.neural_tts_available = False
    mock_settings.max_text_length = 5000
    r = client.post(
        "/api/tts",
        json={
            "text": "Hello",
            "language": "en",
            "voice": "en_paul_neutral",
            "engine": "neural",
        },
    )
    assert r.status_code == 503


@patch("app.routers.tts.settings")
def test_neural_engine_bad_voice_rejected(mock_settings):
    mock_settings.neural_tts_available = True
    mock_settings.max_text_length = 5000
    r = client.post(
        "/api/tts",
        json={
            "text": "Hello",
            "language": "en",
            "voice": "en-us",  # a gTTS voice, not a Voxtral one
            "engine": "neural",
        },
    )
    assert r.status_code == 400


@patch("app.routers.tts.settings")
@patch("app.routers.tts.generate_speech", return_value="fallback.mp3")
@patch(
    "app.routers.tts.generate_neural",
    side_effect=VoxtralError("429 rate limited"),
)
def test_neural_falls_back_to_gtts_on_failure(
    mock_neural, mock_gtts, mock_settings
):
    mock_settings.neural_tts_available = True
    mock_settings.max_text_length = 5000
    r = client.post(
        "/api/tts",
        json={
            "text": "Hello",
            "language": "en",
            "voice": "en_paul_neutral",
            "engine": "neural",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["audio_url"] == "/audio/fallback.mp3"
    assert body["engine_used"] == "standard"  # fell back
    mock_gtts.assert_called_once()


# --- generation unit (mocked httpx) -----------------------------------------


@patch("app.services.voxtral.httpx.post")
def test_generate_neural_writes_raw_audio(mock_post, tmp_path):
    resp = mock_post.return_value
    resp.status_code = 200
    resp.headers = {"content-type": "audio/mpeg"}
    resp.content = b"ID3fakeaudio"
    resp.raise_for_status.return_value = None
    with patch.object(voxtral.settings, "mistral_api_key", "test-key"), patch.object(
        voxtral.settings, "audio_dir", tmp_path
    ):
        filename = voxtral.generate_speech("hi", "en_paul_neutral")
    assert filename.endswith(".mp3")
    assert (tmp_path / filename).read_bytes() == b"ID3fakeaudio"


def test_generate_neural_without_key_raises():
    with patch.object(voxtral.settings, "mistral_api_key", None):
        try:
            voxtral.generate_speech("hi", "en_paul_neutral")
        except VoxtralError:
            pass
        else:  # pragma: no cover
            raise AssertionError("expected VoxtralError")
