"""Application configuration, loaded from environment / .env."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Text limits
    max_text_length: int = 5000

    # Where generated mp3 files are written (served at /audio)
    audio_dir: Path = BASE_DIR / "generated_audio"

    # CORS: comma-separated origins allowed to call the API
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AI text enhancement (POST /api/enhance) — Mistral
    mistral_api_key: str | None = None

    # Supabase (auth + cloud history); backend-only service key
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_jwt_secret: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
settings.audio_dir.mkdir(parents=True, exist_ok=True)
