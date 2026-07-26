"""
Agente de troubleshooting.

Coleta diagnóstico do serviço com problema (estado, tasks, logs recentes)
e analisa com LLM (via agent.llm_client). Se o LLM estiver indisponível,
usa análise baseada em regras para não bloquear a tratativa.
"""
import shutil
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

    def collect_diagnostics(self, component: str, service_name: str = None) -> Dict[str, Any]:
        """
        Coleta contexto para análise.

        `service_name` é o serviço Docker a inspecionar. Para problemas sem
        serviço associado (host, banco, borda) apenas o contexto do host é
        coletado.
        """
        info: Dict[str, Any] = {"alvo": component, "host": self._host_context()}
        if not service_name:
            return info

        info["servico"] = service_name
        try:
            service = self.docker.services.get(service_name)
            spec = service.attrs.get("Spec", {})
            image = spec.get("TaskTemplate", {}).get("ContainerSpec", {}).get("Image", "?")
            info["imagem"] = image.split("@")[0]
            info["replicas_desejadas"] = spec.get("Mode", {}).get("Replicated", {}).get("Replicas")
            healthcheck = (
                spec.get("TaskTemplate", {}).get("ContainerSpec", {}).get("Healthcheck") or {}
            )
            info["healthcheck"] = (
                "desabilitado" if healthcheck.get("Test", []) == ["NONE"]
                else " ".join(healthcheck.get("Test", [])) or "não definido"
            )
            limits = spec.get("TaskTemplate", {}).get("Resources", {}).get("Limits") or {}
            memory_bytes = limits.get("MemoryBytes")
            info["limite_memoria"] = (
                f"{memory_bytes / (1024 ** 2):.0f} MB" if memory_bytes else "sem limite"
            )

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

    @staticmethod
    def _host_context() -> Dict[str, str]:
        """Memória e disco do host, úteis para diferenciar OOM de outras falhas."""
        context: Dict[str, str] = {}
        try:
            values = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    key, _, rest = line.partition(":")
                    values[key] = float(rest.strip().split()[0])
            total = values.get("MemTotal") or 1
            context["memoria"] = (
                f"{values.get('MemAvailable', 0) / 1024:.0f} MB disponíveis de "
                f"{total / 1024:.0f} MB ({values.get('MemAvailable', 0) / total * 100:.1f}%)"
            )
        except Exception:
            context["memoria"] = "indisponível"
        try:
            usage = shutil.disk_usage("/")
            context["disco"] = f"{usage.used / usage.total * 100:.1f}% em uso"
        except Exception:
            context["disco"] = "indisponível"
        return context

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

        if issue_type in {"api_unreachable", "api_not_ready", "frontend_unreachable"}:
            return (
                {
                    "diagnostico": f"{component} não responde à sondagem HTTP esperada.",
                    "causa_raiz": "Processo travado, em reinício ou sem porta escutando.",
                },
                [
                    "Forçar reinício das tasks do serviço",
                    "Verificar logs da aplicação em busca de exceções no startup",
                ],
            )

        if issue_type == "container_unhealthy":
            return (
                {
                    "diagnostico": (
                        f"Container do serviço {component} reprovou o healthcheck "
                        f"e está marcado como unhealthy."
                    ),
                    "causa_raiz": (
                        "Healthcheck falhando. Se o check apontar para /health (com "
                        "consulta ao Supabase), lentidão do banco derruba o container "
                        "mesmo com a app viva — padrão do incidente de sexta/sábado "
                        "(exit 137: unhealthy container)."
                    ),
                },
                [
                    "Confirmar que o healthcheck usa /health/live (sem banco)",
                    "Analisar logs e latência do Supabase no período",
                    "Forçar reinício se o processo estiver travado",
                ],
            )

        if issue_type == "edge_unreachable":
            return (
                {
                    "diagnostico": (
                        "A aplicação responde internamente, mas o acesso público falha."
                    ),
                    "causa_raiz": "Roteamento do Traefik, DNS ou certificado TLS.",
                },
                [
                    "Conferir se o Traefik está no ar e leu as labels do serviço",
                    "Validar o certificado do domínio e a resolução de DNS",
                ],
            )

        if issue_type in {"database_unreachable", "database_slow"}:
            return (
                {
                    "diagnostico": (
                        f"Dependência de banco com problema ({issue_type}). A aplicação "
                        f"está no ar, mas o acesso ao Supabase está degradado."
                    ),
                    "causa_raiz": "Indisponibilidade ou lentidão do banco externo (Supabase).",
                },
                [
                    "Verificar o status do projeto no painel do Supabase",
                    "Conferir limite de conexões e latência de rede até o banco",
                    "Garantir que o healthcheck do container não dependa do banco",
                ],
            )

        if issue_type == "healthcheck_disabled":
            return (
                {
                    "diagnostico": f"O serviço {component} está sem healthcheck ativo.",
                    "causa_raiz": "Spec do serviço com `Test: NONE`.",
                },
                [
                    "Redeploy da stack para restaurar o healthcheck",
                    "Apontar o healthcheck para um endpoint de liveness sem dependência externa",
                ],
            )

        if issue_type in {"host_memory_low", "host_disk_low"}:
            return (
                {
                    "diagnostico": f"Recurso do host em nível crítico ({issue_type}).",
                    "causa_raiz": "Consumo acumulado de containers, imagens e logs.",
                },
                [
                    "Executar `docker system prune` para liberar espaço",
                    "Revisar limites de memória dos serviços",
                ],
            )

        if "137" in symptoms or "unhealthy" in symptoms.lower():
            return (
                {
                    "diagnostico": (
                        f"Task do serviço {component} finalizada com exit 137 por healthcheck "
                        f"reprovado (container unhealthy) ou falta de memória (OOM)."
                    ),
                    "causa_raiz": (
                        "Healthcheck falhando. Quando o /health consulta o banco, uma "
                        "lentidão ou queda do Supabase reprova o healthcheck e o Swarm "
                        "mata o container, mesmo com a aplicação viva."
                    ),
                },
                [
                    "Verificar logs da aplicação no período da falha",
                    "Conferir memória do host e do container no momento da falha",
                    "Separar liveness de readiness: healthcheck sem dependência de banco",
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
