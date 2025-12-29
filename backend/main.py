import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

import bcrypt
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .settings import get_settings
from .supabase_client import get_supabase_client

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


class LoginRequest(BaseModel):
    email: str
    senha: str
    tenant_id: str | None = None


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
    supabase = get_supabase_client()
    query = supabase.table(table).select("*")
    for column, value in filters or []:
        query = query.eq(column, value)
    response = query.execute()
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))
    return response.data or []


def _insert_row(table: str, payload: Dict[str, Any]):
    supabase = get_supabase_client()
    response = supabase.table(table).insert(payload).execute()
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
    supabase = get_supabase_client()
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
    supabase = get_supabase_client()
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


def _authenticate_user(payload: LoginRequest):
    settings = get_settings()
    tenant_id = payload.tenant_id or settings.default_tenant_id

    supabase = get_supabase_client()
    query = (
        supabase.table("tenant_users")
        .select("id, email, password_hash, tenant_id, name, role")
        .eq("email", payload.email)
    )

    if tenant_id:
        query = query.eq("tenant_id", tenant_id)

    response = query.execute()
    if response.error:
        raise HTTPException(status_code=500, detail=_format_error(response.error))

    records = response.data or []
    if not records:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    if not tenant_id and len(records) > 1:
        raise HTTPException(
            status_code=400,
            detail="Informe o tenant_id para contas com o mesmo e-mail",
        )

    user = records[0]
    tenant_id = tenant_id or user.get("tenant_id")

    if not tenant_id:
        raise HTTPException(status_code=400, detail="Registro de tenant não encontrado para o usuário")
    password_hash = user.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    if not bcrypt.checkpw(payload.senha.encode("utf-8"), password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    now = datetime.now(timezone.utc)
    access_expires_at = now + timedelta(minutes=30)
    refresh_expires_at = now + timedelta(days=30)

    access_token = secrets.token_urlsafe(32)
    refresh_token = secrets.token_urlsafe(48)

    _store_user_session(user["id"], tenant_id, refresh_token, refresh_expires_at)

    tenant_name = _get_tenant_name(tenant_id)
    user_payload = {
        "id": user["id"],
        "email": user["email"],
        "tenant_id": tenant_id,
        "tenant_nome": tenant_name,
        "name": user.get("name") or user.get("nome") or user["email"].split("@")[0],
        "role": user.get("role") or "admin",
    }

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": int((access_expires_at - now).total_seconds()),
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
def list_tenants():
    return _apply_filters("tenants")


@app.post("/tenants")
def create_tenant(payload: Dict[str, Any] = Body(...)):
    return _insert_row("tenants", payload)


@app.get("/tenants/{tenant_id}")
def get_tenant(tenant_id: str):
    tenants = _apply_filters("tenants", [("id", tenant_id)])
    if not tenants:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenants[0]


@app.get("/tenants/{tenant_id}/{resource}")
def list_tenant_resource(tenant_id: str, resource: str):
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    return _apply_filters(table, [(column, tenant_id)])


@app.post("/tenants/{tenant_id}/{resource}")
def create_tenant_resource(
    tenant_id: str, resource: str, payload: Dict[str, Any] = Body(...)
):
    table = _validate_tenant_table(resource)
    column = TENANT_TABLES[table]
    body = {**payload}
    body.setdefault(column, tenant_id)
    return _insert_row(table, body)


@app.get("/users")
def list_users():
    return _apply_filters("users")


@app.post("/users")
def create_user(payload: Dict[str, Any] = Body(...)):
    return _insert_row("users", payload)


@app.post("/auth/login")
def login(payload: LoginRequest):
    return _authenticate_user(payload)


@app.post("/webhook/auth/login")
def webhook_login(payload: LoginRequest):
    return _authenticate_user(payload)
