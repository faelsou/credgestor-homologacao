from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from fastapi import Body, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from .settings import get_settings
from .supabase_client import (
    get_supabase_admin_client,
    get_supabase_anon_client,
    get_supabase_client,
)

app = FastAPI(title="CredGestor Supabase backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    email: str
    senha: str
    tenant_id: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@dataclass
class AuthContext:
    user_id: str
    email: str
    tenant_id: str | None
    role: str | None
    access_token: str


@app.on_event("startup")
def ensure_client() -> None:
    """Warm up the Supabase client on startup."""
    try:
        get_supabase_client()
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
        supabase = get_supabase_admin_client()
        query = supabase.table(table).select("*")
        for column, value in filters or []:
            query = query.eq(column, value)
        response = query.execute()
        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=_format_error(error))
        return response.data or []
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao consultar banco de dados: {str(e)}"
        )


def _insert_row(table: str, payload: Dict[str, Any]):
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table(table).insert(payload).execute()
        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=400, detail=_format_error(error))
        return response.data or []
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
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
        supabase = get_supabase_admin_client()
        query = supabase.table(table).update(payload).eq("id", record_id)

        if tenant_filter:
            column, value = tenant_filter
            query = query.eq(column, value)

        response = query.execute()

        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=400, detail=_format_error(error))

        return response.data or []
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar no banco de dados: {str(e)}"
        )


def _delete_row(
    table: str, record_id: str, tenant_filter: Tuple[str, Any] | None = None
):
    try:
        supabase = get_supabase_admin_client()
        query = supabase.table(table).delete().eq("id", record_id)

        if tenant_filter:
            column, value = tenant_filter
            query = query.eq(column, value)

        response = query.execute()

        error = getattr(response, "error", None)
        if error:
            raise HTTPException(status_code=400, detail=_format_error(error))

        return response.data or []
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erro de configuração: {str(e)}")
    except Exception as e:
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


def _get_tenant_name(tenant_id: str) -> str | None:
    tenant = _get_single_record("tenants", [("id", tenant_id)])
    return tenant.get("name") if tenant else None


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
    supabase = get_supabase_admin_client()
    response = (
        supabase.table("tenant_users").select("tenant_id").eq("email", email).execute()
    )
    error = getattr(response, "error", None)
    if error:
        raise HTTPException(status_code=500, detail=_format_error(error))
    return [row.get("tenant_id") for row in response.data or [] if row.get("tenant_id")]


def _assert_user_in_tenant(email: str | None, tenant_id: str):
    if not email:
        raise HTTPException(
            status_code=403, detail="Usuário sem e-mail válido no token."
        )
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


def _resolve_tenant_id(user: Any, requested_tenant_id: str | None) -> str | None:
    metadata = _get_user_metadata(user)
    app_metadata = _get_app_metadata(user)
    metadata_tenant_id = metadata.get("tenant_id") or app_metadata.get("tenant_id")

    if (
        metadata_tenant_id
        and requested_tenant_id
        and metadata_tenant_id != requested_tenant_id
    ):
        raise HTTPException(
            status_code=403, detail="Tenant do token não corresponde à requisição."
        )

    if metadata_tenant_id:
        return metadata_tenant_id

    email = _get_user_email(user)

    if requested_tenant_id:
        _assert_user_in_tenant(email, requested_tenant_id)
        return requested_tenant_id

    if email:
        tenant_ids = _tenant_ids_for_email(email)
        if len(tenant_ids) == 1:
            return tenant_ids[0]
        if len(tenant_ids) > 1:
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
    if context.tenant_id and context.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Tenant inválido.")
    if not context.tenant_id:
        _assert_user_in_tenant(context.email, tenant_id)
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

    return AuthContext(
        user_id=user_id,
        email=email,
        tenant_id=tenant_id,
        role=role,
        access_token=token,
    )


def _authenticate_user(payload: LoginRequest):
    settings = get_settings()
    tenant_id = payload.tenant_id or settings.default_tenant_id

    if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
        raise HTTPException(
            status_code=500, detail="SUPABASE_ANON_KEY não configurada."
        )

    supabase = get_supabase_anon_client()
    auth_response = supabase.auth.sign_in_with_password(
        {"email": payload.email, "password": payload.senha}
    )
    error = getattr(auth_response, "error", None)
    if error:
        raise HTTPException(status_code=401, detail=_format_error(error))

    user = getattr(auth_response, "user", None)
    session = getattr(auth_response, "session", None)
    if isinstance(auth_response, dict):
        user = user or auth_response.get("user") or auth_response.get("data")
        session = session or auth_response.get("session")

    if not user or not session:
        raise HTTPException(status_code=401, detail="Falha ao autenticar usuário.")

    user_id = _get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário inválido.")

    resolved_tenant_id = _resolve_tenant_id(user, tenant_id)
    if not resolved_tenant_id:
        raise HTTPException(
            status_code=400,
            detail="tenant_id não informado ou não identificado para o usuário.",
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
        session.get("expires_in") if isinstance(session, dict) else session.expires_in
    )
    access_expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=expires_in or 3600
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
        "expires_in": int(expires_in or 0),
        "access_expires_at": access_expires_at.isoformat(),
        "refresh_expires_at": refresh_expires_at.isoformat(),
        "usuario": user_payload,
    }


@app.get("/health")
def healthcheck():
    settings = get_settings()
    return {"status": "ok", "supabase_url": settings.supabase_url}


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
    _enforce_tenant_access(context, tenant_id)
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    return _apply_filters(table, [(column, tenant_id)])


@app.post("/tenants/{tenant_id}/{resource}")
def create_tenant_resource(
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


@app.post("/auth/login")
def login(payload: LoginRequest):
    return _authenticate_user(payload)


@app.post("/auth/refresh")
def refresh_token(payload: RefreshTokenRequest):
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
