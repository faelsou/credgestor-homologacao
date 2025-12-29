from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    The Supabase service role key is required because this backend aggregates
    data for multiple tenants and needs to bypass row-level security. Keep the
    key secret and never expose it to the frontend.
    """

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance to avoid reloading env vars."""

    return Settings()
