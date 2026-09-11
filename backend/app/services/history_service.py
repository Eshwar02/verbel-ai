"""Persistence for speech-generation history, backed by Supabase.

All Supabase reads/writes live here so the router stays thin. RLS on the
`speech_history` table is the real security boundary; we additionally scope
every query by user_id (defence in depth, since the backend uses the
service-role key which bypasses RLS).
"""
from __future__ import annotations

from typing import Any

from app.services.supabase_client import get_client

_TABLE = "speech_history"


def create_record(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Insert a history row for the given user and return the stored row."""
    row = {
        "user_id": user_id,
        "text_preview": payload["text_preview"],
        "language": payload["language"],
        "voice": payload["voice"],
        "audio_url": payload["audio_url"],
    }
    client = get_client()
    result = client.table(_TABLE).insert(row).execute()
    data = getattr(result, "data", None) or []
    if not data:
        raise RuntimeError("Failed to save history record.")
    return data[0]


def list_records(user_id: str) -> list[dict[str, Any]]:
    """Return the user's history rows, newest first."""
    client = get_client()
    result = (
        client.table(_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return getattr(result, "data", None) or []


def delete_record(user_id: str, record_id: str) -> bool:
    """Delete a single record owned by the user. Returns True if a row went."""
    client = get_client()
    result = (
        client.table(_TABLE)
        .delete()
        .eq("id", record_id)
        .eq("user_id", user_id)
        .execute()
    )
    data = getattr(result, "data", None) or []
    return bool(data)
