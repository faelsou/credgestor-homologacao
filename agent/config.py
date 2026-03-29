import os
from dataclasses import dataclass


@dataclass
class Config:
    # Slack
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "").strip()
    SLACK_SIGNING_SECRET: str = os.getenv("SLACK_SIGNING_SECRET", "").strip()
    SLACK_CHANNEL: str = os.getenv("SLACK_CHANNEL", "#credgestor-agent").strip() or "#credgestor-agent"

    # Agente
    APPROVAL_TIMEOUT: int = int(os.getenv("APPROVAL_TIMEOUT", "300"))  # segundos
    DOCKER_STACK: str = os.getenv("DOCKER_STACK", "credgestor").strip() or "credgestor"


# Objeto de configuração a ser importado como: from agent.config import config
config = Config()

