#!/bin/bash

# Script de Ação Rápida SRE - CredGestor
# Executa verificações e ações comuns baseadas no dashboard

set -e

PROMETHEUS_URL="http://167.235.76.26:9090"
API_URL="https://credgestor.app.br"

echo "🚀 Ação Rápida SRE - CredGestor"
echo "================================"
echo ""

# Cores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 1. Verificar Status do Serviço
echo "1️⃣ Verificando Status do Serviço..."
echo "-----------------------------------"
SERVICE_STATUS=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=up{job=\"credgestor-api\"}" | jq -r '.data.result[0].value[1] // "0"')
if [ "$SERVICE_STATUS" == "1" ]; then
    echo -e "${GREEN}✅ Serviço UP${NC}"
else
    echo -e "${RED}❌ Serviço DOWN - AÇÃO IMEDIATA NECESSÁRIA${NC}"
    echo "   Verificando logs..."
    docker service logs credgestor_api --tail 50 --no-trunc 2>/dev/null || echo "   Não foi possível acessar logs"
fi

# 2. Verificar Taxa de Sucesso
echo ""
echo "2️⃣ Verificando Taxa de Sucesso (SLO: >99.9%)..."
echo "------------------------------------------------"
SUCCESS_RATE=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=(sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"2..\"}[5m])) / sum(rate(http_requests_total{job=\"credgestor-api\"}[5m]))) * 100" | jq -r '.data.result[0].value[1] // "0"')
SUCCESS_RATE_INT=$(echo "$SUCCESS_RATE" | cut -d. -f1)

if (( $(echo "$SUCCESS_RATE > 99.9" | bc -l) )); then
    echo -e "${GREEN}✅ Taxa de Sucesso: ${SUCCESS_RATE}%${NC}"
elif (( $(echo "$SUCCESS_RATE > 99.5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Taxa de Sucesso: ${SUCCESS_RATE}% - Atenção${NC}"
else
    echo -e "${RED}❌ Taxa de Sucesso: ${SUCCESS_RATE}% - CRÍTICO${NC}"
    echo "   Investigando erros..."
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m])) by (handler, status)" | jq -r '.data.result[] | "   - \(.metric.handler): \(.metric.status) = \(.value[1])"'
fi

# 3. Verificar Latência P95
echo ""
echo "3️⃣ Verificando Latência P95 (SLO: <500ms)..."
echo "---------------------------------------------"
LATENCY_P95=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"credgestor-api\"}[5m])) by (le)) * 1000" | jq -r '.data.result[0].value[1] // "0"')
LATENCY_INT=$(echo "$LATENCY_P95" | cut -d. -f1)

if (( $(echo "$LATENCY_P95 < 200" | bc -l) )); then
    echo -e "${GREEN}✅ Latência P95: ${LATENCY_P95}ms${NC}"
elif (( $(echo "$LATENCY_P95 < 500" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Latência P95: ${LATENCY_P95}ms - Atenção${NC}"
else
    echo -e "${RED}❌ Latência P95: ${LATENCY_P95}ms - CRÍTICO${NC}"
    echo "   Verificando handlers mais lentos..."
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"credgestor-api\"}[5m])) by (le, handler)) * 1000" | jq -r '.data.result[] | "   - \(.metric.handler): \(.value[1])ms"' | sort -t: -k2 -rn | head -5
fi

# 4. Verificar Erros 5xx
echo ""
echo "4️⃣ Verificando Erros 5xx..."
echo "---------------------------"
ERROR_5XX=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m]))" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "$ERROR_5XX == 0" | bc -l) )); then
    echo -e "${GREEN}✅ Nenhum erro 5xx${NC}"
elif (( $(echo "$ERROR_5XX < 0.1" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Erros 5xx: ${ERROR_5XX} req/s - Baixo${NC}"
else
    echo -e "${RED}❌ Erros 5xx: ${ERROR_5XX} req/s - CRÍTICO${NC}"
    echo "   Erros por handler:"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m])) by (handler, status)" | jq -r '.data.result[] | "   - \(.metric.handler) [\(.metric.status)]: \(.value[1]) req/s"'
    echo ""
    echo "   📋 Ação: Verificar logs recentes:"
    echo "   docker service logs credgestor_api --tail 1000 | grep -i '500\|error' | tail -20"
fi

# 5. Verificar Erros 4xx
echo ""
echo "5️⃣ Verificando Erros 4xx..."
echo "---------------------------"
ERROR_4XX=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"4..\"}[5m]))" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "$ERROR_4XX == 0" | bc -l) )); then
    echo -e "${GREEN}✅ Nenhum erro 4xx${NC}"
else
    echo -e "${YELLOW}⚠️  Erros 4xx: ${ERROR_4XX} req/s${NC}"
    echo "   Erros por handler:"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"4..\"}[5m])) by (handler, status)" | jq -r '.data.result[] | "   - \(.metric.handler) [\(.metric.status)]: \(.value[1]) req/s"'
fi

# 6. Verificar Uso de Recursos
echo ""
echo "6️⃣ Verificando Uso de Recursos..."
echo "----------------------------------"
CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" $(docker ps -q --filter "name=credgestor_api") 2>/dev/null | head -1 | sed 's/%//' || echo "0")
MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" $(docker ps -q --filter "name=credgestor_api") 2>/dev/null | head -1 | sed 's/%//' || echo "0")

if [ -n "$CPU_USAGE" ] && [ "$CPU_USAGE" != "0" ]; then
    CPU_AVAIL=$(echo "100 - $CPU_USAGE" | bc)
    if (( $(echo "$CPU_AVAIL > 30" | bc -l) )); then
        echo -e "${GREEN}✅ CPU Disponível: ${CPU_AVAIL}%${NC}"
    elif (( $(echo "$CPU_AVAIL > 10" | bc -l) )); then
        echo -e "${YELLOW}⚠️  CPU Disponível: ${CPU_AVAIL}% - Atenção${NC}"
    else
        echo -e "${RED}❌ CPU Disponível: ${CPU_AVAIL}% - CRÍTICO${NC}"
    fi
fi

if [ -n "$MEM_USAGE" ] && [ "$MEM_USAGE" != "0" ]; then
    MEM_AVAIL=$(echo "100 - $MEM_USAGE" | bc)
    if (( $(echo "$MEM_AVAIL > 20" | bc -l) )); then
        echo -e "${GREEN}✅ Memória Disponível: ${MEM_AVAIL}%${NC}"
    elif (( $(echo "$MEM_AVAIL > 10" | bc -l) )); then
        echo -e "${YELLOW}⚠️  Memória Disponível: ${MEM_AVAIL}% - Atenção${NC}"
    else
        echo -e "${RED}❌ Memória Disponível: ${MEM_AVAIL}% - CRÍTICO${NC}"
    fi
fi

# 7. Resumo e Recomendações
echo ""
echo "================================"
echo "📋 Resumo e Recomendações"
echo "================================"
echo ""

ISSUES=0

if [ "$SERVICE_STATUS" != "1" ]; then
    echo -e "${RED}🔴 AÇÃO IMEDIATA: Serviço está DOWN${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ -n "$SUCCESS_RATE" ] && (( $(echo "$SUCCESS_RATE < 99.5" | bc -l) )); then
    echo -e "${RED}🔴 AÇÃO IMEDIATA: Taxa de sucesso abaixo de 99.5%${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ -n "$LATENCY_P95" ] && (( $(echo "$LATENCY_P95 > 500" | bc -l) )); then
    echo -e "${RED}🔴 AÇÃO IMEDIATA: Latência P95 acima de 500ms${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ -n "$ERROR_5XX" ] && (( $(echo "$ERROR_5XX > 0.1" | bc -l) )); then
    echo -e "${YELLOW}🟡 ATENÇÃO: Erros 5xx presentes - investigar${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Sistema operando normalmente${NC}"
    echo ""
    echo "💡 Próximas melhorias recomendadas:"
    echo "   - Implementar cache Redis"
    echo "   - Otimizar queries do banco de dados"
    echo "   - Adicionar índices estratégicos"
    echo "   - Configurar alertas no Grafana"
else
    echo ""
    echo "📚 Consulte os guias para mais detalhes:"
    echo "   - GUIA_ATUACAO_SRE.md"
    echo "   - INSIGHTS_MELHORIAS.md"
fi

echo ""
echo "🔗 Comandos úteis:"
echo "   - Ver logs: docker service logs credgestor_api --tail 100 --follow"
echo "   - Ver métricas: curl -s ${PROMETHEUS_URL}/api/v1/query?query=up{job=\"credgestor-api\"}"
echo "   - Ver saúde: curl ${API_URL}/health"
