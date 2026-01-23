#!/bin/bash

# Script para diagnosticar se as métricas de banco de dados estão sendo expostas

set -e

echo "🔍 Diagnosticando Métricas de Banco de Dados"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
API_URL="${API_URL:-http://localhost:8000}"
METRICS_ENDPOINT="${API_URL}/metrics"

echo "📡 Testando endpoint de métricas: ${METRICS_ENDPOINT}"
echo ""

# Verificar se o endpoint está acessível
if curl -s -f "${METRICS_ENDPOINT}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Endpoint /metrics está acessível${NC}"
else
    echo -e "${RED}❌ Endpoint /metrics NÃO está acessível${NC}"
    echo "   Verifique se a API está rodando e se o endpoint está exposto"
    exit 1
fi

echo ""
echo "🔎 Verificando métricas de banco de dados..."
echo ""

# Métricas esperadas
METRICS=(
    "db_connection_status"
    "db_connection_errors_total"
    "db_connection_duration_seconds"
    "db_query_duration_seconds"
    "db_query_errors_total"
    "db_timeouts_total"
    "db_last_successful_query_timestamp_seconds"
    "db_last_failed_query_timestamp_seconds"
)

# Buscar métricas
METRICS_OUTPUT=$(curl -s "${METRICS_ENDPOINT}")

# Verificar cada métrica
FOUND_COUNT=0
MISSING_METRICS=()

for metric in "${METRICS[@]}"; do
    if echo "${METRICS_OUTPUT}" | grep -q "^${metric}"; then
        echo -e "${GREEN}✅ ${metric}${NC}"
        FOUND_COUNT=$((FOUND_COUNT + 1))
    else
        echo -e "${RED}❌ ${metric} NÃO encontrada${NC}"
        MISSING_METRICS+=("${metric}")
    fi
done

echo ""
echo "📊 Resumo:"
echo "   Total de métricas esperadas: ${#METRICS[@]}"
echo "   Métricas encontradas: ${FOUND_COUNT}"
echo "   Métricas faltando: $((${#METRICS[@]} - FOUND_COUNT))"

if [ ${#MISSING_METRICS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Métricas faltando:${NC}"
    for metric in "${MISSING_METRICS[@]}"; do
        echo "   - ${metric}"
    done
    echo ""
    echo "💡 Possíveis causas:"
    echo "   1. As métricas não estão sendo importadas no main.py"
    echo "   2. As métricas não foram registradas no registry do Prometheus"
    echo "   3. A aplicação precisa ser reiniciada"
    echo ""
    echo "🔧 Solução:"
    echo "   - Verifique se as métricas estão sendo importadas no nível do módulo em backend/main.py"
    echo "   - Reinicie a aplicação após as alterações"
    exit 1
fi

echo ""
echo "🔍 Verificando valores das métricas..."
echo ""

# Verificar se há valores (não apenas definições)
if echo "${METRICS_OUTPUT}" | grep -q "^db_connection_status [0-9]"; then
    CONNECTION_STATUS=$(echo "${METRICS_OUTPUT}" | grep "^db_connection_status " | awk '{print $2}')
    if [ "${CONNECTION_STATUS}" = "1" ]; then
        echo -e "${GREEN}✅ db_connection_status = 1 (conectado)${NC}"
    else
        echo -e "${YELLOW}⚠️  db_connection_status = ${CONNECTION_STATUS} (desconectado ou não inicializado)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  db_connection_status não tem valor (métrica não inicializada)${NC}"
fi

echo ""
echo "📋 Exemplo de métricas encontradas:"
echo ""
echo "${METRICS_OUTPUT}" | grep "^db_" | head -10

echo ""
echo -e "${GREEN}✅ Diagnóstico concluído!${NC}"
echo ""
echo "💡 Próximos passos:"
echo "   1. Verifique se o Prometheus está configurado para coletar de ${METRICS_ENDPOINT}"
echo "   2. Verifique se o job 'credgestor-api' está UP no Prometheus"
echo "   3. Aguarde alguns minutos para o Prometheus coletar as métricas"
echo "   4. Verifique no Grafana se as queries estão corretas"
