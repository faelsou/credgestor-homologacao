from typing import Any, Dict, List, Tuple

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
