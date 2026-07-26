import os
import threading
import time
import signal
from datetime import datetime
from typing import Any, Dict, Optional

from agent.slack_client import SlackClient
from agent.monitor import DockerMonitor
from agent.troubleshooter import Troubleshooter
from agent.resolver import Resolver
from agent.slack_interactions import start_server as start_interactions_server


def build_legacy_healthy_text() -> str:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    parts = [
        ":white_check_mark: Status Saudável",
        "",
        "Todos os componentes estão funcionando corretamente.",
        "",
        ":white_check_mark: API: API respondendo corretamente",
        ":white_check_mark: DOCKER: Todos os 2 serviços estão rodando",
        ":white_check_mark: DATABASE: Configuração de banco de dados encontrada",
        ":white_check_mark: FRONTEND: Frontend respondendo corretamente",
        "",
        f"Timestamp: {timestamp}",
    ]
    return "\n".join(parts)


def send_startup(slack: SlackClient, monitor_interval: int) -> None:
    try:
        slack.send_startup_message(monitor_interval=monitor_interval)
    except Exception:
        # Evitar interrupção do loop por falha de notificação
        pass


def send_healthy(slack: SlackClient) -> bool:
    # Enviar no formato legado solicitado
    text = build_legacy_healthy_text()
    return slack.send_message(text)


class IncidentPipeline:
    """Orquestra a tratativa de um incidente: troubleshooting + resolutor."""

    # Tipos de problema que disparam a tratativa completa
    TREATABLE = {"scaled_below_min", "scaled_to_zero", "unavailable", "degraded"}

    def __init__(self, slack: SlackClient, monitor: DockerMonitor):
        self.slack = slack
        self.troubleshooter = Troubleshooter(monitor.client)
        self.resolver = Resolver(monitor.client, slack)
        self._treating: set = set()
        self._last_diagnosis: Dict[str, Dict[str, str]] = {}
        self._lock = threading.Lock()

    def forget(self, component: str) -> None:
        """Descarta o diagnóstico após a recuperação do serviço."""
        self._last_diagnosis.pop(component, None)

    def handle(self, issue: Dict[str, Any]) -> None:
        """Inicia a tratativa em background (uma por serviço por vez)."""
        if issue.get("issue_type") not in self.TREATABLE:
            return
        component = issue["component"]
        with self._lock:
            if component in self._treating:
                return
            self._treating.add(component)

        thread = threading.Thread(
            target=self._run, args=(issue,), name=f"tratativa-{component}", daemon=True
        )
        thread.start()

    def _run(self, issue: Dict[str, Any]) -> None:
        component = issue["component"]
        try:
            # Em lembretes de incidente já diagnosticado, reaproveitar a análise
            # e reabrir apenas o pedido de aprovação
            diagnosis = self._last_diagnosis.get(component) if issue.get("repeat") else None

            if diagnosis is None:
                print(f"🔍 Iniciando troubleshooting de {component}...")
                diagnostics = self.troubleshooter.collect_diagnostics(component)
                diagnosis, action_plan = self.troubleshooter.analyze(issue, diagnostics)
                self._last_diagnosis[component] = diagnosis
                self.slack.send_troubleshooting_report(issue, diagnosis, action_plan)
            else:
                print(f"🔁 Reabrindo aprovação de {component} (diagnóstico já realizado)")

            print(f"🛠️  Acionando resolutor para {component}...")
            self.resolver.resolve(issue, diagnosis)
        except Exception as e:
            print(f"⚠️  Erro na tratativa de {component}: {e}")
        finally:
            with self._lock:
                self._treating.discard(component)


def run_monitor_check(
    slack: SlackClient,
    monitor: Optional[DockerMonitor],
    pipeline: Optional[IncidentPipeline],
) -> None:
    """Verifica a stack, alerta no Slack e dispara a tratativa dos incidentes."""
    if monitor is None:
        return
    try:
        for event in monitor.check():
            try:
                if event["kind"] == "issue":
                    sent = slack.send_issue_detected(event)
                    print(
                        f"🚨 Alerta {event.get('issue_type')} de {event['component']}: "
                        f"{'enviado' if sent else 'FALHA NO ENVIO'}"
                    )
                    if pipeline is not None:
                        pipeline.handle(event)
                else:
                    sent = slack.send_message(event["description"])
                    print(
                        f"✅ Recuperação de {event['component']}: "
                        f"{'enviada' if sent else 'FALHA NO ENVIO'}"
                    )
                    if pipeline is not None:
                        pipeline.forget(event["component"])
            except Exception as e:
                print(f"⚠️  Falha ao processar evento de {event.get('component')}: {e}")
    except Exception as e:
        print(f"⚠️  Erro ao verificar serviços Docker: {e}")


def main() -> None:
    monitor_interval = int(os.getenv("MONITOR_INTERVAL", "3600"))
    send_healthy_enabled = os.getenv("SEND_HEALTHY_STATUS", "true").lower() in {"1", "true", "yes"}
    healthy_interval = int(os.getenv("HEALTHY_STATUS_INTERVAL", str(monitor_interval)))

    slack = SlackClient()

    # Receptor próprio de aprovações: não depende do serviço da API estar no ar
    start_interactions_server()

    docker_stack = os.getenv("DOCKER_STACK", "credgestor").strip() or "credgestor"
    try:
        monitor: Optional[DockerMonitor] = DockerMonitor(stack=docker_stack)
        pipeline: Optional[IncidentPipeline] = IncidentPipeline(slack, monitor)
        print(f"✅ Monitor Docker iniciado para a stack '{docker_stack}'")
    except Exception as e:
        monitor = None
        pipeline = None
        print(f"⚠️  Monitor Docker indisponível (alertas de erro desativados): {e}")

    # Sinalização para encerramento limpo
    stop_flag = {"stop": False}

    def _handle_sigterm(signum, frame):
        stop_flag["stop"] = True

    signal.signal(signal.SIGTERM, _handle_sigterm)
    signal.signal(signal.SIGINT, _handle_sigterm)

    # Mensagem de inicialização
    send_startup(slack, monitor_interval=monitor_interval)

    last_healthy_sent_at = 0.0

    while not stop_flag["stop"]:
        now = time.time()

        # Verificar falhas nos serviços da stack, alertar e tratar
        run_monitor_check(slack, monitor, pipeline)

        # Enviar status saudável se habilitado, passado o intervalo e sem problemas ativos
        stack_healthy = monitor is None or monitor.is_healthy
        if send_healthy_enabled and stack_healthy and (now - last_healthy_sent_at >= healthy_interval):
            try:
                ok = send_healthy(slack)
                # Atualizar marcador apenas em caso de tentativa (independente de ok/falha)
                last_healthy_sent_at = now
            except Exception:
                # Não interromper o loop por erro transitório
                last_healthy_sent_at = now

        # Dormir em passos pequenos para reagir melhor a sinais
        time.sleep(min(30, max(5, monitor_interval // 120 or 5)))


if __name__ == "__main__":
    main()
