"""Tests for automatic language detection (POST /api/detect-language)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_detect_english_maps_to_catalog():
    r = client.post(
        "/api/detect-language",
        json={"text": "Hello there, welcome to our application today."},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["supported"] is True
    assert body["language_code"] == "en"
    assert body["language_name"] == "English"
    assert body["voice_id"]  # a default voice is suggested
    assert 0.0 <= body["confidence"] <= 1.0


def test_detect_french():
    r = client.post(
        "/api/detect-language",
        json={"text": "Bonjour, bienvenue dans notre application aujourd'hui."},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["language_code"] == "fr"
    assert body["supported"] is True


def test_detect_unsupported_language_returns_supported_false():
    # Japanese is not in the gTTS catalog we expose.
    r = client.post(
        "/api/detect-language",
        json={"text": "こんにちは、これはテストです。よろしくお願いします。"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["supported"] is False
    assert body["language_code"] is None


def test_detect_empty_text_rejected():
    r = client.post("/api/detect-language", json={"text": "   "})
    assert r.status_code == 400
