"""
Monitor de serviços Docker Swarm da stack.

Detecta, a cada ciclo do loop principal (~30s):
- Tasks com falha (ex: exit 137 / unhealthy container);
- Indisponibilidade: serviço escalado abaixo do mínimo (label
  com.docker.swarm.autoscale.min) ou sem nenhuma réplica rodando;
- Degradação: réplicas rodando abaixo do desejado;
- Recuperação: serviço voltou ao estado normal.

Os eventos gerados alimentam o alerta no Slack e a tratativa dos
agentes de troubleshooting e resolutor.
"""
import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import docker

# Falhas mais antigas que isso no momento do startup não geram alerta
# (evita re-alertar eventos antigos a cada restart do agente)
STARTUP_GRACE = timedelta(minutes=15)

AUTOSCALE_MIN_LABEL = "com.docker.swarm.autoscale.min"

# Intervalo para relembrar no Slack um incidente que continua em aberto
REALERT_INTERVAL = int(os.getenv("REALERT_INTERVAL", "900"))


def _severity_rank(issue_type: Optional[str]) -> int:
    """Ranking de severidade por tipo de problema (degraded=HIGH, demais=CRITICAL)."""
    if issue_type is None:
        return 0
    return 1 if issue_type == "degraded" else 2


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

    def __init__(self, stack: str, realert_interval: int = REALERT_INTERVAL):
        self.stack = stack
        self.client = docker.from_env()
        self.seen_failed_tasks: set = set()
        # serviço -> {"type", "started_at", "last_alert_at"} do problema ativo
        self.active_issues: Dict[str, Dict[str, Any]] = {}
        self.realert_interval = realert_interval
        self._seed_existing_failures()

    @property
    def is_healthy(self) -> bool:
        return not self.active_issues

    def _stack_services(self) -> List[Any]:
        return self.client.services.list(
            filters={"label": f"com.docker.stack.namespace={self.stack}"}
        )

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

    def check(self) -> List[Dict[str, Any]]:
        """
        Verifica a stack e retorna eventos novos.

        Cada evento tem "kind" ("issue" ou "recovery"). Issues carregam
        "issue_type" (task_failed | scaled_below_min | unavailable | degraded)
        e os campos esperados por SlackClient.send_issue_detected.
        """
        events: List[Dict[str, Any]] = []

        for service in self._stack_services():
            name = service.name

            # 1) Novas tasks com falha (evento pontual, alerta uma vez por task)
            for task in self._failed_tasks(service):
                task_id = task["ID"]
                if task_id in self.seen_failed_tasks:
                    continue
                self.seen_failed_tasks.add(task_id)

                status = task.get("Status", {})
                error = status.get("Err") or "erro não informado"
                ts = _parse_docker_ts(status.get("Timestamp", ""))
                ts_str = ts.astimezone().strftime("%Y-%m-%d %H:%M:%S") if ts else "N/A"
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
                })

            # 2) Estado do serviço (evento com transição entrada/saída)
            desired, running, min_required = self._service_state(service)
            issue_type = None
            description = None

            if desired is not None:
                if min_required is not None and desired < min_required:
                    issue_type = "scaled_below_min"
                    description = (
                        f"Serviço `{name}` INDISPONÍVEL: escalado para {desired} réplica(s), "
                        f"abaixo do mínimo configurado ({min_required})."
                    )
                elif desired == 0:
                    # Serviço sem label de autoscale escalado para 0: os serviços
                    # da stack devem ter ao menos 1 réplica
                    issue_type = "scaled_to_zero"
                    description = (
                        f"Serviço `{name}` INDISPONÍVEL: escalado para 0 réplicas."
                    )
                elif desired > 0 and running == 0:
                    issue_type = "unavailable"
                    description = (
                        f"Serviço `{name}` INDISPONÍVEL: nenhuma das {desired} "
                        f"réplica(s) desejadas está rodando."
                    )
                elif running < desired:
                    issue_type = "degraded"
                    description = (
                        f"Serviço `{name}` degradado: {running}/{desired} réplicas rodando."
                    )

            previous = self.active_issues.get(name)
            if issue_type:
                now = time.monotonic()

                # Alertar na entrada do incidente, em escalada de severidade ou
                # como lembrete periódico enquanto o problema seguir em aberto.
                # Mudanças laterais (ex: scaled_to_zero -> unavailable enquanto
                # o container sobe) não geram alerta novo.
                is_new = previous is None
                escalated = (
                    not is_new
                    and _severity_rank(issue_type) > _severity_rank(previous["type"])
                )
                is_reminder = (
                    not is_new
                    and not escalated
                    and now - previous["last_alert_at"] >= self.realert_interval
                )

                if is_new:
                    self.active_issues[name] = {
                        "type": issue_type,
                        "started_at": now,
                        "last_alert_at": now,
                    }
                else:
                    previous["type"] = issue_type
                    if escalated or is_reminder:
                        previous["last_alert_at"] = now

                if is_new or escalated or is_reminder:
                    entry = self.active_issues[name]
                    text = description
                    if is_reminder:
                        minutes = int((now - entry["started_at"]) // 60)
                        text = (
                            f"{description}\n"
                            f"_Incidente segue em aberto há {minutes} min sem resolução._"
                        )
                    events.append({
                        "kind": "issue",
                        "issue_type": issue_type,
                        "component": name,
                        "severity": "HIGH" if issue_type == "degraded" else "CRITICAL",
                        "description": text,
                        "symptoms": [description],
                        "desired": desired,
                        "running": running,
                        "min_required": min_required,
                        "repeat": is_reminder,
                    })
            elif previous:
                del self.active_issues[name]
                events.append({
                    "kind": "recovery",
                    "component": name,
                    "description": (
                        f"✅ *Serviço Recuperado*\n\n"
                        f"O serviço `{name}` voltou ao normal "
                        f"({running}/{desired} réplicas rodando)."
                    ),
                })

        return events
