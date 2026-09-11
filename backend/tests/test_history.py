"""Tests for the cloud history + auth routes.

The Supabase service layer is fully mocked — no network, no real DB. The
history router must be mountable even if the `supabase` package is absent
(its import is guarded), so these tests build a minimal app that includes the
router directly rather than depending on main.py wiring.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import history as history_router
from app.services.supabase_client import SupabaseUnavailable

app = FastAPI()
app.include_router(history_router.router)
client = TestClient(app)

_ROW = {
    "id": "11111111-1111-1111-1111-111111111111",
    "text_preview": "Hello world",
    "language": "en",
    "voice": "en-us",
    "audio_url": "/audio/abc.mp3",
    "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc).isoformat(),
}


# --- auth gating ---------------------------------------------------------

def test_list_without_token_is_401():
    r = client.get("/api/history")
    assert r.status_code == 401


def test_save_without_token_is_401():
    r = client.post("/api/history", json={
        "text_preview": "x", "language": "en", "voice": "en-us",
        "audio_url": "/audio/x.mp3",
    })
    assert r.status_code == 401


def test_malformed_auth_header_is_401():
    r = client.get("/api/history", headers={"Authorization": "Token abc"})
    assert r.status_code == 401


# --- authenticated flows (mocked service layer) --------------------------

@patch("app.routers.history.verify_token", return_value="user-123")
@patch("app.routers.history.history_service.create_record", return_value=_ROW)
def test_save_authenticated(mock_create, mock_verify):
    r = client.post(
        "/api/history",
        headers={"Authorization": "Bearer valid.jwt.token"},
        json={
            "text_preview": "Hello world", "language": "en", "voice": "en-us",
            "audio_url": "/audio/abc.mp3",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["record"]["id"] == _ROW["id"]
    mock_verify.assert_called_once_with("valid.jwt.token")
    args, _ = mock_create.call_args
    assert args[0] == "user-123"


@patch("app.routers.history.verify_token", return_value="user-123")
@patch("app.routers.history.history_service.list_records", return_value=[_ROW])
def test_list_authenticated(mock_list, mock_verify):
    r = client.get(
        "/api/history", headers={"Authorization": "Bearer valid.jwt.token"}
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["records"]) == 1
    assert body["records"][0]["voice"] == "en-us"
    mock_list.assert_called_once_with("user-123")


@patch("app.routers.history.verify_token", return_value="user-123")
@patch("app.routers.history.history_service.delete_record", return_value=True)
def test_delete_authenticated(mock_del, mock_verify):
    r = client.delete(
        f"/api/history/{_ROW['id']}",
        headers={"Authorization": "Bearer valid.jwt.token"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True
    mock_del.assert_called_once_with("user-123", _ROW["id"])


@patch("app.routers.history.verify_token", return_value="user-123")
@patch("app.routers.history.history_service.delete_record", return_value=False)
def test_delete_missing_is_404(mock_del, mock_verify):
    r = client.delete(
        "/api/history/does-not-exist",
        headers={"Authorization": "Bearer valid.jwt.token"},
    )
    assert r.status_code == 404


@patch(
    "app.routers.history.verify_token",
    side_effect=SupabaseUnavailable("Missing SUPABASE_URL"),
)
def test_supabase_unavailable_is_503(mock_verify):
    r = client.get(
        "/api/history", headers={"Authorization": "Bearer any.token"}
    )
    assert r.status_code == 503


@patch(
    "app.routers.history.verify_token",
    side_effect=ValueError("Invalid or expired token."),
)
def test_invalid_token_is_401(mock_verify):
    r = client.get(
        "/api/history", headers={"Authorization": "Bearer bad.token"}
    )
    assert r.status_code == 401
