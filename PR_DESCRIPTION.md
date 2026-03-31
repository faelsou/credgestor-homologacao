# feat: Agent status 1h + Slack test endpoint

## Mudanças
- agent/main.py: agenda envio de status saudável a cada 1h (formato legado)
- agent/config.py: lê SLACK_* e APPROVAL_TIMEOUT/DOCKER_STACK do ambiente
- backend/main.py: adiciona POST /slack/test (envio via SLACK_WEBHOOK_URL)

## Como testar
1) Exportar SLACK_WEBHOOK_URL (ou SLACK_BOT_TOKEN + SLACK_CHANNEL)
2) Enviar teste rápido: curl -X POST http://localhost:8000/slack/test -d '{message:Teste}' -H 'Content-Type: application/json'
3) Subir agent (compose) e validar envio automático em 1h ou forçar chamada do main
