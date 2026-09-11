"""API tests for the document-extraction endpoint."""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_extract_txt_returns_text():
    content = b"Hello world.\n\n\nThis is a sample document."
    files = {"file": ("sample.txt", io.BytesIO(content), "text/plain")}
    r = client.post("/api/extract", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["filename"] == "sample.txt"
    assert "Hello world." in body["text"]
    assert "This is a sample document." in body["text"]
    assert body["chars"] == len(body["text"])


def test_extract_unsupported_extension_rejected():
    files = {"file": ("image.png", io.BytesIO(b"\x89PNG\r\n"), "image/png")}
    r = client.post("/api/extract", files=files)
    assert r.status_code == 400


def test_extract_empty_file_rejected():
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    r = client.post("/api/extract", files=files)
    assert r.status_code == 400
