import json
import os
import hmac
import hashlib
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple
import hmac
import hashlib
import time

from fastapi import Body, Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
# Importar EmailStr e field_validator de forma opcional para compatibilidade
try:
    from pydantic import EmailStr, field_validator
    PYDANTIC_V2_FEATURES = True
except ImportError:
    # Fallback para versões antigas do Pydantic
    PYDANTIC_V2_FEATURES = False
    EmailStr = str  # Usar str como fallback
    def field_validator(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
from prometheus_fastapi_instrumentator import Instrumentator

# Importar slowapi de forma opcional para não quebrar se não estiver instalado
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False
    print("⚠️  Aviso: slowapi não está disponível. Rate limiting desabilitado.")

from .settings import get_settings
from .supabase_client import (
    get_supabase_admin_client,
    get_supabase_anon_client,
    get_supabase_client,
)
from .supabase_helpers import test_supabase_connection
from .otel_config import setup_opentelemetry

# Importar métricas de banco de dados no nível do módulo para garantir que sejam registradas
# no registry do Prometheus e expostas no endpoint /metrics
from .db_metrics import (
    db_connection_errors_total,
    db_connection_status,
    db_connection_duration_seconds,
    db_query_duration_seconds,
    db_query_errors_total,
    db_timeouts_total,
    db_last_successful_query_timestamp,
    db_last_failed_query_timestamp,
    DatabaseMetrics,
)

app = FastAPI(title="CredGestor Supabase backend", version="0.1.0")

# Configurar Rate Limiting
# Nota: slowapi requer que o limiter seja inicializado antes de usar nos decoradores
limiter = None
if SLOWAPI_AVAILABLE:
    try:
        limiter = Limiter(key_func=get_remote_address)
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        print("✅ Rate limiting habilitado com slowapi")
    except Exception as e:
        print(f"⚠️  Aviso: Erro ao inicializar rate limiting: {e}")
        limiter = None

# Criar um objeto dummy que aceita o decorador mas não faz nada se slowapi não estiver disponível
if limiter is None:
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator
    limiter = DummyLimiter()
    print("⚠️  Rate limiting desabilitado (slowapi não disponível)")

# Configurar CORS de forma mais segura
# Permitir apenas origens específicas em produção
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
if allowed_origins == ["*"]:
    # Em desenvolvimento, permitir todas as origens
    # Em produção, configure ALLOWED_ORIGINS com origens específicas
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Configurar OpenTelemetry (deve ser feito antes da instrumentação do Prometheus)
setup_opentelemetry(app)

# Instrumentação Prometheus para métricas da API
instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health"],  # Exclui endpoints de métricas e health
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
)
instrumentator.instrument(app).expose(app)

TENANT_TABLES: Dict[str, str] = {
    "clients": "tenant_id",
    "loans": "tenant_id",
    "installments": "tenant_id",
    "experiences": "tenant_id",
    "historic_scores": "tenant_id",
    "login_audit": "tenant_id",
    "tenant_roles": "tenant_id",
    "tenant_users": "tenant_id",
    "role_permissions": "tenant_id",
    "custom_domains": "tenant_id",
    "user_sessions": "tenant_id",
}
GLOBAL_TABLES = {"tenants", "users"}

bearer_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str = Field(..., description="Email do usuário", min_length=1)
    senha: str = Field(..., min_length=8, max_length=128, description="Senha do usuário")
    tenant_id: str | None = Field(None, description="ID do tenant (UUID)")
    
    def __init__(self, **data):
        # Validação e sanitização da senha
        if 'senha' in data:
            senha = data.get('senha', '')
            if not senha or len(senha.strip()) == 0:
                raise ValueError("Senha não pode estar vazia")
            if len(senha.strip()) < 8:
                raise ValueError("Senha deve ter no mínimo 8 caracteres")
            data['senha'] = senha.strip()
        
        # Validação básica de email
        if 'email' in data:
            email = data.get('email', '').strip()
            if not email or '@' not in email:
                raise ValueError("Email inválido")
            data['email'] = email.lower()
        
        super().__init__(**data)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    password: str
    # O token/hash vem do link do email do Supabase
    # Pode ser passado como query param ou no body
    token_hash: str | None = None


@dataclass
class AuthContext:
    user_id: str
    email: str
    tenant_id: str | None
    role: str | None
    access_token: str


@app.on_event("startup")
def ensure_client() -> None:
    """Warm up the Supabase client on startup e registra métricas."""
    try:
        # Warm up do cliente Supabase
        get_supabase_client()
        
        # Inicializar status de conexão
        DatabaseMetrics.record_connection_success(0.0)  # Marcar como conectado
        
    except Exception as e:
        # Log error but don't crash the server - allows healthcheck to work
        print(
            f"⚠️  Aviso: Não foi possível inicializar o cliente Supabase no startup: {e}"
        )
        print(
            "   O servidor continuará rodando, mas operações que requerem Supabase falharão."
        )


def _format_error(error: Any) -> str:
    if error is None:
        return "Unknown Supabase error"
    if isinstance(error, Exception):
        return str(error)
    return getattr(error, "message", str(error))


def _apply_filters(table: str, filters: List[Tuple[str, Any]] | None = None):
    try:
        from .supabase_helpers import db_operation_metrics
        
        with db_operation_metrics(table=table, operation="select"):
            supabase = get_supabase_admin_client()
            query = supabase.table(table).select("*")
            # DEBUG: Log dos filtros aplicados
            if filters:
                print(f"🔍 [DEBUG] Aplicando filtros na tabela '{table}':")
                for column, value in filters:
                    print(f"   - {column} = {value}")
                query = query.eq(column, value)
            else:
                print(f"⚠️  [DEBUG] ATENÇÃO: Nenhum filtro aplicado na tabela '{table}'!")
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise HTTPException(status_code=500, detail=_format_error(error))
            result_count = len(response.data or [])
            print(f"✅ [DEBUG] Retornando {result_count} registros da tabela '{table}'")
            return response.data or []
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao consultar banco de dados: {str(e)}"
        )


def _insert_row(table: str, payload: Dict[str, Any]):
    try:
        from .supabase_helpers import db_operation_metrics
        
        with db_operation_metrics(table=table, operation="insert"):
            supabase = get_supabase_admin_client()
            response = supabase.table(table).insert(payload).execute()
            error = getattr(response, "error", None)
            if error:
                error_type = type(error).__name__ if hasattr(error, '__class__') else "database_error"
                DatabaseMetrics.record_crud_error(table, "insert", error_type, 400)
                raise HTTPException(status_code=400, detail=_format_error(error))
            return response.data or []
    except HTTPException:
        raise
    except RuntimeError as e:
        DatabaseMetrics.record_crud_error(table, "insert", "configuration_error", 500)
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        error_type = type(e).__name__
        DatabaseMetrics.record_crud_error(table, "insert", error_type, 500)
        raise HTTPException(
            status_code=500, detail=f"Erro ao inserir no banco de dados: {str(e)}"
        )


def _update_row(
    table: str,
    record_id: str,
    payload: Dict[str, Any],
    tenant_filter: Tuple[str, Any] | None = None,
):
    try:
        from .supabase_helpers import db_operation_metrics
        
        with db_operation_metrics(table=table, operation="update"):
            supabase = get_supabase_admin_client()
            query = supabase.table(table).update(payload).eq("id", record_id)

            if tenant_filter:
                column, value = tenant_filter
                query = query.eq(column, value)

            response = query.execute()

            error = getattr(response, "error", None)
            if error:
                error_type = type(error).__name__ if hasattr(error, '__class__') else "database_error"
                DatabaseMetrics.record_crud_error(table, "update", error_type, 400)
                raise HTTPException(status_code=400, detail=_format_error(error))

            return response.data or []
    except HTTPException:
        raise
    except RuntimeError as e:
        DatabaseMetrics.record_crud_error(table, "update", "configuration_error", 500)
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        error_type = type(e).__name__
        DatabaseMetrics.record_crud_error(table, "update", error_type, 500)
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar no banco de dados: {str(e)}"
        )


def _delete_row(
    table: str, record_id: str, tenant_filter: Tuple[str, Any] | None = None
):
    try:
        from .supabase_helpers import db_operation_metrics
        
        with db_operation_metrics(table=table, operation="delete"):
            supabase = get_supabase_admin_client()
            query = supabase.table(table).delete().eq("id", record_id)

            if tenant_filter:
                column, value = tenant_filter
                query = query.eq(column, value)

            response = query.execute()

            error = getattr(response, "error", None)
            if error:
                error_type = type(error).__name__ if hasattr(error, '__class__') else "database_error"
                DatabaseMetrics.record_crud_error(table, "delete", error_type, 400)
                raise HTTPException(status_code=400, detail=_format_error(error))

            return response.data or []
    except HTTPException:
        raise
    except RuntimeError as e:
        DatabaseMetrics.record_crud_error(table, "delete", "configuration_error", 500)
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        error_type = type(e).__name__
        DatabaseMetrics.record_crud_error(table, "delete", error_type, 500)
        raise HTTPException(
            status_code=500, detail=f"Erro ao deletar do banco de dados: {str(e)}"
        )


def _validate_tenant_table(resource: str) -> str:
    table = resource.replace("-", "_")
    if table not in TENANT_TABLES:
        raise HTTPException(
            status_code=404,
            detail=f"Resource '{resource}' is not tenant scoped or does not exist.",
        )
    return table


def _get_single_record(table: str, filters: List[Tuple[str, Any]]):
    try:
        supabase = get_supabase_admin_client()
        query = supabase.table(table).select("*")
        for column, value in filters:
            query = query.eq(column, value)

        response = query.execute()
        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=_format_error(error))

        records = response.data or []
        return records[0] if records else None
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao consultar banco de dados: {str(e)}"
        )


def _get_tenant_name(tenant_id: str) -> str | None:
    try:
        tenant = _get_single_record("tenants", [("id", tenant_id)])
        return tenant.get("name") if tenant else None
    except Exception as e:
        # Não deve impedir o login se não conseguir obter o nome do tenant
        print(f"⚠️  Aviso: Não foi possível obter o nome do tenant {tenant_id}: {e}")
        return None


def _store_user_session(
    user_id: str, tenant_id: str, refresh_token: str, expires_at: datetime
):
    supabase = get_supabase_admin_client()
    payload = {
        "user_id": user_id,
        "refresh_token": refresh_token,
        "expires_at": expires_at.isoformat(),
    }

    if "user_sessions" in TENANT_TABLES:
        payload[TENANT_TABLES["user_sessions"]] = tenant_id

    response = supabase.table("user_sessions").insert(payload).execute()
    error = getattr(response, "error", None)
    if error:
        # Registro de sessão é auxiliar; não deve impedir o login.
        print("Falha ao registrar sessão do usuário", _format_error(error))


def _log_login_event(tenant_id: str | None, user_id: str, email: str):
    if not tenant_id:
        return
    if "login_audit" not in TENANT_TABLES:
        return
    try:
        supabase = get_supabase_admin_client()
        payload = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "email": email,
            "success": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        response = supabase.table("login_audit").insert(payload).execute()
        error = getattr(response, "error", None)
        if error:
            print("Falha ao registrar auditoria de login", _format_error(error))
    except Exception as e:
        # Log de auditoria é auxiliar; não deve impedir o login
        print(f"Falha ao registrar auditoria de login: {e}")


def _get_user_metadata(user: Any) -> Dict[str, Any]:
    metadata = _get_user_attr(user, "user_metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    return metadata


def _get_app_metadata(user: Any) -> Dict[str, Any]:
    metadata = _get_user_attr(user, "app_metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    return metadata


def _get_user_email(user: Any) -> str | None:
    return _get_user_attr(user, "email")


def _get_user_id(user: Any) -> str | None:
    return _get_user_attr(user, "id")


def _get_user_attr(user: Any, attr: str):
    if user is None:
        return None
    if isinstance(user, dict):
        return user.get(attr)
    return getattr(user, attr, None)


def _tenant_ids_for_email(email: str) -> List[str]:
    try:
        supabase = get_supabase_admin_client()
        # REGRA: Buscar apenas usuários ativos
        response = (
            supabase.table("tenant_users")
            .select("tenant_id")
            .eq("email", email)
            .eq("ativo", True)
            .execute()
        )
        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=_format_error(error))
        tenant_ids = [row.get("tenant_id") for row in response.data or [] if row.get("tenant_id")]
        print(f"🔍 [DEBUG] _tenant_ids_for_email({email}): {tenant_ids}")
        return tenant_ids
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao consultar tenant_users: {str(e)}"
        )


def _assert_user_in_tenant(email: str | None, tenant_id: str):
    if not email:
        raise HTTPException(
            status_code=403, detail="Usuário sem e-mail válido no token."
        )
    try:
        supabase = get_supabase_admin_client()
        response = (
            supabase.table("tenant_users")
            .select("id")
            .eq("email", email)
            .eq("tenant_id", tenant_id)
            .limit(1)
            .execute()
        )
        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=_format_error(error))
        if not response.data:
            raise HTTPException(
                status_code=403, detail="Usuário não autorizado para o tenant informado."
            )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao verificar acesso do usuário ao tenant: {str(e)}"
        )


def _resolve_tenant_id(user: Any, requested_tenant_id: str | None) -> str | None:
    metadata = _get_user_metadata(user)
    app_metadata = _get_app_metadata(user)
    metadata_tenant_id = metadata.get("tenant_id") or app_metadata.get("tenant_id")
    
    email = _get_user_email(user)
    
    print(f"🔍 [DEBUG] _resolve_tenant_id:")
    print(f"   email: {email}")
    print(f"   requested_tenant_id: {requested_tenant_id}")
    print(f"   metadata tenant_id: {metadata.get('tenant_id')}")
    print(f"   app_metadata tenant_id: {app_metadata.get('tenant_id')}")
    print(f"   metadata_tenant_id resolvido: {metadata_tenant_id}")

    # REGRA CRÍTICA: Se temos email, buscar tenant_id de tenant_users como fonte da verdade
    # Isso resolve o problema de usuários compartilhando o mesmo ID no Auth
    if email:
        tenant_ids_from_db = _tenant_ids_for_email(email)
        print(f"🔍 [DEBUG] Tenant_ids encontrados em tenant_users para {email}: {tenant_ids_from_db}")
        
        if len(tenant_ids_from_db) == 1:
            tenant_id_from_db = tenant_ids_from_db[0]
            
            # Se o tenant_id dos metadados não corresponde ao do banco, usar o do banco
            if metadata_tenant_id and metadata_tenant_id != tenant_id_from_db:
                print(f"⚠️  [DEBUG] INCONSISTÊNCIA: Metadados ({metadata_tenant_id}) != tenant_users ({tenant_id_from_db})")
                print(f"   Usando tenant_id de tenant_users como fonte da verdade: {tenant_id_from_db}")
                return tenant_id_from_db
            
            # Se não há tenant_id nos metadados, usar o do banco
            if not metadata_tenant_id:
                print(f"✅ [DEBUG] Usando tenant_id de tenant_users (não encontrado nos metadados): {tenant_id_from_db}")
                return tenant_id_from_db
            
            # Se ambos correspondem, usar o dos metadados
            if metadata_tenant_id == tenant_id_from_db:
                print(f"✅ [DEBUG] Metadados e tenant_users sincronizados: {metadata_tenant_id}")
                return metadata_tenant_id
        
        if len(tenant_ids_from_db) > 1:
            print(f"⚠️  [DEBUG] Usuário está em múltiplos tenants: {tenant_ids_from_db}")
            # Se há tenant_id solicitado, verificar se está na lista
            if requested_tenant_id and requested_tenant_id in tenant_ids_from_db:
                print(f"✅ [DEBUG] Usando tenant_id solicitado: {requested_tenant_id}")
                return requested_tenant_id
            # Se há tenant_id nos metadados e está na lista, usar ele
            if metadata_tenant_id and metadata_tenant_id in tenant_ids_from_db:
                print(f"✅ [DEBUG] Usando tenant_id dos metadados (está na lista): {metadata_tenant_id}")
                return metadata_tenant_id
            raise HTTPException(
                status_code=400,
                detail="Informe o tenant_id para contas associadas a múltiplos tenants.",
            )

    if (
        metadata_tenant_id
        and requested_tenant_id
        and metadata_tenant_id != requested_tenant_id
    ):
        print(f"❌ [DEBUG] ERRO: Tenant do token ({metadata_tenant_id}) != tenant da requisição ({requested_tenant_id})")
        raise HTTPException(
            status_code=403, detail="Tenant do token não corresponde à requisição."
        )

    if metadata_tenant_id:
        print(f"✅ [DEBUG] Usando tenant_id dos metadados: {metadata_tenant_id}")
        return metadata_tenant_id

    print(f"⚠️  [DEBUG] Tenant_id não encontrado nos metadados. Buscando por email: {email}")

    if requested_tenant_id:
        print(f"🔍 [DEBUG] Verificando se usuário está no tenant solicitado: {requested_tenant_id}")
        _assert_user_in_tenant(email, requested_tenant_id)
        return requested_tenant_id

    if email:
        tenant_ids = _tenant_ids_for_email(email)
        print(f"🔍 [DEBUG] Tenant_ids encontrados para {email}: {tenant_ids}")
        if len(tenant_ids) == 1:
            print(f"✅ [DEBUG] Usando único tenant_id encontrado: {tenant_ids[0]}")
            return tenant_ids[0]
        if len(tenant_ids) > 1:
            print(f"❌ [DEBUG] ERRO: Usuário está em múltiplos tenants: {tenant_ids}")
            raise HTTPException(
                status_code=400,
                detail="Informe o tenant_id para contas associadas a múltiplos tenants.",
            )

    return None


def _get_role_from_user(user: Any) -> str | None:
    metadata = _get_user_metadata(user)
    app_metadata = _get_app_metadata(user)
    return metadata.get("role") or app_metadata.get("role")


def _enforce_tenant_access(context: AuthContext, tenant_id: str) -> str:
    print(f"🔍 [DEBUG] _enforce_tenant_access: tenant_id={tenant_id}")
    print(f"   Context tenant_id: {context.tenant_id}, email: {context.email}")
    
    # REGRA CRÍTICA: Usar email para buscar tenant_id de tenant_users como fonte da verdade
    # Isso resolve o problema de usuários compartilhando o mesmo ID no Auth
    if context.email:
        tenant_ids_from_db = _tenant_ids_for_email(context.email)
        print(f"🔍 [DEBUG] Tenant_ids encontrados em tenant_users para {context.email}: {tenant_ids_from_db}")
        
        # Verificar se o tenant_id da requisição está na lista de tenants do usuário
        if tenant_id in tenant_ids_from_db:
            print(f"✅ [DEBUG] Usuário {context.email} tem acesso ao tenant {tenant_id}")
            return tenant_id
        else:
            print(f"❌ [DEBUG] ERRO: Usuário {context.email} NÃO tem acesso ao tenant {tenant_id}")
            print(f"   Tenants do usuário: {tenant_ids_from_db}")
            raise HTTPException(status_code=403, detail="Tenant inválido.")
    
    # Fallback: usar lógica antiga se não houver email
    if context.tenant_id and context.tenant_id != tenant_id:
        print(f"❌ [DEBUG] ERRO: Tenant do contexto ({context.tenant_id}) != tenant_id da requisição ({tenant_id})")
        raise HTTPException(status_code=403, detail="Tenant inválido.")
    if not context.tenant_id:
        print(f"⚠️  [DEBUG] Context não tem tenant_id, verificando se usuário está no tenant...")
        _assert_user_in_tenant(context.email, tenant_id)
    print(f"✅ [DEBUG] Acesso ao tenant {tenant_id} autorizado")
    return tenant_id


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthContext:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente."
        )

    token = credentials.credentials
    supabase = get_supabase_anon_client()
    
    try:
        response = supabase.auth.get_user(token)
        error = getattr(response, "error", None)
        user = (
            getattr(response, "user", None) or getattr(response, "data", None) or response
        )

        if error or not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido."
            )
    except Exception as e:
        # Captura exceções do Supabase (incluindo token expirado)
        error_msg = str(e)
        if "expired" in error_msg.lower() or "invalid" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado ou inválido."
            )
        # Para outros erros, também retorna 401 (não 500)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Erro de autenticação: {error_msg}"
        )

    user_id = _get_user_id(user)
    email = _get_user_email(user)

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido."
        )

    metadata = _get_user_metadata(user)
    app_metadata = _get_app_metadata(user)
    tenant_id = metadata.get("tenant_id") or app_metadata.get("tenant_id")
    role = _get_role_from_user(user)
    
    # DEBUG: Log do tenant_id resolvido
    print(f"🔍 [DEBUG] require_auth: user_id={user_id}, email={email}")
    print(f"   metadata tenant_id: {metadata.get('tenant_id')}")
    print(f"   app_metadata tenant_id: {app_metadata.get('tenant_id')}")
    print(f"   tenant_id resolvido: {tenant_id}")
    print(f"   role: {role}")

    return AuthContext(
        user_id=user_id,
        email=email,
        tenant_id=tenant_id,
        role=role,
        access_token=token,
    )


def _authenticate_user(payload: LoginRequest):
    try:
        settings = get_settings()
        # REGRA CRÍTICA: NÃO usar default_tenant_id como fallback
        # Cada usuário DEVE ter seu próprio tenant_id nos metadados
        tenant_id = payload.tenant_id  # Não usar default_tenant_id
        # Log seguro: não logar informações sensíveis como senha
        print(f"🔍 [DEBUG] _authenticate_user: email={payload.email}, tenant_id presente={tenant_id is not None}")

        if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
            raise HTTPException(
                status_code=500, detail="SUPABASE_ANON_KEY não configurada."
            )

        supabase = get_supabase_anon_client()
        try:
            auth_response = supabase.auth.sign_in_with_password(
                {"email": payload.email, "password": payload.senha}
            )
        except Exception as e:
            # Erro de conexão durante login
            error_type = type(e).__name__
            DatabaseMetrics.record_login_connection_error(error_type)
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao conectar ao servidor de autenticação: {str(e)}"
            )
        
        error = getattr(auth_response, "error", None)
        if error:
            error_msg = _format_error(error)
            DatabaseMetrics.record_login_error("authentication_error", 401)
            raise HTTPException(status_code=401, detail=error_msg)

        user = getattr(auth_response, "user", None)
        session = getattr(auth_response, "session", None)
        if isinstance(auth_response, dict):
            user = user or auth_response.get("user") or auth_response.get("data")
            session = session or auth_response.get("session")

        if not user or not session:
            DatabaseMetrics.record_login_error("session_error", 401)
            raise HTTPException(status_code=401, detail="Falha ao autenticar usuário.")

        user_id = _get_user_id(user)
        if not user_id:
            DatabaseMetrics.record_login_error("invalid_user", 401)
            raise HTTPException(status_code=401, detail="Usuário inválido.")

        resolved_tenant_id = _resolve_tenant_id(user, tenant_id)
        print(f"🔍 [DEBUG] _authenticate_user: resolved_tenant_id={resolved_tenant_id}")
        if not resolved_tenant_id:
            DatabaseMetrics.record_login_error("tenant_not_found", 400)
            raise HTTPException(
                status_code=400,
                detail="tenant_id não informado ou não identificado para o usuário. Entre em contato com o administrador.",
            )

        access_token = (
            session.get("access_token")
            if isinstance(session, dict)
            else session.access_token
        )
        refresh_token = (
            session.get("refresh_token")
            if isinstance(session, dict)
            else session.refresh_token
        )
        refresh_token = refresh_token or ""
        expires_in = (
            session.get("expires_in") if isinstance(session, dict) else getattr(session, "expires_in", None)
        )
        # Garantir que expires_in seja um número válido
        try:
            expires_in = int(expires_in) if expires_in is not None else 3600
        except (ValueError, TypeError):
            expires_in = 3600  # Valor padrão se não for um número válido
        
        access_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=expires_in
        )
        refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        _store_user_session(user_id, resolved_tenant_id, refresh_token, refresh_expires_at)
        _log_login_event(resolved_tenant_id, user_id, payload.email)

        tenant_name = _get_tenant_name(resolved_tenant_id)
        user_payload = {
            "id": user_id,
            "email": _get_user_email(user),
            "tenant_id": resolved_tenant_id,
            "tenant_nome": tenant_name,
            "name": _get_user_metadata(user).get("name")
            or _get_user_metadata(user).get("nome")
            or payload.email.split("@")[0],
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in,
            "access_expires_at": access_expires_at.isoformat(),
            "refresh_expires_at": refresh_expires_at.isoformat(),
            "usuario": user_payload,
        }
    except HTTPException as e:
        # Registrar métrica de erro de login
        DatabaseMetrics.record_login_error("http_exception", e.status_code)
        raise
    except Exception as e:
        # Captura qualquer outra exceção não tratada
        # Log detalhado internamente, mas não expor detalhes ao cliente
        import traceback
        error_type = type(e).__name__
        traceback_str = traceback.format_exc()
        # Log completo para debugging interno
        print(f"❌ Erro inesperado no login: {error_type}")
        # Em produção, não logar traceback completo para evitar vazamento de informações
        if os.getenv("ENVIRONMENT", "development") == "development":
            print(f"📋 Traceback: {traceback_str}")
        DatabaseMetrics.record_login_error(error_type, 500)
        # Não expor detalhes do erro ao cliente por segurança
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar login. Tente novamente mais tarde."
        )


@app.get("/health")
def healthcheck():
    """Health check endpoint que verifica conectividade com Supabase"""
    settings = get_settings()
    
    health_status = {
        "status": "ok",
        "supabase_url": settings.supabase_url,
        "database": {
            "connected": False,
            "response_time_ms": None,
            "error": None
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Testar conexão com banco de dados
    try:
        supabase = get_supabase_admin_client()
        db_test = test_supabase_connection(supabase)
        
        health_status["database"] = {
            "connected": db_test["connected"],
            "response_time_ms": db_test["response_time_ms"],
            "error": db_test.get("error")
        }
        
        # Se não conseguir conectar, marcar status como degradado
        if not db_test["connected"]:
            health_status["status"] = "degraded"
            health_status["message"] = "API funcionando mas banco de dados inacessível"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database"]["error"] = str(e)
        health_status["message"] = f"Erro ao verificar conexão com banco: {e}"
    
    # Retornar código HTTP apropriado
    status_code = 200 if health_status["status"] == "ok" else 503
    
    from fastapi import Response
    return Response(
        content=json.dumps(health_status),
        media_type="application/json",
        status_code=status_code
    )


# Dicionário compartilhado para armazenar aprovações pendentes
# Acessível tanto pelo backend quanto pelo agente (se estiverem no mesmo processo)
# Nota: Em produção, o agente roda em container separado, então este dicionário
# só funciona se o agente acessar via API ou compartilhar memória de outra forma
pending_approvals: Dict[str, Dict[str, Any]] = {}


@app.post("/slack/interactions")
async def slack_interactions(request: Request):
    """
    Endpoint para receber interações do Slack (botões clicados)
    
    URL pública: https://credgestor.app.br/api/slack/interactions
    
    Este endpoint funciona independentemente do módulo agent, usando
    variáveis de ambiente do backend para configuração.
    """
    global pending_approvals
    
    try:
        # Obter configurações do backend (não depende do agent)
        settings = get_settings()
        slack_signing_secret = os.getenv("SLACK_SIGNING_SECRET", "")
        
        # Obter headers
        timestamp = request.headers.get('X-Slack-Request-Timestamp', '')
        signature = request.headers.get('X-Slack-Signature', '')
        
        # Verificar timestamp (evitar replay attacks)
        if timestamp:
            try:
                if abs(time.time() - int(timestamp)) > 60 * 5:
                    raise HTTPException(status_code=400, detail="Request timestamp too old")
            except ValueError:
                pass  # Se timestamp não for válido, continuar
        
        # Ler body primeiro para validação de assinatura
        body_bytes = await request.body()
        body = body_bytes.decode('utf-8')
        
        # Parse payload (Slack envia como form-data)
        # Nota: Como já lemos o body, precisamos parsear manualmente
        # O Slack envia: payload=<json_encoded>
        payload_str = ""
        if "payload=" in body:
            payload_str = body.split("payload=", 1)[1]
            # Decodificar URL encoding se necessário
            import urllib.parse
            payload_str = urllib.parse.unquote(payload_str)
        else:
            # Tentar ler como form-data (pode não funcionar após ler body)
            try:
                form_data = await request.form()
                payload_str = form_data.get('payload', '{}')
            except Exception:
                # Se não conseguir, tentar parsear JSON direto do body
                try:
                    body_json = json.loads(body)
                    payload_str = json.dumps(body_json.get('payload', {}))
                except:
                    payload_str = '{}'
        
        if not payload_str:
            return {"ok": True}
        
        payload = json.loads(payload_str)
        
        # Processar URL verification ANTES de validar assinatura
        # (URL verification do Slack sempre tem assinatura válida quando vem do Slack)
        # Para testes manuais, permitimos sem assinatura válida
        if payload.get('type') == 'url_verification':
            challenge = payload.get('challenge', '')
            print(f"✅ URL verification recebida, retornando challenge: {challenge}")
            # Validar assinatura se configurado, mas NUNCA bloquear URL verification
            # (permite tanto testes do Slack quanto testes manuais)
            if slack_signing_secret and signature:
                try:
                    sig_basestring = f"v0:{timestamp}:{body}"
                    my_signature = 'v0=' + hmac.new(
                        slack_signing_secret.encode(),
                        sig_basestring.encode(),
                        hashlib.sha256
                    ).hexdigest()
                    if hmac.compare_digest(my_signature, signature):
                        print(f"✅ Assinatura válida para URL verification")
                    else:
                        print(f"⚠️  Assinatura inválida para URL verification, mas permitindo (pode ser teste manual)")
                except Exception as e:
                    print(f"⚠️  Erro ao validar assinatura: {e}, mas permitindo URL verification")
            elif not signature:
                print(f"⚠️  Sem assinatura na requisição, mas permitindo URL verification (teste manual)")
            return {"challenge": challenge}
        
        # Para outros tipos de interação, validar assinatura obrigatoriamente
        if slack_signing_secret:
            if not signature:
                raise HTTPException(status_code=403, detail="Missing signature")
            
            sig_basestring = f"v0:{timestamp}:{body}"
            my_signature = 'v0=' + hmac.new(
                slack_signing_secret.encode(),
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(my_signature, signature):
                print(f"⚠️  Assinatura inválida. Esperado: {my_signature[:20]}..., Recebido: {signature[:20]}...")
                raise HTTPException(status_code=403, detail="Invalid signature")
        else:
            print("⚠️  SLACK_SIGNING_SECRET não configurado. Validação de assinatura desabilitada.")
        
        # Para outros tipos de interação, validar assinatura se configurado
        # Processar interação
        if payload.get('type') == 'block_actions':
            actions = payload.get('actions', [])
            for action in actions:
                action_id = action.get('action_id', '')
                value = action.get('value', '')
                
                # Aprovação
                if action_id.startswith('approve_') or value.startswith('approve_'):
                    approval_id = action_id.replace('approve_', '') if action_id.startswith('approve_') else value.replace('approve_', '')
                    pending_approvals[approval_id] = {
                        'approved': True,
                        'timestamp': time.time(),
                        'user': payload.get('user', {}).get('name', 'unknown')
                    }
                    print(f"✅ Aprovação registrada para action_id: {approval_id}")
                    return {
                        "response_type": "ephemeral",
                        "text": "✅ Aprovação registrada! O agente será notificado."
                    }
                
                # Rejeição
                elif action_id.startswith('reject_') or value.startswith('reject_'):
                    approval_id = action_id.replace('reject_', '') if action_id.startswith('reject_') else value.replace('reject_', '')
                    pending_approvals[approval_id] = {
                        'approved': False,
                        'timestamp': time.time(),
                        'user': payload.get('user', {}).get('name', 'unknown')
                    }
                    print(f"❌ Rejeição registrada para action_id: {approval_id}")
                    return {
                        "response_type": "ephemeral",
                        "text": "❌ Rejeição registrada! A ação será cancelada."
                    }
        
        return {"ok": True}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao processar interação do Slack: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tables")
def list_tables():
    return {
        "tenant_scoped": sorted(TENANT_TABLES.keys()),
        "global": sorted(GLOBAL_TABLES),
    }


@app.get("/tenants")
def list_tenants(context: AuthContext = Depends(require_auth)):
    if (context.role or "").lower() not in {"super_admin"}:
        raise HTTPException(status_code=403, detail="Acesso restrito a super_admin.")
    return _apply_filters("tenants")


@app.post("/tenants")
def create_tenant(
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    if (context.role or "").lower() not in {"super_admin"}:
        raise HTTPException(status_code=403, detail="Acesso restrito a super_admin.")
    return _insert_row("tenants", payload)


@app.get("/tenants/{tenant_id}")
def get_tenant(tenant_id: str, context: AuthContext = Depends(require_auth)):
    _enforce_tenant_access(context, tenant_id)
    tenants = _apply_filters("tenants", [("id", tenant_id)])
    if not tenants:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenants[0]


# NOTA: Rotas específicas devem vir ANTES das rotas genéricas
# para evitar que o FastAPI tente fazer match com a rota genérica primeiro


@app.get("/tenants/{tenant_id}/installments")
def list_installments(
    tenant_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _apply_filters("installments", [("tenant_id", tenant_id)])


@app.post("/tenants/{tenant_id}/installments/batch")
def create_installments_batch(
    tenant_id: str,
    payload: List[Dict[str, Any]] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    supabase = get_supabase_admin_client()

    print(f"📦 Recebendo {len(payload)} parcelas para inserção no tenant {tenant_id}")

    # Adicionar tenant_id a todas as parcelas
    installments = [{**inst, "tenant_id": tenant_id} for inst in payload]

    print(
        f"📋 Primeira parcela (exemplo): {installments[0] if installments else 'Nenhuma'}"
    )

    response = supabase.table("installments").insert(installments).execute()
    error = getattr(response, "error", None)
    if error:
        print(f"❌ Erro ao inserir parcelas: {error}")
        raise HTTPException(status_code=400, detail=_format_error(error))

    print(f"✅ {len(response.data or [])} parcelas inseridas com sucesso")
    return response.data or []


@app.post("/tenants/{tenant_id}/installments")
def create_installment(
    tenant_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    body = {**payload}
    body.setdefault("tenant_id", tenant_id)
    return _insert_row("installments", body)


@app.get("/tenants/{tenant_id}/{resource}")
def list_tenant_resource(
    tenant_id: str,
    resource: str,
    context: AuthContext = Depends(require_auth),
):
    print(f"🔍 [DEBUG] list_tenant_resource: tenant_id={tenant_id}, resource={resource}")
    print(f"   Context tenant_id: {context.tenant_id}, email: {context.email}")
    _enforce_tenant_access(context, tenant_id)
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    print(f"   Tabela: {table}, Coluna: {column}")
    result = _apply_filters(table, [(column, tenant_id)])
    print(f"   Retornando {len(result)} registros")
    return result


@app.post("/tenants/{tenant_id}/{resource}")
@limiter.limit("100/minute")  # Limite de requisições por minuto
def create_tenant_resource(
    request: Request,
    tenant_id: str,
    resource: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    body = {**payload}
    body.setdefault(column, tenant_id)
    return _insert_row(table, body)


@app.put("/tenants/{tenant_id}/{resource}/{record_id}")
def update_tenant_resource(
    tenant_id: str,
    resource: str,
    record_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    return _update_row(table, record_id, payload, (column, tenant_id))


@app.delete("/tenants/{tenant_id}/{resource}/{record_id}")
def delete_tenant_resource(
    tenant_id: str,
    resource: str,
    record_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    return _delete_row(table, record_id, (column, tenant_id))


@app.get("/users")
def list_users(context: AuthContext = Depends(require_auth)):
    if (context.role or "").lower() not in {"super_admin"}:
        raise HTTPException(status_code=403, detail="Acesso restrito a super_admin.")
    return _apply_filters("users")


@app.post("/users")
def create_user(
    payload: Dict[str, Any] = Body(...), context: AuthContext = Depends(require_auth)
):
    if (context.role or "").lower() not in {"super_admin"}:
        raise HTTPException(status_code=403, detail="Acesso restrito a super_admin.")
    return _insert_row("users", payload)


@app.get("/tenants/{tenant_id}/users")
def list_tenant_users(
    tenant_id: str,
    context: AuthContext = Depends(require_auth)
):
    """
    Lista todos os usuários do tenant especificado.
    Qualquer usuário autenticado pode listar usuários do seu próprio tenant.
    """
    # Verificar se o usuário tem acesso ao tenant
    _enforce_tenant_access(context, tenant_id)
    
    try:
        supabase = get_supabase_admin_client()
        
        # Buscar usuários do tenant em tenant_users
        response = supabase.table("tenant_users").select(
            "id, tenant_id, user_id, email, role, ativo, metadata, created_at"
        ).eq("tenant_id", tenant_id).eq("ativo", True).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=f"Erro ao buscar usuários: {response.error}")
        
        # Buscar informações adicionais de public.users
        users_data = []
        for tenant_user in (response.data or []):
            user_id = tenant_user.get("user_id")
            if user_id:
                user_response = supabase.table("users").select(
                    "id, email, name, role, whatsapp_contacts, tenant_id"
                ).eq("id", user_id).single().execute()
                
                if user_response.data:
                    users_data.append({
                        **user_response.data,
                        "tenant_user_id": tenant_user.get("id"),
                        "ativo": tenant_user.get("ativo", True)
                    })
                else:
                    # Se não encontrar em users, usar dados de tenant_users
                    users_data.append({
                        "id": user_id,
                        "email": tenant_user.get("email"),
                        "name": tenant_user.get("metadata", {}).get("name", tenant_user.get("email", "").split("@")[0]),
                        "role": tenant_user.get("role"),
                        "whatsapp_contacts": [],
                        "tenant_id": tenant_id
                    })
        
        return users_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar usuários do tenant: {str(e)}"
        )


@app.post("/tenants/{tenant_id}/users")
def create_tenant_user(
    tenant_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth)
):
    """
    Permite que qualquer usuário autenticado crie outros usuários no mesmo tenant.
    O novo usuário será vinculado ao tenant_id especificado.
    """
    import requests
    
    # Verificar se o usuário tem acesso ao tenant
    _enforce_tenant_access(context, tenant_id)
    
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=500, 
            detail="Configuração do Supabase incompleta. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários."
        )
    
    # Extrair dados do payload
    email = payload.get("email")
    password = payload.get("password")
    name = payload.get("name", email.split("@")[0] if email else "Usuário")
    role = payload.get("role", "COLLECTION")
    whatsapp_contacts = payload.get("whatsapp_contacts", [])
    
    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email e senha são obrigatórios."
        )
    
    # Criar usuário no Supabase Auth
    auth_url = f"{settings.supabase_url}/auth/v1/admin/users"
    auth_headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json"
    }
    
    auth_payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "name": name,
            "tenant_id": tenant_id
        },
        "app_metadata": {
            "provider": "email",
            "providers": ["email"],
            "role": role,
            "tenant_id": tenant_id
        }
    }
    
    try:
        auth_response = requests.post(auth_url, json=auth_payload, headers=auth_headers, timeout=10)
        auth_response.raise_for_status()
        auth_data = auth_response.json()
        user_id = auth_data.get("id")
        
        if not user_id:
            raise HTTPException(status_code=500, detail="Falha ao criar usuário no Auth: ID não retornado.")
        
        # Criar registro em public.users
        supabase = get_supabase_admin_client()
        user_profile = {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "whatsapp_contacts": whatsapp_contacts,
            "tenant_id": tenant_id
        }
        
        users_response = supabase.table("users").upsert(user_profile).execute()
        if users_response.error:
            print(f"⚠️  Aviso: Erro ao criar perfil em public.users: {users_response.error}")
        
        # Criar vínculo em tenant_users
        tenant_user_data = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "email": email,
            "role": role,
            "ativo": True,
            "metadata": {
                "name": name,
                "role": role,
                "created_by": context.email
            }
        }
        
        tenant_users_response = supabase.table("tenant_users").upsert(
            tenant_user_data,
            on_conflict="tenant_id,email"
        ).execute()
        
        if tenant_users_response.error:
            print(f"⚠️  Aviso: Erro ao criar vínculo em tenant_users: {tenant_users_response.error}")
        
        # Retornar dados do usuário criado
        return {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "whatsapp_contacts": whatsapp_contacts,
            "tenant_id": tenant_id
        }
        
    except requests.exceptions.HTTPError as e:
        error_data = {}
        try:
            if e.response and e.response.content:
                error_data = e.response.json()
        except:
            pass
        
        error_msg = error_data.get("msg", error_data.get("message", str(e)))
        raise HTTPException(
            status_code=e.response.status_code if e.response else 500,
            detail=f"Erro ao criar usuário no Auth: {error_msg}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar usuário: {str(e)}"
        )


@app.post("/auth/login")
@limiter.limit("5/minute")  # Máximo 5 tentativas de login por minuto por IP
def login(request: Request, payload: LoginRequest):
    """Endpoint de login com rate limiting para prevenir brute force attacks"""
    return _authenticate_user(payload)


@app.post("/auth/refresh")
@limiter.limit("10/minute")  # Máximo 10 renovações de token por minuto
def refresh_token(request: Request, payload: RefreshTokenRequest):
    """Renova o access token usando o refresh token."""
    import requests
    
    settings = get_settings()
    
    if not settings.supabase_anon_key:
        raise HTTPException(
            status_code=500, detail="SUPABASE_ANON_KEY não configurada."
        )
    
    if not settings.supabase_url:
        raise HTTPException(
            status_code=500, detail="SUPABASE_URL não configurada."
        )
    
    try:
        # Fazer refresh diretamente via API HTTP do Supabase
        refresh_url = f"{settings.supabase_url}/auth/v1/token?grant_type=refresh_token"
        
        response = requests.post(
            refresh_url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"refresh_token": payload.refresh_token},
            timeout=10,
        )
        
        if response.status_code != 200:
            error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            error_msg = error_data.get("error_description") or error_data.get("error") or "Falha ao renovar token"
            raise HTTPException(status_code=401, detail=error_msg)
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        refresh_token_new = token_data.get("refresh_token") or payload.refresh_token
        expires_in = token_data.get("expires_in", 3600)
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Token de acesso não retornado.")
        
        # Obter informações do usuário usando o novo access_token
        supabase = get_supabase_anon_client()
        user_response = supabase.auth.get_user(access_token)
        error = getattr(user_response, "error", None)
        user = (
            getattr(user_response, "user", None) 
            or getattr(user_response, "data", None) 
            or user_response
        )
        
        if error or not user:
            raise HTTPException(status_code=401, detail="Falha ao obter informações do usuário.")
        
        user_id = _get_user_id(user)
        email = _get_user_email(user)
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Usuário inválido.")
        
        resolved_tenant_id = _resolve_tenant_id(user, None)
        if not resolved_tenant_id:
            raise HTTPException(
                status_code=400,
                detail="tenant_id não identificado para o usuário.",
            )
        
        access_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=expires_in or 3600
        )
        refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        _store_user_session(user_id, resolved_tenant_id, refresh_token_new, refresh_expires_at)
        
        tenant_name = _get_tenant_name(resolved_tenant_id)
        user_payload = {
            "id": user_id,
            "email": email,
            "tenant_id": resolved_tenant_id,
            "tenant_nome": tenant_name,
            "name": _get_user_metadata(user).get("name")
            or _get_user_metadata(user).get("nome")
            or email.split("@")[0],
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_new,
            "token_type": "bearer",
            "expires_in": int(expires_in or 0),
            "access_expires_at": access_expires_at.isoformat(),
            "refresh_expires_at": refresh_expires_at.isoformat(),
            "usuario": user_payload,
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=401, detail=f"Erro ao conectar ao Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao renovar token: {str(e)}")


@app.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Solicita reset de senha. Envia email com link de reset."""
    settings = get_settings()
    
    if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
        raise HTTPException(
            status_code=500, detail="SUPABASE_ANON_KEY não configurada."
        )
    
    if not settings.supabase_url:
        raise HTTPException(
            status_code=500, detail="SUPABASE_URL não configurada."
        )
    
    try:
        supabase = get_supabase_anon_client()
        
        # O Supabase envia automaticamente um email com o link de reset
        # O redirectTo DEVE ser uma URL completa e absoluta
        # 
        # IMPORTANTE: Configure no Supabase Dashboard:
        # 1. Vá em Authentication > URL Configuration
        # 2. Adicione a URL em "Redirect URLs": https://credgestor.app.br/reset-password
        # 3. Configure "Site URL" como: https://credgestor.app.br
        # 
        # Se a URL não estiver na lista de URLs permitidas, o Supabase usará a "Site URL" padrão
        if settings.frontend_url:
            redirect_to = f"{settings.frontend_url.rstrip('/')}/reset-password"
        else:
            # Tentar inferir da SUPABASE_URL (removendo /rest/v1 ou /auth/v1)
            # Se a SUPABASE_URL for de produção, usar HTTPS
            base_url = settings.supabase_url.replace('/rest/v1', '').replace('/auth/v1', '')
            # Se não for localhost, assumir produção
            if 'localhost' not in base_url and '127.0.0.1' not in base_url:
                # Por padrão, usar HTTPS em produção
                redirect_to = "https://credgestor.app.br/reset-password"
            else:
                # Desenvolvimento local
                redirect_to = "http://localhost:3000/reset-password"
        
        # Usar reset_password_for_email do Supabase
        response = supabase.auth.reset_password_for_email(
            payload.email,
            {
                "redirect_to": redirect_to
            }
        )
        
        error = getattr(response, "error", None)
        if error:
            # Por segurança, não revelamos se o email existe ou não
            # Sempre retornamos sucesso para evitar enumeração de emails
            pass
        
        # Sempre retorna sucesso para evitar enumeração de emails
        return {
            "message": "Se o email estiver cadastrado, você receberá um link para resetar sua senha.",
            "success": True
        }
    except Exception as e:
        # Por segurança, sempre retorna sucesso mesmo em caso de erro
        return {
            "message": "Se o email estiver cadastrado, você receberá um link para resetar sua senha.",
            "success": True
        }


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """Reseta a senha usando o hash/token recebido por email."""
    settings = get_settings()
    
    if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
        raise HTTPException(
            status_code=500, detail="SUPABASE_ANON_KEY não configurada."
        )
    
    if not settings.supabase_url:
        raise HTTPException(
            status_code=500, detail="SUPABASE_URL não configurada."
        )
    
    try:
        import requests
        
        # O Supabase envia o hash como parte da URL do link de reset
        # O frontend deve extrair o hash da URL e enviar aqui
        # O hash geralmente vem como query param: ?token=... ou #access_token=...
        
        # Se não foi passado no body, tenta obter do header ou query
        token_hash = payload.token_hash
        
        if not token_hash:
            raise HTTPException(
                status_code=400,
                detail="Token de reset não fornecido. Verifique o link do email."
            )
        
        # O Supabase usa o hash para criar uma sessão temporária
        # Precisamos usar a API HTTP do Supabase para atualizar a senha
        base_url = settings.supabase_url.replace('/rest/v1', '').replace('/auth/v1', '')
        auth_url = f"{base_url}/auth/v1"
        
        # Primeiro, obter o usuário usando o hash (que funciona como access_token temporário)
        user_response = requests.get(
            f"{auth_url}/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token_hash}",
            },
            timeout=10,
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Token inválido ou expirado. Solicite um novo link de reset."
            )
        
        # Atualizar a senha usando o hash como token de autorização
        update_response = requests.put(
            f"{auth_url}/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token_hash}",
                "Content-Type": "application/json",
            },
            json={"password": payload.password},
            timeout=10,
        )
        
        if update_response.status_code not in [200, 204]:
            error_data = update_response.json() if update_response.headers.get("content-type", "").startswith("application/json") else {}
            error_msg = error_data.get("error_description") or error_data.get("error") or "Falha ao resetar senha"
            raise HTTPException(status_code=400, detail=error_msg)
        
        return {
            "message": "Senha resetada com sucesso. Você já pode fazer login com a nova senha.",
            "success": True
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao resetar senha: {str(e)}")


@app.get("/tenants/{tenant_id}/clients")
def list_clients(
    tenant_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _apply_filters("clients", [("tenant_id", tenant_id)])


@app.post("/tenants/{tenant_id}/clients")
def create_client(
    tenant_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    body = {**payload}
    body.setdefault("tenant_id", tenant_id)
    return _insert_row("clients", body)


@app.put("/tenants/{tenant_id}/clients/{client_id}")
def update_client(
    tenant_id: str,
    client_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    # Verificar se o cliente pertence ao tenant
    existing = _get_single_record("clients", [("id", client_id), ("tenant_id", tenant_id)])
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    # Atualizar
    return _update_row("clients", client_id, payload, ("tenant_id", tenant_id))


@app.delete("/tenants/{tenant_id}/clients/{client_id}")
def delete_client(
    tenant_id: str,
    client_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    
    # Implementar exclusão em cascata: deletar empréstimos e parcelas antes de deletar o cliente
    supabase = get_supabase_admin_client()
    
    try:
        # 1. Buscar todos os empréstimos do cliente
        loans_response = (
            supabase.table("loans")
            .select("id")
            .eq("client_id", client_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        
        error = getattr(loans_response, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=f"Erro ao buscar empréstimos: {_format_error(error)}")
        
        loans = loans_response.data or []
        loan_ids = [loan.get("id") if isinstance(loan, dict) else loan for loan in loans]
        
        print(f"🔍 [delete_client] Cliente {client_id}: encontrados {len(loans)} empréstimo(s)")
        
        # 2. Para cada empréstimo, deletar as parcelas primeiro
        if loan_ids:
            deleted_loans = 0
            for loan_id in loan_ids:
                try:
                    # Buscar parcelas do empréstimo
                    installments_response = (
                        supabase.table("installments")
                        .select("id")
                        .eq("loan_id", loan_id)
                        .eq("tenant_id", tenant_id)
                        .execute()
                    )
                    
                    installments_error = getattr(installments_response, "error", None)
                    if installments_error:
                        print(f"⚠️  [delete_client] Erro ao buscar parcelas do empréstimo {loan_id}: {_format_error(installments_error)}")
                        # Tenta deletar o empréstimo mesmo assim
                    else:
                        installments = installments_response.data or []
                        installment_ids = [inst.get("id") if isinstance(inst, dict) else inst for inst in installments]
                        
                        # Deletar parcelas
                        if installment_ids:
                            for installment_id in installment_ids:
                                try:
                                    _delete_row("installments", installment_id, ("tenant_id", tenant_id))
                                except Exception as e:
                                    print(f"⚠️  [delete_client] Erro ao deletar parcela {installment_id}: {e}")
                                    raise HTTPException(
                                        status_code=500,
                                        detail=f"Erro ao deletar parcelas do empréstimo {loan_id}: {str(e)}"
                                    )
                            
                            print(f"✅ [delete_client] Deletadas {len(installment_ids)} parcela(s) do empréstimo {loan_id}")
                    
                    # 3. Deletar o empréstimo
                    _delete_row("loans", loan_id, ("tenant_id", tenant_id))
                    deleted_loans += 1
                    print(f"✅ [delete_client] Deletado empréstimo {loan_id}")
                except HTTPException:
                    raise
                except Exception as e:
                    print(f"❌ [delete_client] Erro ao deletar empréstimo {loan_id}: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Erro ao deletar empréstimo {loan_id}: {str(e)}"
                    )
            
            print(f"✅ [delete_client] Deletados {deleted_loans} de {len(loan_ids)} empréstimo(s) e suas parcelas")
        
        # 4. Deletar o cliente
        return _delete_row("clients", client_id, ("tenant_id", tenant_id))
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ [delete_client] Erro ao deletar cliente {client_id} em cascata: {e}")
        print(f"📋 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao deletar cliente e registros associados: {str(e)}"
        )


@app.get("/tenants/{tenant_id}/loans")
def list_loans(
    tenant_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _apply_filters("loans", [("tenant_id", tenant_id)])


@app.post("/tenants/{tenant_id}/loans")
def create_loan(
    tenant_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    body = {**payload}
    body.setdefault("tenant_id", tenant_id)
    # Normalizar nomes de campos
    if "client_id" in body:
        body["client_id"] = body["client_id"]
    if "interest_rate" in body:
        body["interest_rate"] = body["interest_rate"]
    if "total_amount" in body:
        body["total_amount"] = body["total_amount"]
    if "outstanding_amount" in body:
        body["outstanding_amount"] = body["outstanding_amount"]
    elif "outstanding_amount" not in body:
        # Se não fornecido, usar total_amount como padrão
        body["outstanding_amount"] = body.get("total_amount", 0)
    if "start_date" in body:
        body["start_date"] = body["start_date"]
    if "installments_count" in body:
        body["installments_count"] = body["installments_count"]
    if "promissory_note" in body:
        body["promissory_note"] = body["promissory_note"]
    return _insert_row("loans", body)


@app.put("/tenants/{tenant_id}/loans/{loan_id}")
def update_loan(
    tenant_id: str,
    loan_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    # Verificar se o empréstimo pertence ao tenant
    existing = _get_single_record("loans", [("id", loan_id), ("tenant_id", tenant_id)])
    if not existing:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    # Normalizar nomes de campos
    body = {**payload}
    if "client_id" in body:
        body["client_id"] = body["client_id"]
    if "interest_rate" in body:
        body["interest_rate"] = body["interest_rate"]
    if "total_amount" in body:
        body["total_amount"] = body["total_amount"]
    if "outstanding_amount" in body:
        body["outstanding_amount"] = body["outstanding_amount"]
    if "start_date" in body:
        body["start_date"] = body["start_date"]
    if "installments_count" in body:
        body["installments_count"] = body["installments_count"]
    if "promissory_note" in body:
        body["promissory_note"] = body["promissory_note"]
    # Atualizar
    supabase = get_supabase_admin_client()
    response = (
        supabase.table("loans")
        .update(body)
        .eq("id", loan_id)
        .eq("tenant_id", tenant_id)
        .execute()
    )
    error = getattr(response, "error", None)
    if error:
        raise HTTPException(status_code=400, detail=_format_error(error))
    return response.data[0] if response.data else existing


@app.delete("/tenants/{tenant_id}/loans/{loan_id}")
def delete_loan(
    tenant_id: str,
    loan_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _delete_row("loans", loan_id, ("tenant_id", tenant_id))


@app.put("/tenants/{tenant_id}/installments/{installment_id}")
def update_installment(
    tenant_id: str,
    installment_id: str,
    payload: Dict[str, Any] = Body(...),
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _update_row(
        "installments", installment_id, payload, ("tenant_id", tenant_id)
    )


@app.delete("/tenants/{tenant_id}/installments/{installment_id}")
def delete_installment(
    tenant_id: str,
    installment_id: str,
    context: AuthContext = Depends(require_auth),
):
    _enforce_tenant_access(context, tenant_id)
    return _delete_row("installments", installment_id, ("tenant_id", tenant_id))
