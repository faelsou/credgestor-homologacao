#!/bin/bash

# Script de diagnóstico para problemas "No data" no Grafana

echo "🔍 Diagnóstico do Grafana Dashboard"
echo "===================================="
echo ""

PROMETHEUS_URL="http://167.235.76.26:9090"
API_URL="https://credgestor.app.br/api/metrics"

echo "1️⃣ Verificando Prometheus..."
echo "----------------------------"
if curl -s "${PROMETHEUS_URL}/api/v1/status/config" > /dev/null 2>&1; then
    echo "✅ Prometheus está acessível"
else
    echo "❌ Prometheus NÃO está acessível em ${PROMETHEUS_URL}"
    exit 1
fi

echo ""
echo "2️⃣ Verificando Target credgestor-api..."
echo "----------------------------------------"
TARGET_STATUS=$(curl -s "${PROMETHEUS_URL}/api/v1/targets" | jq -r '.data.activeTargets[] | select(.labels.job == "credgestor-api") | .health')
if [ "$TARGET_STATUS" == "up" ]; then
    echo "✅ Target credgestor-api está UP"
else
    echo "❌ Target credgestor-api está DOWN"
fi

echo ""
echo "3️⃣ Verificando métricas HTTP..."
echo "--------------------------------"
HTTP_METRICS=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=http_requests_total" | jq -r '.data.result | length')
if [ "$HTTP_METRICS" -gt 0 ]; then
    echo "✅ Encontradas ${HTTP_METRICS} métricas http_requests_total"
    echo ""
    echo "   Exemplos de métricas:"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=http_requests_total" | jq -r '.data.result[0:3] | .[] | "   - \(.metric.job) - \(.metric.handler) - \(.metric.status)"'
else
    echo "❌ Nenhuma métrica http_requests_total encontrada"
fi

echo ""
echo "4️⃣ Verificando query up{job=\"credgestor-api\"}..."
echo "-------------------------------------------------"
UP_RESULT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=up{job=\"credgestor-api\"}" | jq -r '.data.result | length')
if [ "$UP_RESULT" -gt 0 ]; then
    echo "✅ Query up{job=\"credgestor-api\"} retorna dados"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=up{job=\"credgestor-api\"}" | jq -r '.data.result[] | "   - \(.metric.job) = \(.value[1])"'
else
    echo "⚠️  Query up{job=\"credgestor-api\"} não retorna dados"
    echo "   Tentando sem filtro de job..."
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=up" | jq -r '.data.result[] | select(.metric.job == "credgestor-api") | "   - \(.metric.job) = \(.value[1])"'
fi

echo ""
echo "5️⃣ Verificando taxa de requisições..."
echo "-------------------------------------"
RATE_RESULT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\"}[5m]))" | jq -r '.data.result | length')
if [ "$RATE_RESULT" -gt 0 ]; then
    RATE_VALUE=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\"}[5m]))" | jq -r '.data.result[0].value[1]')
    echo "✅ Taxa de requisições: ${RATE_VALUE} req/s"
else
    echo "⚠️  Não foi possível calcular a taxa de requisições"
fi

echo ""
echo "6️⃣ Verificando métricas da API diretamente..."
echo "----------------------------------------------"
if curl -s "${API_URL}" | grep -q "http_requests_total"; then
    echo "✅ API está expondo métricas HTTP"
    echo ""
    echo "   Exemplos:"
    curl -s "${API_URL}" | grep "^http_requests_total" | head -3 | sed 's/^/   - /'
else
    echo "❌ API NÃO está expondo métricas HTTP"
fi

echo ""
echo "7️⃣ Verificando labels disponíveis..."
echo "-------------------------------------"
echo "   Jobs disponíveis:"
curl -s "${PROMETHEUS_URL}/api/v1/label/job/values" | jq -r '.data[]' | sed 's/^/   - /'

echo ""
echo "===================================="
echo "📋 Resumo:"
echo "===================================="
echo ""
echo "✅ Se todas as verificações passaram, o problema pode ser:"
echo "   1. Data source não configurado corretamente no Grafana"
echo "   2. Variáveis do dashboard não selecionadas"
echo "   3. Time range muito curto"
echo "   4. Cache do navegador (tente Ctrl+F5)"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Verifique o data source 'prometheus-credgestor' no Grafana"
echo "   2. Teste as queries no Grafana Explore"
echo "   3. Verifique o time range do dashboard (use 'Last 6 hours')"
echo "   4. Recarregue o dashboard (F5 ou Ctrl+F5)"
