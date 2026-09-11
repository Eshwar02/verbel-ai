"""Cloud-synced generation history routes (authenticated).

    POST   /api/history       — save a generation for the current user
    GET    /api/history       — list the current user's records
    DELETE /api/history/{id}  — delete one of the current user's records

Auth: a Supabase user JWT is expected in the `Authorization: Bearer <token>`
header. Missing/invalid tokens → 401. Supabase misconfiguration → 503.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from app.schemas.history import (
    HistoryCreate,
    HistoryCreateResponse,
    HistoryListResponse,
    HistoryRecord,
)
from app.services import history_service
from app.services.supabase_client import SupabaseUnavailable, verify_token

router = APIRouter(prefix="/api", tags=["history"])


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency: extract + verify the bearer token, return user id."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        return verify_token(token)
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/history", response_model=HistoryCreateResponse)
def save_history(
    payload: HistoryCreate, user_id: str = Depends(current_user_id)
) -> HistoryCreateResponse:
    try:
        row = history_service.create_record(user_id, payload.model_dump())
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not save: {exc}") from exc
    return HistoryCreateResponse(record=HistoryRecord(**row))


@router.get("/history", response_model=HistoryListResponse)
def list_history(user_id: str = Depends(current_user_id)) -> HistoryListResponse:
    try:
        rows = history_service.list_records(user_id)
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not list: {exc}") from exc
    return HistoryListResponse(records=[HistoryRecord(**r) for r in rows])


@router.delete("/history/{record_id}")
def delete_history(
    record_id: str, user_id: str = Depends(current_user_id)
) -> dict:
    try:
        deleted = history_service.delete_record(user_id, record_id)
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not delete: {exc}") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"success": True}
