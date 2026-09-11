"""API tests for the AI text-enhancement endpoint.

External Claude calls are mocked — no real API calls are made.
"""
from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_service import AIServiceUnavailable

client = TestClient(app)


@patch("app.routers.enhance.enhance_text", return_value="Cleaned up text.")
def test_enhance_success(mock_enhance):
    r = client.post(
        "/api/enhance", json={"text": "helo wrld", "action": "grammar"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["text"] == "Cleaned up text."
    assert body["action"] == "grammar"
    mock_enhance.assert_called_once()


def test_enhance_empty_text_rejected():
    r = client.post("/api/enhance", json={"text": "   ", "action": "grammar"})
    assert r.status_code == 400


def test_enhance_bad_action_rejected():
    r = client.post(
        "/api/enhance", json={"text": "hello", "action": "translate"}
    )
    assert r.status_code == 400


@patch(
    "app.routers.enhance.enhance_text",
    side_effect=AIServiceUnavailable("no api key"),
)
def test_enhance_service_unavailable_returns_503(mock_enhance):
    r = client.post(
        "/api/enhance", json={"text": "hello", "action": "summarize"}
    )
    assert r.status_code == 503
