from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    The Supabase service role key is required because this backend aggregates
    data for multiple tenants and needs to bypass row-level security. Keep the
    key secret and never expose it to the frontend.
    """

    model_config = SettingsConfigDict(
        # Tenta carregar do .env se existir (desenvolvimento local)
        # Em produção, as variáveis vêm do ambiente do container Docker
        env_file=ROOT_DIR / ".env" if (ROOT_DIR / ".env").exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignora variáveis de ambiente extras (ex: VITE_* para frontend)
    )

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str | None = None
    default_tenant_id: str | None = None
    frontend_url: str | None = None  # URL do frontend para redirects (ex: https://credgestor.app.br)
    
    # Configurações de timeout para Supabase (em segundos)
    supabase_timeout: float = 30.0  # Timeout padrão para requisições
    supabase_connection_timeout: float = 10.0  # Timeout para estabelecer conexão
    
    # Configurações OpenTelemetry
    otel_service_name: str = "credgestor-api"
    otel_service_version: str = "0.1.0"
    otel_exporter_otlp_endpoint: str | None = None  # Ex: http://localhost:4318
    otel_exporter_otlp_headers: str | None = None  # Ex: "key1=value1,key2=value2"
    otel_traces_exporter: str = "otlp"  # otlp, console, none
    otel_metrics_exporter: str = "otlp"  # otlp, console, none
    otel_logs_exporter: str = "otlp"  # otlp, console, none
    otel_resource_attributes: str | None = None  # Ex: "service.name=api,service.version=1.0"
    
    @field_validator('supabase_anon_key', 'default_tenant_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        """Converte strings vazias em None."""
        if v == "":
            return None
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance to avoid reloading env vars."""

    return Settings()
