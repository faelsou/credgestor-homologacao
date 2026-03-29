import importlib
import os
import sys
from types import SimpleNamespace
from typing import Any, Dict, List, Tuple

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient


def reload_backend_with_env(env: Dict[str, str]):
  for k, v in env.items():
    os.environ[k] = v
  # Forçar recarregar backend.main para aplicar novas variáveis
  if "backend.main" in sys.modules:
    del sys.modules["backend.main"]
  return importlib.import_module("backend.main")


class FakeResponse:
  def __init__(self, data):
    self.data = data
    self.error = None


class FakeQuery:
  def __init__(self):
    self.filters: List[Tuple[str, Any]] = []
  def eq(self, column: str, value: Any):
    self.filters.append((column, value))
    return self
  def select(self, *_args, **_kwargs):
    return self
  def execute(self):
    # Retorna dados simulados
    return FakeResponse([{"id": 1, "name": "John"}])


class FakeSupabaseClient:
  def __init__(self):
    self.last_table = None
    self.last_query = None
  def table(self, _table: str):
    self.last_table = _table
    self.last_query = FakeQuery()
    return self.last_query


def test_apply_filters_requires_tenant_and_applies_all(monkeypatch):
  # Carregar backend numa configuração neutra
  backend = reload_backend_with_env({
    "ENVIRONMENT": "development",
    "ALLOWED_ORIGINS": "*",
    "DISABLE_PROMETHEUS": "1",
    "DISABLE_OTEL": "1",
  })

  fake_client = FakeSupabaseClient()
  monkeypatch.setattr(backend, "get_supabase_admin_client", lambda: fake_client)

  # 1) Falha sem tenant_id em tabela tenant-scoped
  with pytest.raises(HTTPException) as excinfo:
    backend._apply_filters("clients", [("status", "active")])
  assert excinfo.value.status_code == 400
  assert "tenant_id" in str(excinfo.value.detail)

  # 2) Sucesso com todos os filtros em AND
  data = backend._apply_filters("clients", [("tenant_id", "t1"), ("status", "active")])
  # Confirma retorno
  assert isinstance(data, list) and data and data[0]["id"] == 1
  # Confirma que ambos filtros foram aplicados (ordem preservada)
  assert fake_client.last_query.filters == [("tenant_id", "t1"), ("status", "active")]


def test_cors_development_star_without_credentials():
  backend = reload_backend_with_env({
    "ENVIRONMENT": "development",
    "ALLOWED_ORIGINS": "*",
    "DISABLE_PROMETHEUS": "1",
    "DISABLE_OTEL": "1",
  })
  client = TestClient(backend.app)
  # Preflight OPTIONS
  resp = client.options(
    "/health",
    headers={
      "Origin": "http://example.com",
      "Access-Control-Request-Method": "GET",
    },
  )
  # Em dev: allow_origin '*' e sem allow-credentials
  assert resp.headers.get("access-control-allow-origin") in ("*", "http://example.com")
  # Quando '*' geralmente não retorna allow-credentials true
  assert resp.headers.get("access-control-allow-credentials") in (None, "false")


def test_cors_production_star_disallowed():
  backend = reload_backend_with_env({
    "ENVIRONMENT": "production",
    "ALLOWED_ORIGINS": "*",
    "DISABLE_PROMETHEUS": "1",
    "DISABLE_OTEL": "1",
  })
  client = TestClient(backend.app)
  # Preflight OPTIONS
  resp = client.options(
    "/health",
    headers={
      "Origin": "http://example.com",
      "Access-Control-Request-Method": "GET",
    },
  )
  # Em produção com '*': middleware configurado para não espelhar origem e sem credenciais
  # Em muitos casos, não haverá cabeçalho ACAO presente
  assert resp.headers.get("access-control-allow-origin") in (None, "")
  assert resp.headers.get("access-control-allow-credentials") in (None, "false")

