"""
Agente resolutor.

Define e executa a ação corretiva para um problema detectado:
- Serviço escalado abaixo do mínimo -> restaurar réplicas mínimas;
- Serviço indisponível/degradado -> forçar reinício das tasks.

Com REQUIRE_APPROVAL habilitado, solicita aprovação no Slack (botões ou
reação 👍/👎) antes de executar. Ao final envia relatório de resolução.
"""
import time
import uuid
from typing import Any, Dict, Optional, Tuple

from agent.config import config
from agent.slack_interactions import discard_pending, register_pending


class Resolver:
    RECOVERY_TIMEOUT = 120  # segundos para o serviço estabilizar após a ação

    def __init__(self, docker_client, slack):
        self.docker = docker_client
        self.slack = slack
        self.require_approval = config.REQUIRE_APPROVAL

    def plan_action(self, issue: Dict[str, Any]) -> Tuple[str, Optional[int], str]:
        """Retorna (tipo da ação, valor, descrição legível)."""
        component = issue["component"]
        if issue.get("issue_type") in {"scaled_below_min", "scaled_to_zero"}:
            minimum = issue.get("min_required") or 1
            return (
                "scale",
                minimum,
                f"Escalar o serviço `{component}` de volta para {minimum} réplica(s)",
            )
        return (
            "restart",
            None,
            f"Forçar reinício das tasks do serviço `{component}` (equivalente a docker service update --force)",
        )

    def resolve(self, issue: Dict[str, Any], diagnosis: Dict[str, str]) -> bool:
        component = issue["component"]
        action_kind, action_value, action_description = self.plan_action(issue)
        action_id = f"{component}-{uuid.uuid4().hex[:8]}"

        if self.require_approval:
            register_pending(action_id)
            try:
                approved = self.slack.send_approval_request(
                    action_description=action_description,
                    action_id=action_id,
                    action_details={
                        "Serviço": component,
                        "Problema": issue.get("description", "N/A"),
                        "Causa raiz": diagnosis.get("causa_raiz", "N/A"),
                    },
                )
            finally:
                discard_pending(action_id)
            if approved is not True:
                status = "rejeitada" if approved is False else "expirou sem aprovação"
                self.slack.send_message(
                    f"⚠️ Ação corretiva para `{component}` {status}. "
                    f"Nenhuma alteração foi executada."
                )
                return False

        ok, result_message = self._execute(component, action_kind, action_value)
        self.slack.send_resolution_report({
            "problem": issue.get("description", "N/A"),
            "root_cause": diagnosis.get("causa_raiz", "N/A"),
            "actions": [f"• {action_description}"],
            "result": result_message,
        })
        return ok

    def _execute(self, component: str, kind: str, value: Optional[int]) -> Tuple[bool, str]:
        try:
            service = self.docker.services.get(component)
            if kind == "scale":
                service.scale(value)
                print(f"✅ Serviço {component} escalado para {value} réplica(s)")
            else:
                service.force_update()
                print(f"✅ Reinício forçado do serviço {component}")
        except Exception as e:
            return False, f"❌ Falha ao executar ação: {e}"

        return self._wait_recovery(component)

    def _wait_recovery(self, component: str) -> Tuple[bool, str]:
        """Aguarda o serviço voltar a ter todas as réplicas desejadas rodando."""
        deadline = time.time() + self.RECOVERY_TIMEOUT
        while time.time() < deadline:
            try:
                service = self.docker.services.get(component)
                desired = (
                    service.attrs.get("Spec", {})
                    .get("Mode", {})
                    .get("Replicated", {})
                    .get("Replicas", 0)
                )
                running = sum(
                    1 for task in service.tasks()
                    if task.get("DesiredState") == "running"
                    and task.get("Status", {}).get("State") == "running"
                )
                if desired and running >= desired:
                    return True, f"✅ Serviço estabilizado com {running}/{desired} réplica(s) rodando"
            except Exception:
                pass
            time.sleep(5)
        return False, f"⚠️ Ação executada, mas o serviço não estabilizou em {self.RECOVERY_TIMEOUT}s"
