import logging
import time
from typing import Optional

from supabase import Client, create_client

from .settings import get_settings

# Configurar logger
logger = logging.getLogger(__name__)

_supabase_admin_client: Optional[Client] = None
_supabase_anon_client: Optional[Client] = None


def get_supabase_admin_client() -> Client:
    """Return a lazily instantiated Supabase client using the service role key."""

    global _supabase_admin_client

    if _supabase_admin_client is None:
        start_time = time.time()
        settings = get_settings()
        
        if not settings.supabase_url:
            logger.error("SUPABASE_URL não está configurada")
            raise RuntimeError(
                "SUPABASE_URL não está configurada. Defina a variável de ambiente."
            )
        if not settings.supabase_service_role_key:
            logger.error("SUPABASE_SERVICE_ROLE_KEY não está configurada")
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY não está configurada. Defina a variável de ambiente."
            )
        
        try:
            logger.info(
                f"🔌 Criando cliente Supabase Admin: {settings.supabase_url} "
                f"(timeout: {settings.supabase_timeout}s, connection: {settings.supabase_connection_timeout}s)"
            )
            
            # Criar cliente Supabase
            # Nota: O Supabase client usa httpx internamente, mas não expõe configuração direta de timeout
            # Os timeouts serão gerenciados via métricas e logging nas operações
            _supabase_admin_client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            connection_time = time.time() - start_time
            logger.info(f"✅ Cliente Supabase Admin criado com sucesso em {connection_time:.3f}s")
            
            # Registrar métrica de conexão bem-sucedida
            try:
                from .db_metrics import DatabaseMetrics
                DatabaseMetrics.record_connection_success(connection_time)
            except ImportError:
                pass  # Métricas não disponíveis
            
        except Exception as e:
            connection_time = time.time() - start_time
            logger.error(f"❌ Erro ao criar cliente Supabase Admin após {connection_time:.3f}s: {e}")
            
            # Registrar métrica de erro de conexão
            try:
                from .db_metrics import DatabaseMetrics
                DatabaseMetrics.record_connection_error(
                    error_type=type(e).__name__,
                    operation="create_admin_client"
                )
            except ImportError:
                pass  # Métricas não disponíveis
            
            raise

    return _supabase_admin_client


def get_supabase_anon_client() -> Client:
    """Return a Supabase client with the anon key for auth flows."""

    global _supabase_anon_client

    if _supabase_anon_client is None:
        start_time = time.time()
        settings = get_settings()
        
        if not settings.supabase_url:
            logger.error("SUPABASE_URL não está configurada")
            raise RuntimeError(
                "SUPABASE_URL não está configurada. Defina a variável de ambiente."
            )
        if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
            logger.error("SUPABASE_ANON_KEY não está configurada")
            raise RuntimeError(
                "SUPABASE_ANON_KEY é obrigatória para operações de autenticação. Defina a variável de ambiente."
            )
        
        try:
            logger.info(
                f"🔌 Criando cliente Supabase Anon: {settings.supabase_url} "
                f"(timeout: {settings.supabase_timeout}s, connection: {settings.supabase_connection_timeout}s)"
            )
            
            # Criar cliente Supabase
            # Nota: O Supabase client usa httpx internamente, mas não expõe configuração direta de timeout
            # Os timeouts serão gerenciados via métricas e logging nas operações
            _supabase_anon_client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            connection_time = time.time() - start_time
            logger.info(f"✅ Cliente Supabase Anon criado com sucesso em {connection_time:.3f}s")
            
            # Registrar métrica de conexão bem-sucedida
            try:
                from .db_metrics import DatabaseMetrics
                DatabaseMetrics.record_connection_success(connection_time)
            except ImportError:
                pass  # Métricas não disponíveis
            
        except Exception as e:
            connection_time = time.time() - start_time
            logger.error(f"❌ Erro ao criar cliente Supabase Anon após {connection_time:.3f}s: {e}")
            
            # Registrar métrica de erro de conexão
            try:
                from .db_metrics import DatabaseMetrics
                DatabaseMetrics.record_connection_error(
                    error_type=type(e).__name__,
                    operation="create_anon_client"
                )
            except ImportError:
                pass  # Métricas não disponíveis
            
            raise

    return _supabase_anon_client


def get_supabase_client() -> Client:
    """Backward-compatible alias for the admin client."""

    return get_supabase_admin_client()
