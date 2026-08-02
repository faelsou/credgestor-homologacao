import os
import threading
import time
import signal
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from agent.slack_client import SlackClient
from agent.monitor import DockerMonitor
from agent.probes import HealthProbes
from agent.issue_tracker import IssueTracker
from agent.troubleshooter import Troubleshooter
from agent.resolver import Resolver
from agent.slack_interactions import start_server as start_interactions_server

TZ_SP = ZoneInfo("America/Sao_Paulo")


def build_healthy_text(services_checked: int) -> str:
    timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
    parts = [
        ":white_check_mark: Status Saudável",
        "",
        "Todas as camadas verificadas estão funcionando corretamente.",
        "",
        ":white_check_mark: API: respondendo na rede interna e pela URL pública",
        f":white_check_mark: DOCKER: {services_checked} serviço(s) da stack com réplicas em ordem",
        ":white_check_mark: DATABASE: banco acessível e dentro da latência esperada",
        ":white_check_mark: FRONTEND: respondendo corretamente",
        ":white_check_mark: HOST: memória e disco em níveis normais",
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


def send_healthy(slack: SlackClient, services_checked: int) -> bool:
    return slack.send_message(build_healthy_text(services_checked))


class IncidentPipeline:
    """Orquestra a tratativa de um incidente: troubleshooting + resolutor."""

    def __init__(self, slack: SlackClient, monitor: DockerMonitor):
        self.slack = slack
        self.troubleshooter = Troubleshooter(monitor.client)
        self.resolver = Resolver(monitor.client, slack)
        # Chave = componente:tipo — cada tipo de problema tem sua própria
        # tratativa e SEMPRE gera relatório + pedido de aprovação no Slack
        self._treating: set = set()
        self._last_diagnosis: Dict[str, Dict[str, str]] = {}
        self._lock = threading.Lock()

    def forget(self, component: str) -> None:
        """Descarta diagnóstico e cancela aprovação pendente após a recuperação."""
        for key in [k for k in self._last_diagnosis if k.startswith(f"{component}:")]:
            self._last_diagnosis.pop(key, None)
        self.resolver.cancel_for_component(component)

    def handle(self, issue: Dict[str, Any]) -> None:
        """Inicia a tratativa em background (uma por componente+tipo por vez)."""
        component = issue["component"]
        issue_type = issue.get("issue_type") or "unknown"
        treat_key = f"{component}:{issue_type}"
        with self._lock:
            if treat_key in self._treating:
                print(
                    f"⏳ Tratativa de {treat_key} já em andamento — "
                    f"mantendo pedido de aprovação existente no Slack"
                )
                return
            self._treating.add(treat_key)

        # Novo incidente: limpar cancelamento de uma recuperação anterior
        self.resolver.clear_cancel(component)

        thread = threading.Thread(
            target=self._run,
            args=(issue, treat_key),
            name=f"tratativa-{treat_key}",
            daemon=True,
        )
        thread.start()

    def _run(self, issue: Dict[str, Any], treat_key: str) -> None:
        component = issue["component"]
        try:
            if self.resolver.is_cancelled(component):
                print(f"✅ Tratativa de {treat_key} abortada: componente já recuperado")
                return

            # Em lembretes, reaproveitar diagnóstico e reabrir só a aprovação
            cached = self._last_diagnosis.get(treat_key) if issue.get("repeat") else None
            action_plan = None

            if cached is None:
                print(f"🔍 Iniciando troubleshooting de {treat_key}...")
                diagnostics = self.troubleshooter.collect_diagnostics(
                    component, issue.get("target_service")
                )
                if self.resolver.is_cancelled(component):
                    print(f"✅ Tratativa de {treat_key} abortada: componente já recuperado")
                    return
                diagnosis, action_plan = self.troubleshooter.analyze(issue, diagnostics)
                self._last_diagnosis[treat_key] = {**diagnosis, "plano": action_plan}
                report_ok = self.slack.send_troubleshooting_report(
                    issue, diagnosis, action_plan
                )
                print(
                    f"📋 Relatório de troubleshooting de {treat_key}: "
                    f"{'enviado ao Slack' if report_ok else 'FALHA NO ENVIO AO SLACK'}"
                )
                if not report_ok:
                    # Fallback mínimo para o canal não ficar sem contexto
                    self.slack.send_message(
                        f"🔴 *Troubleshooting (fallback)* — `{component}`\n"
                        f"*Tipo:* `{issue.get('issue_type')}`\n"
                        f"*Problema:* {issue.get('description', 'N/A')}\n"
                        f"*Causa raiz:* {diagnosis.get('causa_raiz', 'N/A')}\n"
                        f"*Plano:* {'; '.join(action_plan or [])}"
                    )
            else:
                print(f"🔁 Reabrindo aprovação de {treat_key} (diagnóstico já realizado)")
                diagnosis = cached
                action_plan = cached.get("plano")
                # Em lembrete, reenviar o resumo do diagnóstico antes da aprovação
                self.slack.send_message(
                    f"🔁 *Lembrete de incidente* — `{component}`\n"
                    f"*Tipo:* `{issue.get('issue_type')}`\n"
                    f"{issue.get('description', '')}\n"
                    f"*Causa raiz:* {diagnosis.get('causa_raiz', 'N/A')}\n"
                    f"_Reabrindo pedido de aprovação._"
                )

            if self.resolver.is_cancelled(component):
                print(f"✅ Tratativa de {treat_key} abortada: componente já recuperado")
                return

            print(f"🛠️  Acionando resolutor para {treat_key} (aprovação obrigatória no Slack)...")
            self.resolver.resolve(issue, diagnosis, action_plan)
        except Exception as e:
            print(f"⚠️  Erro na tratativa de {treat_key}: {e}")
            try:
                if not self.resolver.is_cancelled(component):
                    self.slack.send_message(
                        f"⚠️ *Falha na tratativa automática* de `{component}` "
                        f"(`{issue.get('issue_type')}`): `{e}`\n"
                        f"Intervenção manual necessária."
                    )
            except Exception:
                pass
        finally:
            with self._lock:
                self._treating.discard(treat_key)


def run_monitor_check(
    slack: SlackClient,
    monitor: Optional[DockerMonitor],
    probes: Optional[HealthProbes],
    tracker: Optional[IssueTracker],
    pipeline: Optional[IncidentPipeline],
) -> None:
    """
    Verifica todas as camadas (réplicas, API, banco, frontend, host), alerta no
    Slack e dispara a tratativa dos incidentes.
    """
    if monitor is None or tracker is None:
        return
    try:
        events, findings = monitor.collect()
        if probes is not None:
            findings.update(probes.collect())
        events.extend(tracker.evaluate(findings))

        for event in events:
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
        print(f"⚠️  Erro ao verificar a stack: {e}")


def main() -> None:
    monitor_interval = int(os.getenv("MONITOR_INTERVAL", "3600"))
    send_healthy_enabled = os.getenv("SEND_HEALTHY_STATUS", "true").lower() in {"1", "true", "yes"}
    healthy_interval = int(os.getenv("HEALTHY_STATUS_INTERVAL", str(monitor_interval)))

    slack = SlackClient()

    # Receptor próprio de aprovações: não depende do serviço da API estar no ar
    start_interactions_server()

    docker_stack = os.getenv("DOCKER_STACK", "credgestor").strip() or "credgestor"
    realert_interval = int(os.getenv("REALERT_INTERVAL", "900"))
    try:
        monitor: Optional[DockerMonitor] = DockerMonitor(stack=docker_stack)
        probes: Optional[HealthProbes] = HealthProbes(monitor.client)
        tracker: Optional[IssueTracker] = IssueTracker(realert_interval=realert_interval)
        pipeline: Optional[IncidentPipeline] = IncidentPipeline(slack, monitor)
        print(
            f"✅ Monitor iniciado para a stack '{docker_stack}' "
            f"(réplicas, API, banco, frontend e host)"
        )
    except Exception as e:
        monitor = None
        probes = None
        tracker = None
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

        # Verificar todas as camadas, alertar e tratar
        run_monitor_check(slack, monitor, probes, tracker, pipeline)

        # Enviar status saudável se habilitado, passado o intervalo e sem problemas ativos
        stack_healthy = tracker is None or tracker.is_healthy
        if send_healthy_enabled and stack_healthy and (now - last_healthy_sent_at >= healthy_interval):
            try:
                services_checked = monitor.count_services() if monitor else 0
                send_healthy(slack, services_checked)
                # Atualizar marcador apenas em caso de tentativa (independente de ok/falha)
                last_healthy_sent_at = now
            except Exception:
                # Não interromper o loop por erro transitório
                last_healthy_sent_at = now

        # Dormir em passos pequenos para reagir melhor a sinais
        time.sleep(min(30, max(5, monitor_interval // 120 or 5)))


if __name__ == "__main__":
    main()
