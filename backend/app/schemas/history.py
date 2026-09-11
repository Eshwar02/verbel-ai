"""Pydantic models for cloud-synced generation history."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class HistoryCreate(BaseModel):
    """Payload to save a generation for the authenticated user."""

    text_preview: str = Field(..., description="Short preview of the source text")
    language: str = Field(..., description="Language code, e.g. 'en'")
    voice: str = Field(..., description="Voice id used for the generation")
    audio_url: str = Field(..., description="URL/path of the generated audio")
    tags: list[str] = Field(default_factory=list, description="Optional labels")


class HistoryRecord(BaseModel):
    """A single stored history record."""

    id: str
    text_preview: str
    language: str
    voice: str
    audio_url: str
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class HistoryTagsUpdate(BaseModel):
    tags: list[str] = Field(default_factory=list)


class HistoryListResponse(BaseModel):
    success: bool = True
    records: list[HistoryRecord] = Field(default_factory=list)


class HistoryCreateResponse(BaseModel):
    success: bool = True
    record: HistoryRecord
