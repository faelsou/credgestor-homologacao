"""
Monitor de serviços Docker Swarm da stack.

Produz duas saídas a cada ciclo:

- eventos pontuais de task com falha (ex: `exit 137: unhealthy container`), que
  alertam uma única vez por task;
- findings de estado dos serviços (indisponível, abaixo do mínimo do autoscale,
  degradado), cuja evolução no tempo é acompanhada por IssueTracker.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import docker

# Falhas mais antigas que isso no momento do startup não geram alerta
# (evita re-alertar eventos antigos a cada restart do agente)
STARTUP_GRACE = timedelta(minutes=15)

AUTOSCALE_MIN_LABEL = "com.docker.swarm.autoscale.min"


def _parse_docker_ts(value: str) -> Optional[datetime]:
    """Converte timestamp do Docker (nanossegundos + Z) para datetime UTC."""
    if not value:
        return None
    try:
        # Truncar fração de segundos para 6 dígitos e normalizar o sufixo Z
        value = re.sub(r"\.(\d{6})\d*", r".\1", value).replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except ValueError:
        return None


class DockerMonitor:
    """Acompanha o estado dos serviços da stack via Docker socket."""

    def __init__(self, stack: str):
        self.stack = stack
        self.client = docker.from_env()
        self.seen_failed_tasks: set = set()
        self._seed_existing_failures()

    def _stack_services(self) -> List[Any]:
        return self.client.services.list(
            filters={"label": f"com.docker.stack.namespace={self.stack}"}
        )

    def count_services(self) -> int:
        try:
            return len(self._stack_services())
        except Exception:
            return 0

    @staticmethod
    def _failed_tasks(service) -> List[Dict[str, Any]]:
        return [
            task for task in service.tasks()
            if task.get("Status", {}).get("State") == "failed"
        ]

    @staticmethod
    def _service_state(service) -> Tuple[Optional[int], int, Optional[int]]:
        """Retorna (réplicas desejadas, rodando, mínimo do autoscale)."""
        spec = service.attrs.get("Spec", {})
        desired = spec.get("Mode", {}).get("Replicated", {}).get("Replicas")
        try:
            min_required: Optional[int] = int(spec.get("Labels", {}).get(AUTOSCALE_MIN_LABEL, ""))
        except (TypeError, ValueError):
            min_required = None
        running = sum(
            1 for task in service.tasks()
            if task.get("DesiredState") == "running"
            and task.get("Status", {}).get("State") == "running"
        )
        return desired, running, min_required

    def _seed_existing_failures(self) -> None:
        """Marca falhas antigas como já vistas; falhas recentes ainda geram alerta."""
        cutoff = datetime.now(timezone.utc) - STARTUP_GRACE
        try:
            for service in self._stack_services():
                for task in self._failed_tasks(service):
                    ts = _parse_docker_ts(task.get("Status", {}).get("Timestamp", ""))
                    if ts is None or ts < cutoff:
                        self.seen_failed_tasks.add(task["ID"])
        except Exception as e:
            print(f"⚠️  Erro ao inicializar monitor Docker: {e}")

    def collect(self) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        """
        Devolve (eventos pontuais, findings por serviço).

        Os eventos pontuais já vêm prontos para envio; os findings passam pelo
        IssueTracker, que decide entre alerta novo, lembrete ou recuperação.
        """
        events: List[Dict[str, Any]] = []
        findings: Dict[str, Dict[str, Any]] = {}

        for service in self._stack_services():
            name = service.name

            for task in self._failed_tasks(service):
                task_id = task["ID"]
                if task_id in self.seen_failed_tasks:
                    continue
                self.seen_failed_tasks.add(task_id)

                status = task.get("Status", {})
                error = status.get("Err") or "erro não informado"
                ts = _parse_docker_ts(status.get("Timestamp", ""))
                ts_str = ts.astimezone().strftime("%Y-%m-%d %H:%M:%S") if ts else "N/A"
                # Exit 137 / unhealthy: há ação segura (restart) → pedir aprovação
                restartable = (
                    "137" in error
                    or "unhealthy" in error.lower()
                    or "health" in error.lower()
                )
                events.append({
                    "kind": "issue",
                    "issue_type": "task_failed",
                    "component": name,
                    "severity": "CRITICAL",
                    "description": (
                        f"Task do serviço `{name}` falhou.\n"
                        f"*Erro:* {error}\n"
                        f"*Task:* {task_id[:12]} | *Horário:* {ts_str}"
                    ),
                    "symptoms": [error],
                    "target_service": name,
                    "actionable": restartable,
                    "repeat": False,
                })

            desired, running, min_required = self._service_state(service)
            if desired is None:
                continue

            if min_required is not None and desired < min_required:
                findings[name] = {
                    "issue_type": "scaled_below_min",
                    "component": name,
                    "severity": "CRITICAL",
                    "description": (
                        f"Serviço `{name}` INDISPONÍVEL: escalado para {desired} "
                        f"réplica(s), abaixo do mínimo configurado ({min_required})."
                    ),
                }
            elif desired == 0:
                findings[name] = {
                    "issue_type": "scaled_to_zero",
                    "component": name,
                    "severity": "CRITICAL",
                    "description": f"Serviço `{name}` INDISPONÍVEL: escalado para 0 réplicas.",
                }
            elif running == 0:
                findings[name] = {
                    "issue_type": "unavailable",
                    "component": name,
                    "severity": "CRITICAL",
                    "description": (
                        f"Serviço `{name}` INDISPONÍVEL: nenhuma das {desired} "
                        f"réplica(s) desejadas está rodando."
                    ),
                }
            elif running < desired:
                findings[name] = {
                    "issue_type": "degraded",
                    "component": name,
                    "severity": "HIGH",
                    "description": (
                        f"Serviço `{name}` degradado: {running}/{desired} réplicas rodando."
                    ),
                }

            if name in findings:
                findings[name].update({
                    "symptoms": [findings[name]["description"]],
                    "desired": desired,
                    "running": running,
                    "min_required": min_required,
                    "target_service": name,
                    "actionable": True,
                })

        return events, findings
