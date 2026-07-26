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
    REQUIRE_APPROVAL: bool = os.getenv("REQUIRE_APPROVAL", "true").lower() in {"1", "true", "yes"}

    # LLM (usado pelo agente de troubleshooting)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic").strip() or "anthropic"
    LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20241022").strip() or "claude-3-5-sonnet-20241022"
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()


# Objeto de configuração a ser importado como: from agent.config import config
config = Config()

