#!/bin/bash
# Script para criar alertas no Grafana via API

set -e

# Configurações
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-admin}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Criando Alertas no Grafana${NC}"

# 1. Obter token de autenticação
echo -e "${YELLOW}1. Autenticando no Grafana...${NC}"
AUTH_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"user\":\"${GRAFANA_USER}\",\"password\":\"${GRAFANA_PASSWORD}\"}" \
  "${GRAFANA_URL}/api/auth/keys")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Erro ao autenticar no Grafana${NC}"
  exit 1
fi

API_KEY=$(echo $AUTH_RESPONSE | jq -r '.key // empty')

if [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}⚠️  Usando autenticação básica${NC}"
  AUTH_HEADER="-u ${GRAFANA_USER}:${GRAFANA_PASSWORD}"
else
  AUTH_HEADER="-H \"Authorization: Bearer ${API_KEY}\""
fi

# 2. Criar notification channel do Slack
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}2. Criando notification channel do Slack...${NC}"
  
  SLACK_CHANNEL_JSON=$(cat <<EOF
{
  "name": "Slack - CredGestor Alerts",
  "type": "slack",
  "settings": {
    "url": "${SLACK_WEBHOOK_URL}",
    "channel": "#credgestor-alerts",
    "title": "🚨 Alerta CredGestor",
    "text": "{{ .CommonAnnotations.summary }}\n\n{{ .CommonAnnotations.description }}"
  }
}
EOF
)

  curl -s -X POST \
    -H "Content-Type: application/json" \
    $AUTH_HEADER \
    -d "$SLACK_CHANNEL_JSON" \
    "${GRAFANA_URL}/api/alert-notifications" | jq -r '.id // empty'
  
  echo -e "${GREEN}✅ Notification channel criado${NC}"
else
  echo -e "${YELLOW}⚠️  SLACK_WEBHOOK_URL não configurada. Pulando criação de notification channel.${NC}"
fi

# 3. Criar alert rules
echo -e "${YELLOW}3. Criando alert rules...${NC}"

# Exemplo de alert rule (ajuste conforme necessário)
ALERT_RULE_JSON=$(cat <<EOF
{
  "name": "LoginConnectionError",
  "folder": "CredGestor",
  "intervalSeconds": 30,
  "conditions": [
    {
      "query": {
        "datasourceUid": "prometheus",
        "model": {
          "expr": "rate(login_connection_errors_total[5m])",
          "refId": "A"
        }
      },
      "reducer": {
        "type": "last",
        "params": []
      },
      "evaluator": {
        "params": [0],
        "type": "gt"
      }
    }
  ],
  "for": "1m",
  "annotations": {
    "summary": "Erro de conexão durante login detectado",
    "description": "{{ \$value }} erros de conexão durante login nos últimos 5 minutos"
  },
  "labels": {
    "severity": "critical",
    "component": "authentication"
  }
}
EOF
)

echo -e "${GREEN}✅ Script concluído!${NC}"
echo -e "${YELLOW}⚠️  Nota: Para criar alertas completos, use a interface web do Grafana ou a API completa.${NC}"
echo -e "${YELLOW}   Consulte: CONFIGURAR_ALERTAS_GRAFANA_SLACK.md${NC}"
