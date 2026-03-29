import importlib
import os
import time
import hmac
import hashlib
from typing import Any, Dict, List, Tuple
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def reload_app_module():
    """
    Recarrega o módulo backend.main após configurar variáveis de ambiente,
    garantindo que middlewares (CORS) e configurações sejam aplicados conforme o ambiente.
    """
    # Garantir que o diretório raiz do projeto esteja no PYTHONPATH
    project_root = str(Path(__file__).resolve().parents[1])
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    if "backend.main" in list(importlib.sys.modules.keys()):
        importlib.reload(importlib.import_module("backend.main"))
    return importlib.import_module("backend.main")


class FakeResponse:
    def __init__(self, data=None, error=None):
        self.data = data or []
        self.error = error

    def json(self):
        return {"data": self.data, "error": self.error}


class FakeQuery:
    def __init__(self, table: str, data_rows: List[Dict[str, Any]]):
        self.table = table
        self.data_rows = data_rows
        self.filters: List[Tuple[str, Any]] = []

    def select(self, *_args, **_kwargs):
        return self

    def update(self, *_args, **_kwargs):
        return self

    def delete(self, *_args, **_kwargs):
        return self

    def insert(self, *_args, **_kwargs):
        return self

    def eq(self, column: str, value: Any):
        self.filters.append((column, value))
        return self

    def single(self):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        # Aplica filtros AND simples em memória
        result = self.data_rows
        for col, val in self.filters:
            result = [r for r in result if r.get(col) == val]
        return FakeResponse(result, None)


class FakeTableClient:
    def __init__(self, data_by_table: Dict[str, List[Dict[str, Any]]]):
        self.data_by_table = data_by_table

    def table(self, table_name: str):
        rows = self.data_by_table.get(table_name, [])
        return FakeQuery(table_name, rows)


def test_apply_filters_and_tenant_requirement():
    # Ambiente mínimo
    os.environ["ENVIRONMENT"] = "development"
    os.environ["ALLOWED_ORIGINS"] = "*"
    os.environ["DISABLE_PROMETHEUS"] = "1"
    os.environ["DISABLE_OTEL"] = "1"
    mod = reload_app_module()

    # Monkeypatch do cliente Supabase admin
    fake_data = {
        "tenant_users": [
            {"tenant_id": "t1", "email": "user@example.com", "ativo": True},
        ],
        "installments": [
            {"id": "i1", "tenant_id": "t1", "loan_id": "l1"},
            {"id": "i2", "tenant_id": "t1", "loan_id": "l2"},
            {"id": "i3", "tenant_id": "t2", "loan_id": "l1"},
        ]
    }
    mod.get_supabase_admin_client = lambda: FakeTableClient(fake_data)

    # Override de auth para não depender de Supabase
    def fake_auth():
        return mod.AuthContext(
            user_id="u1",
            email="user@example.com",
            tenant_id="t1",
            role="admin",
            access_token="x",
        )

    mod.app.dependency_overrides[mod.require_auth] = fake_auth
    client = TestClient(mod.app)

    # Deve retornar somente parcelas do tenant t1
    r = client.get("/tenants/t1/installments")
    assert r.status_code == 200
    data = r.json()
    ids = sorted([d["id"] for d in data])
    assert ids == ["i1", "i2"]

    # _apply_filters sem tenant_id em tabela com escopo deve lançar HTTPException 400
    import pytest

    with pytest.raises(mod.HTTPException) as exc:
        mod._apply_filters("installments", [("loan_id", "l1")])
    assert exc.value.status_code == 400
    assert "Filtro obrigatório ausente" in exc.value.detail


def test_cors_production_explicit_origin_allows_and_blocks_other():
    # Configurar produção com origem explícita
    os.environ["ENVIRONMENT"] = "production"
    allowed_origin = "https://credgestor.app.br"
    os.environ["ALLOWED_ORIGINS"] = allowed_origin
    os.environ["DISABLE_PROMETHEUS"] = "1"
    os.environ["DISABLE_OTEL"] = "1"
    mod = reload_app_module()
    client = TestClient(mod.app)

    # Preflight OPTIONS com origem permitida deve retornar cabeçalhos CORS
    resp_allowed = client.options(
        "/health",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp_allowed.status_code in (200, 204)
    # Em produção com origem explícita, credenciais podem ser True
    assert resp_allowed.headers.get("access-control-allow-origin") == allowed_origin
    assert resp_allowed.headers.get("access-control-allow-credentials") in ("true", "True")

    # Origem NÃO permitida não deve ecoar cabeçalhos CORS
    resp_blocked = client.options(
        "/health",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Pode retornar 200/204 porém sem CORS headers para a origem não permitida
    assert resp_blocked.headers.get("access-control-allow-origin") is None


def test_slack_url_verification_requires_signature_in_production():
    os.environ["ENVIRONMENT"] = "production"
    os.environ["ALLOWED_ORIGINS"] = "https://credgestor.app.br"
    secret = "test_secret"
    os.environ["SLACK_SIGNING_SECRET"] = secret
    os.environ["DISABLE_PROMETHEUS"] = "1"
    os.environ["DISABLE_OTEL"] = "1"
    mod = reload_app_module()
    client = TestClient(mod.app)

    timestamp = str(int(time.time()))
    raw_body = 'payload={"type":"url_verification","challenge":"abc123"}'
    base = f"v0:{timestamp}:{raw_body}"
    my_sig = "v0=" + hmac.new(secret.encode(), base.encode(), hashlib.sha256).hexdigest()

    # Com assinatura válida -> retorna challenge
    res_ok = client.post(
        "/slack/interactions",
        headers={
            "X-Slack-Request-Timestamp": timestamp,
            "X-Slack-Signature": my_sig,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data=raw_body,
    )
    assert res_ok.status_code == 200
    assert res_ok.json().get("challenge") == "abc123"

    # Sem assinatura -> 403
    res_forbid = client.post(
        "/slack/interactions",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data=raw_body,
    )
    assert res_forbid.status_code == 403

