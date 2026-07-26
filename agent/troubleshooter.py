"""
Agente de troubleshooting.

Coleta diagnóstico do serviço com problema (estado, tasks, logs recentes)
e analisa com LLM (via agent.llm_client). Se o LLM estiver indisponível,
usa análise baseada em regras para não bloquear a tratativa.
"""
from typing import Any, Dict, List, Tuple


class Troubleshooter:
    def __init__(self, docker_client):
        self.docker = docker_client
        try:
            from agent.llm_client import LLMClient
            self.llm = LLMClient()
            print("✅ Agente de troubleshooting com LLM habilitado")
        except Exception as e:
            self.llm = None
            print(f"⚠️  LLM indisponível, troubleshooting usará regras: {e}")

    def collect_diagnostics(self, component: str) -> Dict[str, Any]:
        """Coleta contexto do serviço para análise."""
        info: Dict[str, Any] = {"servico": component}
        try:
            service = self.docker.services.get(component)
            spec = service.attrs.get("Spec", {})
            image = spec.get("TaskTemplate", {}).get("ContainerSpec", {}).get("Image", "?")
            info["imagem"] = image.split("@")[0]
            info["replicas_desejadas"] = spec.get("Mode", {}).get("Replicated", {}).get("Replicas")

            tasks = sorted(
                service.tasks(),
                key=lambda t: t.get("Status", {}).get("Timestamp", ""),
                reverse=True,
            )
            info["ultimas_tasks"] = [
                {
                    "estado": t.get("Status", {}).get("State"),
                    "erro": t.get("Status", {}).get("Err"),
                    "horario": t.get("Status", {}).get("Timestamp", "")[:19],
                }
                for t in tasks[:5]
            ]

            try:
                raw = b"".join(service.logs(stdout=True, stderr=True, tail=50))
                info["logs_recentes"] = raw.decode("utf-8", errors="replace")[-3000:] or "vazio"
            except Exception:
                info["logs_recentes"] = "indisponível"
        except Exception as e:
            info["erro_coleta"] = str(e)
        return info

    def analyze(
        self, issue: Dict[str, Any], diagnostics: Dict[str, Any]
    ) -> Tuple[Dict[str, str], List[str]]:
        """Retorna (diagnóstico {diagnostico, causa_raiz}, plano de ação)."""
        if self.llm is not None:
            try:
                context = {
                    "component": issue.get("component"),
                    "description": issue.get("description"),
                    "details": {k: v for k, v in diagnostics.items() if k != "logs_recentes"},
                }
                result = self.llm.analyze_troubleshooting(
                    context=context,
                    symptoms=issue.get("symptoms", []),
                    logs=diagnostics.get("logs_recentes"),
                )
                diagnosis = {
                    "diagnostico": result.get("diagnostico", "N/A"),
                    "causa_raiz": result.get("causa_raiz", "N/A"),
                }
                action_plan = result.get("plano_acao") or ["Analisar manualmente"]
                return diagnosis, action_plan
            except Exception as e:
                print(f"⚠️  Falha na análise via LLM, usando regras: {e}")

        return self._analyze_rule_based(issue)

    @staticmethod
    def _analyze_rule_based(issue: Dict[str, Any]) -> Tuple[Dict[str, str], List[str]]:
        component = issue.get("component", "serviço")
        issue_type = issue.get("issue_type", "")
        symptoms = " ".join(issue.get("symptoms", []))

        if issue_type in {"scaled_below_min", "scaled_to_zero"}:
            minimum = issue.get("min_required") or 1
            return (
                {
                    "diagnostico": (
                        f"O serviço {component} foi escalado para menos réplicas que o "
                        f"necessário para ficar disponível (mínimo esperado: {minimum})."
                    ),
                    "causa_raiz": "Scale manual ou automação externa reduziu as réplicas do serviço.",
                },
                [
                    f"Restaurar o serviço para {minimum} réplica(s)",
                    "Identificar quem executou o scale (docker events / Portainer)",
                ],
            )

        if issue_type in {"unavailable", "degraded"}:
            return (
                {
                    "diagnostico": f"O serviço {component} está com réplicas abaixo do desejado.",
                    "causa_raiz": "Tasks falhando ao iniciar ou recursos insuficientes no nó.",
                },
                [
                    "Verificar erros das últimas tasks (docker service ps)",
                    "Analisar logs do serviço",
                    "Forçar reinício das tasks se o serviço estiver travado",
                ],
            )

        if "137" in symptoms or "unhealthy" in symptoms.lower():
            return (
                {
                    "diagnostico": (
                        f"Task do serviço {component} finalizada com exit 137 por healthcheck "
                        f"reprovado (container unhealthy) ou falta de memória (OOM)."
                    ),
                    "causa_raiz": "Healthcheck falhando (aplicação sem responder) ou OOM kill.",
                },
                [
                    "Verificar logs da aplicação no período da falha",
                    "Conferir consumo de memória do container (docker stats / cAdvisor)",
                    "Validar o endpoint de healthcheck (/health)",
                ],
            )

        return (
            {
                "diagnostico": f"Falha detectada no serviço {component}.",
                "causa_raiz": "Não identificada automaticamente.",
            },
            [
                "Verificar docker service ps e logs do serviço",
                "Analisar métricas no Grafana",
            ],
        )
