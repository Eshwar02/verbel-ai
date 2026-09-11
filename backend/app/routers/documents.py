"""Document extraction API route: POST /api/extract."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.schemas.documents import ExtractResponse
from app.services.document_service import DocumentExtractionError, extract_text

router = APIRouter(prefix="/api", tags=["documents"])

# Max upload size (~5 MB).
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/extract", response_model=ExtractResponse)
async def extract_document(file: UploadFile = File(...)) -> ExtractResponse:
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    # --- extension validation ---
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {ext or '(none)'}. "
                "Supported types are: .pdf, .docx, .txt."
            ),
        )

    data = await file.read()

    # --- size validation ---
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # --- extraction ---
    try:
        text = extract_text(filename, data, max_chars=settings.max_text_length)
    except DocumentExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # unexpected failure
        raise HTTPException(
            status_code=500, detail=f"Unexpected error extracting document: {exc}"
        ) from exc

    return ExtractResponse(
        success=True, text=text, chars=len(text), filename=filename
    )
