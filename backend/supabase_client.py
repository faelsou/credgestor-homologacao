from typing import Optional

from supabase import Client, create_client

from .settings import get_settings

_supabase_admin_client: Optional[Client] = None
_supabase_anon_client: Optional[Client] = None


def get_supabase_admin_client() -> Client:
    """Return a lazily instantiated Supabase client using the service role key."""

    global _supabase_admin_client

    if _supabase_admin_client is None:
        settings = get_settings()
        _supabase_admin_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    return _supabase_admin_client


def get_supabase_anon_client() -> Client:
    """Return a Supabase client with the anon key for auth flows."""

    global _supabase_anon_client

    if _supabase_anon_client is None:
        settings = get_settings()
        if not settings.supabase_anon_key:
            raise RuntimeError("SUPABASE_ANON_KEY is required for auth operations.")
        _supabase_anon_client = create_client(
            settings.supabase_url, settings.supabase_anon_key
        )

    return _supabase_anon_client


def get_supabase_client() -> Client:
    """Backward-compatible alias for the admin client."""

    return get_supabase_admin_client()
