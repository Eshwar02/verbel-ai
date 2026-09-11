"""Thin auth routes proxying to Supabase Auth (email + password).

    POST /api/auth/signup — create an account, return the session
    POST /api/auth/login  — sign in, return the access token / session

Supabase misconfiguration → 503. Bad credentials → 401. Other failures → 400.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import auth_service
from app.services.auth_service import AuthError
from app.services.supabase_client import SupabaseUnavailable

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(..., description="Account email")
    password: str = Field(..., min_length=6, description="Account password")


@router.post("/signup")
def signup(payload: Credentials) -> dict:
    try:
        return auth_service.sign_up(payload.email, payload.password)
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.message) from exc


@router.post("/login")
def login(payload: Credentials) -> dict:
    try:
        return auth_service.sign_in(payload.email, payload.password)
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.message) from exc
