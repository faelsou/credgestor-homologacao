from typing import Optional

from supabase import Client, create_client

from .settings import get_settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Return a lazily instantiated Supabase client.

    The client uses the Supabase service role key so that this backend can
    orchestrate data across tenants. The instance is cached for reuse across
    requests.
    """

    global _supabase_client

    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    return _supabase_client
