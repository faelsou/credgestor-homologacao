"""
Rastreamento de incidentes ao longo do tempo.

Recebe, a cada ciclo, o conjunto de problemas encontrados (findings) e decide o
que merece mensagem no Slack:

- entrada de um problema novo;
- escalada de severidade de um problema já conhecido;
- lembrete periódico enquanto o problema segue em aberto;
- recuperação quando o problema deixa de aparecer.

Mudanças laterais (mesmo alvo trocando de tipo sem aumentar a severidade) não
geram alerta novo, para não repetir mensagem durante a transição de estados.

Findings marcados como `advisory` são recomendações de configuração, não
indisponibilidade: avisam uma única vez, sem lembretes, e não impedem o envio
do relatório periódico de saúde.
"""
import time
from typing import Any, Dict, List

SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


class IssueTracker:
    def __init__(self, realert_interval: int):
        self.realert_interval = realert_interval
        # chave do alvo -> {"issue_type", "severity", "started_at", "last_alert_at"}
        self.active: Dict[str, Dict[str, Any]] = {}

    @property
    def is_healthy(self) -> bool:
        return not any(not entry["advisory"] for entry in self.active.values())

    def evaluate(self, findings: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Compara os findings atuais com o estado conhecido e devolve os eventos
        que devem ser enviados ao Slack.
        """
        events: List[Dict[str, Any]] = []
        now = time.monotonic()

        for key, finding in findings.items():
            previous = self.active.get(key)
            severity = finding.get("severity", "HIGH")

            if previous is None:
                self.active[key] = {
                    "issue_type": finding.get("issue_type"),
                    "component": finding.get("component", key),
                    "severity": severity,
                    "advisory": bool(finding.get("advisory")),
                    "started_at": now,
                    "last_alert_at": now,
                }
                events.append({**finding, "kind": "issue", "repeat": False})
                continue

            escalated = SEVERITY_RANK.get(severity, 0) > SEVERITY_RANK.get(
                previous["severity"], 0
            )
            reminder = (
                not escalated
                and not previous["advisory"]
                and now - previous["last_alert_at"] >= self.realert_interval
            )

            previous["issue_type"] = finding.get("issue_type")
            previous["severity"] = severity

            if not (escalated or reminder):
                continue

            previous["last_alert_at"] = now
            event = {**finding, "kind": "issue", "repeat": reminder}
            if reminder:
                minutes = int((now - previous["started_at"]) // 60)
                event["description"] = (
                    f"{finding['description']}\n"
                    f"_Problema segue em aberto há {minutes} min sem resolução._"
                )
            events.append(event)

        # Alvos que saíram da lista de problemas se recuperaram
        for key in [k for k in self.active if k not in findings]:
            entry = self.active.pop(key)
            minutes = int((now - entry["started_at"]) // 60)
            component = entry.get("component", key)
            events.append({
                "kind": "recovery",
                "component": component,
                "description": (
                    f"✅ *Recuperado: {component}*\n\n"
                    f"O problema `{entry['issue_type']}` deixou de ser detectado "
                    f"após {minutes} min."
                ),
            })

        return events
