"""API tests for the AI text-enhancement endpoint.

External Mistral calls are mocked — no real API calls are made.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx

from fastapi.testclient import TestClient

from app.main import app
from app.services import ai_service
from app.services.ai_service import AIServiceUnavailable, enhance_text

client = TestClient(app)


def _mock_response(status_code: int, content: str = "ok") -> MagicMock:
    """Build a fake httpx.Response for the given status code."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    if status_code >= 400:
        err = httpx.HTTPStatusError(
            f"{status_code}", request=MagicMock(), response=resp
        )
        resp.raise_for_status.side_effect = err
    else:
        resp.raise_for_status.return_value = None
    return resp


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


# --- retry-with-backoff behaviour (unit level, no sleeping) ------------------


@patch("app.services.ai_service.time.sleep", return_value=None)
@patch("app.services.ai_service.httpx.post")
def test_enhance_retries_transient_429_then_succeeds(mock_post, mock_sleep):
    """A 429 followed by a 200 should transparently succeed after a retry."""
    mock_post.side_effect = [
        _mock_response(429),
        _mock_response(200, "Fixed text."),
    ]
    with patch.object(ai_service.settings, "mistral_api_key", "test-key"):
        result = enhance_text("helo", "grammar")
    assert result == "Fixed text."
    assert mock_post.call_count == 2
    mock_sleep.assert_called_once()  # backed off once between the two attempts


@patch("app.services.ai_service.time.sleep", return_value=None)
@patch("app.services.ai_service.httpx.post")
def test_enhance_gives_up_after_max_retries(mock_post, mock_sleep):
    """Persistent 429s exhaust retries and raise AIServiceUnavailable."""
    mock_post.return_value = _mock_response(429)
    with patch.object(ai_service.settings, "mistral_api_key", "test-key"):
        try:
            enhance_text("helo", "grammar")
        except AIServiceUnavailable:
            pass
        else:  # pragma: no cover
            raise AssertionError("expected AIServiceUnavailable")
    assert mock_post.call_count == ai_service.MAX_RETRIES


@patch("app.services.ai_service.time.sleep", return_value=None)
@patch("app.services.ai_service.httpx.post")
def test_enhance_does_not_retry_on_401(mock_post, mock_sleep):
    """A bad key (401) fails fast without burning retries."""
    mock_post.return_value = _mock_response(401)
    with patch.object(ai_service.settings, "mistral_api_key", "test-key"):
        try:
            enhance_text("helo", "grammar")
        except AIServiceUnavailable:
            pass
        else:  # pragma: no cover
            raise AssertionError("expected AIServiceUnavailable")
    assert mock_post.call_count == 1
    mock_sleep.assert_not_called()
