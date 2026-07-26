"""
Sondagens ativas de saúde da aplicação.

Complementa o monitor de réplicas do Swarm olhando o que o Docker não mostra:

- API pela URL pública (caminho real do usuário: Traefik + TLS) e pela rede
  interna, o que permite distinguir falha da borda de falha da aplicação;
- banco de dados, a partir do diagnóstico devolvido pelo próprio /health;
- frontend;
- recursos do host (memória e disco);
- healthcheck do serviço, cuja ausência impede o Swarm de reciclar container
  travado.

Cada sondagem devolve um "finding" no formato consumido por IssueTracker.
"""
import os
import shutil
from typing import Any, Dict, Optional, Tuple

import requests

# Limites de alerta
DB_SLOW_MS = float(os.getenv("PROBE_DB_SLOW_MS", "3000"))
HOST_MEMORY_MIN_PERCENT = float(os.getenv("PROBE_HOST_MEMORY_MIN_PERCENT", "10"))
HOST_DISK_MAX_PERCENT = float(os.getenv("PROBE_HOST_DISK_MAX_PERCENT", "85"))
HTTP_TIMEOUT = float(os.getenv("PROBE_HTTP_TIMEOUT", "15"))


def _get(url: str) -> Tuple[Optional[int], Optional[float], Optional[dict], Optional[str]]:
    """Faz um GET e devolve (status, segundos, json, erro)."""
    try:
        response = requests.get(url, timeout=HTTP_TIMEOUT)
        try:
            payload = response.json()
        except ValueError:
            payload = None
        return response.status_code, response.elapsed.total_seconds(), payload, None
    except Exception as e:
        return None, None, None, str(e)


class HealthProbes:
    def __init__(self, docker_client, api_service: str = "credgestor_api",
                 site_service: str = "credgestor_site"):
        self.docker = docker_client
        self.api_service = api_service
        self.site_service = site_service

        # Liveness: processo vivo (usado pelo healthcheck do Swarm)
        # Readiness: /health com diagnóstico de banco (não deve matar o container)
        live_path = os.getenv("API_LIVE_ENDPOINT", "/health/live")
        ready_path = os.getenv("API_HEALTH_ENDPOINT", "/health")
        public_api = os.getenv("API_URL", "https://credgestor.app.br/api").rstrip("/")
        internal_api = os.getenv("API_INTERNAL_URL", "http://credgestor_api:8000").rstrip("/")

        self.api_public_live = f"{public_api}{live_path}"
        self.api_internal_live = f"{internal_api}{live_path}"
        self.api_public_ready = f"{public_api}{ready_path}"
        self.api_internal_ready = f"{internal_api}{ready_path}"
        self.frontend_url = os.getenv("FRONTEND_URL", "https://credgestor.app.br").rstrip("/")

    def collect(self) -> Dict[str, Dict[str, Any]]:
        findings: Dict[str, Dict[str, Any]] = {}
        for probe in (
            self._probe_api,
            self._probe_frontend,
            self._probe_host,
            self._probe_container_health,
            self._probe_healthcheck_config,
        ):
            try:
                probe(findings)
            except Exception as e:
                print(f"⚠️  Erro na sondagem {probe.__name__}: {e}")
        return findings

    # ------------------------------------------------------------------ API
    def _probe_api(self, findings: Dict[str, Dict[str, Any]]) -> None:
        """
        Sonda a API em duas camadas:

        - liveness (`/health/live`): processo vivo, sem dependência externa;
        - readiness (`/health`): inclui diagnóstico do banco (Supabase).

        Comparar rede interna × URL pública separa falha da aplicação de falha
        de borda (Traefik / DNS / TLS).
        """
        if self._service_scaled_to_zero(self.api_service):
            # A indisponibilidade já é reportada pelo monitor de réplicas
            return

        pub_live_status, _, _, pub_live_error = _get(self.api_public_live)
        int_live_status, _, _, int_live_error = _get(self.api_internal_live)

        # Apenas 2xx conta como vivo — 404/5xx significam endpoint ou app quebrados
        internal_alive = int_live_status is not None and 200 <= int_live_status < 300
        public_alive = pub_live_status is not None and 200 <= pub_live_status < 300

        if not internal_alive and not public_alive:
            detail = int_live_error or f"HTTP {int_live_status}"
            findings["api"] = {
                "issue_type": "api_unreachable",
                "component": self.api_service,
                "severity": "CRITICAL",
                "description": (
                    f"API não responde em `{self.api_internal_live}` nem pela URL "
                    f"pública.\n*Detalhe:* {detail}"
                ),
                "symptoms": [f"liveness interno indisponível: {detail}"],
                "target_service": self.api_service,
                "actionable": True,
            }
            return
        if internal_alive and not public_alive:
            detail = pub_live_error or f"HTTP {pub_live_status}"
            findings["api_edge"] = {
                "issue_type": "edge_unreachable",
                "component": "traefik / rota pública",
                "severity": "CRITICAL",
                "description": (
                    f"A API responde na rede interna, mas não pela URL pública "
                    f"`{self.api_public_live}`.\n*Detalhe:* {detail}\n"
                    f"Indica problema de roteamento, DNS ou certificado, não da aplicação."
                ),
                "symptoms": [f"acesso público falhando: {detail}"],
                "actionable": False,
            }

        # Readiness: banco — não reinicia o serviço (dependência externa)
        int_ready_status, _, int_body, _ = _get(self.api_internal_ready)
        pub_ready_status, _, pub_body, _ = _get(self.api_public_ready)
        body = int_body if isinstance(int_body, dict) else pub_body
        if not isinstance(body, dict):
            # Endpoint de readiness inacessível mesmo com liveness OK
            if (int_ready_status is None or int_ready_status >= 500) and internal_alive:
                findings["api_ready"] = {
                    "issue_type": "api_not_ready",
                    "component": self.api_service,
                    "severity": "HIGH",
                    "description": (
                        f"Liveness OK, mas readiness `{self.api_internal_ready}` "
                        f"não responde (HTTP {int_ready_status or pub_ready_status})."
                    ),
                    "symptoms": ["readiness indisponível"],
                    "target_service": self.api_service,
                    "actionable": True,
                }
            return

        database = body.get("database") or {}
        if database.get("connected") is False:
            findings["database"] = {
                "issue_type": "database_unreachable",
                "component": "banco de dados (Supabase)",
                "severity": "CRITICAL",
                "description": (
                    f"A API está no ar (liveness OK), mas não consegue acessar o banco.\n"
                    f"*Erro:* {database.get('error') or 'não informado'}\n"
                    f"Reiniciar a aplicação não resolve: a dependência é externa.\n"
                    f"_Causa clássica do exit 137 de sex/sáb: healthcheck antigo "
                    f"apontava para /health e matava o container quando o Supabase falhava._"
                ),
                "symptoms": [f"banco inacessível: {database.get('error')}"],
                "actionable": False,
            }
        else:
            elapsed_ms = database.get("response_time_ms")
            if isinstance(elapsed_ms, (int, float)) and elapsed_ms > DB_SLOW_MS:
                findings["database"] = {
                    "issue_type": "database_slow",
                    "component": "banco de dados (Supabase)",
                    "severity": "HIGH",
                    "description": (
                        f"Banco respondendo lento: {elapsed_ms:.0f} ms "
                        f"(limite {DB_SLOW_MS:.0f} ms).\n"
                        f"Com healthcheck em `/health` (legado), essa latência "
                        f"reprovava o check e o Swarm matava o container (exit 137)."
                    ),
                    "symptoms": [f"latência do banco em {elapsed_ms:.0f} ms"],
                    "actionable": False,
                }

    # ------------------------------------------------------------- Frontend
    def _probe_frontend(self, findings: Dict[str, Dict[str, Any]]) -> None:
        if self._service_scaled_to_zero(self.site_service):
            return

        status, _, _, error = _get(self.frontend_url)
        if status is None or not (200 <= status < 400):
            detail = error or f"HTTP {status}"
            findings["frontend"] = {
                "issue_type": "frontend_unreachable",
                "component": self.site_service,
                "severity": "CRITICAL",
                "description": (
                    f"Frontend não responde em `{self.frontend_url}`.\n"
                    f"*Detalhe:* {detail}"
                ),
                "symptoms": [f"frontend indisponível: {detail}"],
                "target_service": self.site_service,
                "actionable": True,
            }

    # ----------------------------------------------------------------- Host
    def _probe_host(self, findings: Dict[str, Dict[str, Any]]) -> None:
        available_percent = self._memory_available_percent()
        if available_percent is not None and available_percent < HOST_MEMORY_MIN_PERCENT:
            findings["host_memory"] = {
                "issue_type": "host_memory_low",
                "component": "host (manager01)",
                "severity": "HIGH",
                "description": (
                    f"Memória disponível no host em {available_percent:.1f}% "
                    f"(limite {HOST_MEMORY_MIN_PERCENT:.0f}%).\n"
                    f"Risco de OOM kill nos containers (exit 137)."
                ),
                "symptoms": [f"memória disponível em {available_percent:.1f}%"],
                "actionable": False,
            }

        try:
            usage = shutil.disk_usage("/")
            used_percent = usage.used / usage.total * 100
        except Exception:
            return
        if used_percent > HOST_DISK_MAX_PERCENT:
            findings["host_disk"] = {
                "issue_type": "host_disk_low",
                "component": "host (manager01)",
                "severity": "HIGH",
                "description": (
                    f"Disco em {used_percent:.1f}% de uso "
                    f"(limite {HOST_DISK_MAX_PERCENT:.0f}%).\n"
                    f"Considere `docker system prune` e limpeza de logs."
                ),
                "symptoms": [f"disco em {used_percent:.1f}%"],
                "actionable": False,
            }

    @staticmethod
    def _memory_available_percent() -> Optional[float]:
        try:
            values = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    key, _, rest = line.partition(":")
                    values[key] = float(rest.strip().split()[0])
            total = values.get("MemTotal")
            available = values.get("MemAvailable")
            if not total:
                return None
            return available / total * 100
        except Exception:
            return None

    # --------------------------------------------- Container unhealthy no Swarm
    def _probe_container_health(self, findings: Dict[str, Dict[str, Any]]) -> None:
        """
        Detecta réplica ainda marcada como Desired=running mas com health=unhealthy.

        É o estado intermediário que antecede o exit 137 (Swarm mata o container
        após retries do healthcheck). Alertar aqui dá tempo de agir antes da queda.
        """
        for service_name in (self.api_service, self.site_service):
            if self._service_scaled_to_zero(service_name):
                continue
            try:
                service = self.docker.services.get(service_name)
            except Exception:
                continue

            unhealthy = []
            for task in service.tasks():
                if task.get("DesiredState") != "running":
                    continue
                container_status = (
                    task.get("Status", {}).get("ContainerStatus") or {}
                )
                # Swarm não sempre expõe Health; inspecionar o container localmente
                container_id = container_status.get("ContainerID")
                if not container_id:
                    continue
                try:
                    container = self.docker.containers.get(container_id)
                except Exception:
                    continue
                health = (container.attrs.get("State") or {}).get("Health") or {}
                if health.get("Status") == "unhealthy":
                    unhealthy.append({
                        "task": task["ID"][:12],
                        "failing_streak": health.get("FailingStreak"),
                    })

            if unhealthy:
                detail = ", ".join(
                    f"{u['task']} (falhas={u['failing_streak']})" for u in unhealthy
                )
                findings[f"unhealthy:{service_name}"] = {
                    "issue_type": "container_unhealthy",
                    "component": service_name,
                    "severity": "CRITICAL",
                    "description": (
                        f"Container(s) do serviço `{service_name}` marcados como "
                        f"*unhealthy* pelo Docker.\n"
                        f"*Tasks:* {detail}\n"
                        f"O Swarm tende a matá-los em seguida (exit 137). "
                        f"Verifique se o healthcheck é de liveness (sem banco)."
                    ),
                    "symptoms": [f"container unhealthy: {detail}"],
                    "target_service": service_name,
                    "actionable": True,
                }

    # --------------------------------------------------- Config de healthcheck
    def _probe_healthcheck_config(self, findings: Dict[str, Dict[str, Any]]) -> None:
        """Sem healthcheck o Swarm não substitui container vivo mas travado."""
        for service_name in (self.api_service, self.site_service):
            try:
                service = self.docker.services.get(service_name)
            except Exception:
                continue
            healthcheck = (
                service.attrs.get("Spec", {})
                .get("TaskTemplate", {})
                .get("ContainerSpec", {})
                .get("Healthcheck")
            ) or {}
            if healthcheck.get("Test", []) == ["NONE"]:
                findings[f"healthcheck:{service_name}"] = {
                    "issue_type": "healthcheck_disabled",
                    "component": service_name,
                    "severity": "MEDIUM",
                    "advisory": True,
                    "description": (
                        f"O serviço `{service_name}` está com healthcheck "
                        f"desabilitado (`Test: NONE`).\n"
                        f"Container travado não será substituído automaticamente. "
                        f"Recomendação de configuração — não será repetida."
                    ),
                    "symptoms": ["healthcheck desabilitado no spec do serviço"],
                    "actionable": False,
                }

    # -------------------------------------------------------------- Auxiliar
    def _service_scaled_to_zero(self, service_name: str) -> bool:
        try:
            service = self.docker.services.get(service_name)
            replicas = (
                service.attrs.get("Spec", {})
                .get("Mode", {})
                .get("Replicated", {})
                .get("Replicas")
            )
            return replicas == 0
        except Exception:
            return False
