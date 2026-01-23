#!/bin/bash
# Script para configurar o Alertmanager com webhook do Slack

set -e

ALERTMANAGER_CONFIG="/etc/alertmanager/alertmanager.yml"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "⚠️  AVISO: SLACK_WEBHOOK_URL não configurada"
    echo "   Configure a variável de ambiente SLACK_WEBHOOK_URL"
    echo "   ou edite o arquivo alertmanager.yml diretamente"
    exit 1
fi

# Substituir ${SLACK_WEBHOOK_URL} no arquivo de configuração
if [ -f "$ALERTMANAGER_CONFIG" ]; then
    sed -i "s|\${SLACK_WEBHOOK_URL}|${SLACK_WEBHOOK_URL}|g" "$ALERTMANAGER_CONFIG"
    echo "✅ Webhook do Slack configurado em $ALERTMANAGER_CONFIG"
else
    echo "❌ Arquivo de configuração não encontrado: $ALERTMANAGER_CONFIG"
    exit 1
fi
