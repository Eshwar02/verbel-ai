"""AI text-enhancement route: POST /api/enhance."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.enhance import EnhanceRequest, EnhanceResponse
from app.services.ai_service import (
    SUPPORTED_ACTIONS,
    AIServiceUnavailable,
    enhance_text,
)

router = APIRouter(prefix="/api", tags=["ai"])


@router.post("/enhance", response_model=EnhanceResponse)
def enhance(payload: EnhanceRequest) -> EnhanceResponse:
    text = payload.text.strip()

    # --- validation ---
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")
    if payload.action not in SUPPORTED_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported action: {payload.action!r}. "
                f"Must be one of: {', '.join(SUPPORTED_ACTIONS)}."
            ),
        )

    # --- enhancement ---
    try:
        result = enhance_text(text, payload.action)
    except AIServiceUnavailable as exc:
        raise HTTPException(
            status_code=503, detail=f"AI service unavailable: {exc}"
        ) from exc

    return EnhanceResponse(success=True, text=result, action=payload.action)
