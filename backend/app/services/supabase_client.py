"""Supabase client + auth helpers (backend-only, service-role).

Isolated behind a small module so routers depend on functions here rather than
the supabase SDK directly. Raises SupabaseUnavailable when configuration is
missing so routers can map it to HTTP 503.

Required environment variables:
    SUPABASE_URL          — project URL, e.g. https://<ref>.supabase.co
    SUPABASE_SERVICE_KEY  — service-role key (NEVER expose to the frontend)

Optional:
    SUPABASE_ANON_KEY     — public anon key (used for email/password auth flows)
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from app.config import settings

try:  # supabase is an optional/late dependency; import lazily-friendly
    from supabase import Client, create_client
except Exception:  # pragma: no cover - only hit when package missing
    Client = Any  # type: ignore[assignment,misc]
    create_client = None  # type: ignore[assignment]

_HISTORY_TABLE = "speech_history"


class SupabaseUnavailable(Exception):
    """Raised when Supabase is not configured or the SDK is missing."""


def _config_value(name: str) -> str | None:
    """Read a setting from pydantic settings first, then the raw environment.

    pydantic-settings loads .env into the Settings object but not into
    os.environ, so we check both. `name` is the UPPER_SNAKE env var name.
    """
    attr = name.lower()
    value = getattr(settings, attr, None)
    if value:
        return value
    return os.getenv(name)


def _require_env(name: str) -> str:
    value = _config_value(name)
    if not value:
        raise SupabaseUnavailable(
            f"Missing required environment variable: {name}"
        )
    return value


@lru_cache(maxsize=1)
def get_client() -> "Client":
    """Return a service-role Supabase client (cached).

    Raises SupabaseUnavailable if the SDK is not installed or the required
    env vars are missing.
    """
    if create_client is None:
        raise SupabaseUnavailable(
            "The 'supabase' python package is not installed."
        )
    url = _require_env("SUPABASE_URL")
    key = _require_env("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


@lru_cache(maxsize=1)
def get_auth_client() -> "Client":
    """Return a client keyed by the anon key for email/password auth.

    Falls back to the service-role key if no anon key is configured (sign
    in / sign up work with either, but the anon key is the conventional one
    for user-facing auth).
    """
    if create_client is None:
        raise SupabaseUnavailable(
            "The 'supabase' python package is not installed."
        )
    url = _require_env("SUPABASE_URL")
    key = _config_value("SUPABASE_ANON_KEY") or _require_env("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def verify_token(access_token: str) -> str:
    """Verify a user JWT and return the authenticated user's id.

    Uses the Supabase client's auth.get_user(), which validates the token
    against the project. Raises ValueError on any invalid/expired token.
    """
    if not access_token:
        raise ValueError("Missing access token.")
    client = get_client()
    try:
        response = client.auth.get_user(access_token)
    except Exception as exc:  # network / SDK errors
        raise ValueError(f"Could not verify token: {exc}") from exc

    user = getattr(response, "user", None)
    user_id = getattr(user, "id", None) if user is not None else None
    if not user_id:
        raise ValueError("Invalid or expired token.")
    return str(user_id)
