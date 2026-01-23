"""
Helpers para operações com Supabase incluindo métricas e logging
"""

import logging
import time
from contextlib import contextmanager
from typing import Any, Callable, Dict, Optional

from supabase import Client

from .db_metrics import DatabaseMetrics

logger = logging.getLogger(__name__)

# Timeout padrão para operações (em segundos)
DEFAULT_TIMEOUT = 30.0
CONNECTION_TIMEOUT = 10.0


@contextmanager
def db_operation_metrics(table: str, operation: str):
    """Context manager para registrar métricas de operações de banco"""
    start_time = time.time()
    success = False
    
    try:
        yield
        success = True
    except Exception as e:
        duration = time.time() - start_time
        error_type = type(e).__name__
        
        # Verificar se é timeout
        if "timeout" in str(e).lower() or "timed out" in str(e).lower():
            DatabaseMetrics.record_timeout(operation=operation, timeout_type="request")
            logger.error(f"⏱️  Timeout em {operation} na tabela {table} após {duration:.3f}s: {e}")
        else:
            DatabaseMetrics.record_query_error(
                table=table,
                operation=operation,
                error_type=error_type,
                duration=duration
            )
            logger.error(f"❌ Erro em {operation} na tabela {table} após {duration:.3f}s: {e}")
        
        raise
    finally:
        if success:
            duration = time.time() - start_time
            DatabaseMetrics.record_query_success(
                table=table,
                operation=operation,
                duration=duration
            )
            if duration > 1.0:  # Log apenas se demorar mais de 1 segundo
                logger.warning(f"⚠️  {operation} na tabela {table} demorou {duration:.3f}s")


def execute_with_metrics(
    table: str,
    operation: str,
    func: Callable,
    *args,
    **kwargs
) -> Any:
    """
    Executa uma função com métricas e logging
    
    Args:
        table: Nome da tabela
        operation: Tipo de operação (select, insert, update, delete)
        func: Função a ser executada
        *args, **kwargs: Argumentos para a função
    
    Returns:
        Resultado da função
    """
    with db_operation_metrics(table=table, operation=operation):
        return func(*args, **kwargs)


def test_supabase_connection(client: Client, timeout: float = CONNECTION_TIMEOUT) -> Dict[str, Any]:
    """
    Testa a conexão com Supabase
    
    Args:
        client: Cliente Supabase
        timeout: Timeout em segundos
    
    Returns:
        Dict com status da conexão
    """
    start_time = time.time()
    result = {
        "connected": False,
        "response_time_ms": None,
        "error": None,
        "timestamp": time.time()
    }
    
    try:
        # Testar com uma query simples
        response = client.table("tenants").select("id").limit(1).execute()
        
        duration = (time.time() - start_time) * 1000  # em milissegundos
        
        result["connected"] = True
        result["response_time_ms"] = round(duration, 2)
        
        logger.info(f"✅ Teste de conexão bem-sucedido: {duration:.2f}ms")
        
        # Registrar métrica
        DatabaseMetrics.record_connection_success(duration / 1000)  # converter para segundos
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        result["error"] = str(e)
        result["response_time_ms"] = round(duration, 2)
        
        error_type = type(e).__name__
        is_timeout = duration >= (timeout * 1000) or "timeout" in str(e).lower()
        
        if is_timeout:
            DatabaseMetrics.record_timeout(operation="health_check", timeout_type="connection")
            logger.error(f"⏱️  Timeout no teste de conexão após {duration:.2f}ms: {e}")
        else:
            DatabaseMetrics.record_connection_error(
                error_type=error_type,
                operation="health_check"
            )
            logger.error(f"❌ Erro no teste de conexão após {duration:.2f}ms: {e}")
    
    return result
