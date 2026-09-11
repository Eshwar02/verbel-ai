"""Document text extraction — PDF / DOCX / TXT.

Isolated behind a single function so the parsing backends can be swapped without
touching routers or validation. Raises DocumentExtractionError on any unsupported
type or parse failure so the router can map it to HTTP 400.
"""
from __future__ import annotations

import io
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader


class DocumentExtractionError(Exception):
    """Raised for unsupported file types or when parsing fails."""


_SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def _normalize_whitespace(text: str) -> str:
    """Collapse runs of blank lines / trailing spaces into a tidy block."""
    # Normalize line endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Strip trailing whitespace per line.
    lines = [line.strip() for line in text.split("\n")]
    # Collapse 3+ consecutive blank lines into a single blank line.
    normalized = "\n".join(lines)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def _extract_docx(data: bytes) -> str:
    document = Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs)


def _extract_txt(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="replace")


def extract_text(filename: str, data: bytes, max_chars: int | None = None) -> str:
    """Extract plain text from a PDF/DOCX/TXT byte payload.

    Args:
        filename: Original filename; only the extension is used to route parsing.
        data: Raw file bytes.
        max_chars: Optional cap on the returned character count.

    Returns:
        Normalized plain text.

    Raises:
        DocumentExtractionError: unsupported extension or parse failure.
    """
    ext = Path(filename or "").suffix.lower()
    if ext not in _SUPPORTED_EXTENSIONS:
        raise DocumentExtractionError(
            f"Unsupported file type: {ext or '(none)'}. "
            "Supported types are: .pdf, .docx, .txt."
        )

    try:
        if ext == ".pdf":
            text = _extract_pdf(data)
        elif ext == ".docx":
            text = _extract_docx(data)
        else:  # .txt
            text = _extract_txt(data)
    except DocumentExtractionError:
        raise
    except Exception as exc:  # any parser/backend failure
        raise DocumentExtractionError(
            f"Failed to extract text from {filename!r}: {exc}"
        ) from exc

    text = _normalize_whitespace(text)

    if max_chars is not None and max_chars >= 0:
        text = text[:max_chars]

    return text
