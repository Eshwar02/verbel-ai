"""Pydantic response models for the document-extraction API."""
from __future__ import annotations

from pydantic import BaseModel


class ExtractResponse(BaseModel):
    success: bool = True
    text: str
    chars: int
    filename: str
