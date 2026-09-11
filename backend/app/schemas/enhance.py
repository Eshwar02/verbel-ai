"""Pydantic request/response models for the AI text-enhancement API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class EnhanceRequest(BaseModel):
    text: str = Field(..., description="Text to enhance")
    action: str = Field(
        ...,
        description="One of: summarize, grammar, rewrite, conversational",
    )


class EnhanceResponse(BaseModel):
    success: bool = True
    text: str
    action: str
