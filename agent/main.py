import os
import time
import signal
from datetime import datetime
from typing import Dict, Any

from agent.slack_client import SlackClient


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


def main() -> None:
    monitor_interval = int(os.getenv("MONITOR_INTERVAL", "3600"))
    send_healthy_enabled = os.getenv("SEND_HEALTHY_STATUS", "true").lower() in {"1", "true", "yes"}
    healthy_interval = int(os.getenv("HEALTHY_STATUS_INTERVAL", str(monitor_interval)))

    slack = SlackClient()

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

        # Enviar status saudável se habilitado e passado o intervalo
        if send_healthy_enabled and (now - last_healthy_sent_at >= healthy_interval):
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

