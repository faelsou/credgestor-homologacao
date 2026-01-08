from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
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

    get_supabase_client()


def _format_error(error: Any) -> str:
    if error is None:
        return "Unknown Supabase error"
    if isinstance(error, Exception):
        return str(error)
    return getattr(error, "message", str(error))


def _apply_filters(table: str, filters: List[Tuple[str, Any]] | None = None):
    supabase = get_supabase_admin_client()
    query = supabase.table(table).select("*")
    for column, value in filters or []:
        query = query.eq(column, value)
    response = query.execute()
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))
    return response.data or []


def _insert_row(table: str, payload: Dict[str, Any]):
    supabase = get_supabase_admin_client()
    response = supabase.table(table).insert(payload).execute()
    if response.error:
        raise HTTPException(status_code=400, detail=_format_error(response.error))
    return response.data or []


def _delete_row(table: str, record_id: str, tenant_filter: Tuple[str, Any] | None = None):
    supabase = get_supabase_admin_client()
    query = supabase.table(table).delete().eq("id", record_id)

    if tenant_filter:
        column, value = tenant_filter
        query = query.eq(column, value)

    response = query.execute()

    if response.error:
        raise HTTPException(status_code=400, detail=_format_error(response.error))

    return response.data or []


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
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))

    records = response.data or []
    return records[0] if records else None


def _get_tenant_name(tenant_id: str) -> str | None:
    tenant = _get_single_record("tenants", [("id", tenant_id)])
    return tenant.get("name") if tenant else None


def _store_user_session(user_id: str, tenant_id: str, refresh_token: str, expires_at: datetime):
    supabase = get_supabase_admin_client()
    payload = {
        "user_id": user_id,
        "refresh_token": refresh_token,
        "expires_at": expires_at.isoformat(),
    }

    if "user_sessions" in TENANT_TABLES:
        payload[TENANT_TABLES["user_sessions"]] = tenant_id

    response = supabase.table("user_sessions").insert(payload).execute()
    if response.error:
        # Registro de sessão é auxiliar; não deve impedir o login.
        print("Falha ao registrar sessão do usuário", _format_error(response.error))


def _log_login_event(tenant_id: str | None, user_id: str, email: str):
    if not tenant_id:
        return
    if "login_audit" not in TENANT_TABLES:
        return
    supabase = get_supabase_admin_client()
    payload = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "email": email,
        "event_type": "login",
        "logged_at": datetime.now(timezone.utc).isoformat(),
    }
    response = supabase.table("login_audit").insert(payload).execute()
    if response.error:
        print("Falha ao registrar auditoria de login", _format_error(response.error))


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
    response = supabase.table("tenant_users").select("tenant_id").eq("email", email).execute()
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))
    return [row.get("tenant_id") for row in response.data or [] if row.get("tenant_id")]


def _assert_user_in_tenant(email: str | None, tenant_id: str):
    if not email:
        raise HTTPException(status_code=403, detail="Usuário sem e-mail válido no token.")
    supabase = get_supabase_admin_client()
    response = (
        supabase.table("tenant_users")
        .select("id")
        .eq("email", email)
        .eq("tenant_id", tenant_id)
        .limit(1)
        .execute()
    )
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))
    if not response.data:
        raise HTTPException(status_code=403, detail="Usuário não autorizado para o tenant informado.")


def _resolve_tenant_id(user: Any, requested_tenant_id: str | None) -> str | None:
    metadata = _get_user_metadata(user)
    app_metadata = _get_app_metadata(user)
    metadata_tenant_id = metadata.get("tenant_id") or app_metadata.get("tenant_id")

    if metadata_tenant_id and requested_tenant_id and metadata_tenant_id != requested_tenant_id:
        raise HTTPException(status_code=403, detail="Tenant do token não corresponde à requisição.")

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente.")

    token = credentials.credentials
    supabase = get_supabase_anon_client()
    response = supabase.auth.get_user(token)
    error = getattr(response, "error", None)
    user = getattr(response, "user", None) or getattr(response, "data", None) or response

    if error or not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    user_id = _get_user_id(user)
    email = _get_user_email(user)

    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

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

    if not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="SUPABASE_ANON_KEY não configurada.")

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
            status_code=400, detail="tenant_id não informado ou não identificado para o usuário."
        )

    access_token = session.get("access_token") if isinstance(session, dict) else session.access_token
    refresh_token = (
        session.get("refresh_token") if isinstance(session, dict) else session.refresh_token
    )
    refresh_token = refresh_token or ""
    expires_in = session.get("expires_in") if isinstance(session, dict) else session.expires_in
    access_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in or 3600)
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
def create_user(payload: Dict[str, Any] = Body(...), context: AuthContext = Depends(require_auth)):
    if (context.role or "").lower() not in {"super_admin"}:
        raise HTTPException(status_code=403, detail="Acesso restrito a super_admin.")
    return _insert_row("users", payload)


@app.post("/auth/login")
def login(payload: LoginRequest):
    return _authenticate_user(payload)
