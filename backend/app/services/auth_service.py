"""Email/password auth flows proxied to Supabase Auth.

Keeps the supabase SDK calls out of the router. Raises AuthError with an
appropriate HTTP-ish status hint so the router can map failures cleanly.
"""
from __future__ import annotations

from typing import Any

from app.services.supabase_client import get_auth_client


class AuthError(Exception):
    """Raised when a sign-up or login fails. status is 400 or 401."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _serialize(response: Any) -> dict[str, Any]:
    """Flatten a Supabase auth response into a JSON-friendly dict."""
    session = getattr(response, "session", None)
    user = getattr(response, "user", None)

    access_token = getattr(session, "access_token", None) if session else None
    refresh_token = getattr(session, "refresh_token", None) if session else None
    expires_at = getattr(session, "expires_at", None) if session else None

    user_out = None
    if user is not None:
        user_out = {
            "id": str(getattr(user, "id", "") or ""),
            "email": getattr(user, "email", None),
        }

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "user": user_out,
    }


def sign_up(email: str, password: str) -> dict[str, Any]:
    client = get_auth_client()
    try:
        response = client.auth.sign_up({"email": email, "password": password})
    except Exception as exc:
        raise AuthError(str(exc), status=400) from exc
    return _serialize(response)


def sign_in(email: str, password: str) -> dict[str, Any]:
    client = get_auth_client()
    try:
        response = client.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except Exception as exc:
        raise AuthError(str(exc), status=401) from exc

    data = _serialize(response)
    if not data.get("access_token"):
        raise AuthError("Invalid email or password.", status=401)
    return data
