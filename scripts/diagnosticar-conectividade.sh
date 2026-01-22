#!/bin/bash

# Script de Diagnóstico de Conectividade - Prometheus e API
# Autor: Auto-generated
# Data: $(date +%Y-%m-%d)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Diagnóstico de Conectividade${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Verificar serviços Docker
echo -e "${YELLOW}[1/8] Verificando serviços Docker...${NC}"
echo ""
echo "Serviços do CredGestor:"
docker service ls | grep credgestor || echo -e "${RED}❌ Nenhum serviço credgestor encontrado${NC}"
echo ""

echo "Serviços do Observability (Prometheus):"
docker service ls | grep -E "prometheus|observability" || echo -e "${YELLOW}⚠️  Nenhum serviço observability encontrado${NC}"
echo ""

# 2. Verificar containers
echo -e "${YELLOW}[2/8] Verificando containers...${NC}"
echo ""
API_CONTAINER=$(docker ps -q -f name=credgestor_api)
if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}❌ Container da API não encontrado${NC}"
else
    echo -e "${GREEN}✅ Container da API encontrado: $API_CONTAINER${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep credgestor
fi
echo ""

PROMETHEUS_CONTAINER=$(docker ps -q -f name=prometheus)
if [ -z "$PROMETHEUS_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️  Container do Prometheus não encontrado${NC}"
else
    echo -e "${GREEN}✅ Container do Prometheus encontrado: $PROMETHEUS_CONTAINER${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep prometheus
fi
echo ""

# 3. Verificar se API está respondendo
echo -e "${YELLOW}[3/8] Testando endpoint /metrics da API...${NC}"
echo ""

# Teste via Traefik (HTTPS)
echo "Teste 1: Via Traefik (HTTPS)"
if curl -s -k -f -m 5 https://credgestor.app.br/api/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API acessível via Traefik HTTPS${NC}"
    curl -s -k https://credgestor.app.br/api/metrics | head -5
else
    echo -e "${RED}❌ API não acessível via Traefik HTTPS${NC}"
fi
echo ""

# Teste direto na porta 8000
echo "Teste 2: Direto na porta 8000 (localhost)"
if curl -s -f -m 5 http://localhost:8000/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API acessível em localhost:8000${NC}"
    curl -s http://localhost:8000/metrics | head -5
else
    echo -e "${RED}❌ API não acessível em localhost:8000${NC}"
fi
echo ""

# Teste de dentro do container
if [ ! -z "$API_CONTAINER" ]; then
    echo "Teste 3: De dentro do container"
    if docker exec $API_CONTAINER curl -s -f -m 5 http://localhost:8000/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API responde de dentro do container${NC}"
        docker exec $API_CONTAINER curl -s http://localhost:8000/metrics | head -5
    else
        echo -e "${RED}❌ API não responde de dentro do container${NC}"
    fi
    echo ""
fi

# 4. Verificar health check
echo -e "${YELLOW}[4/8] Testando health check...${NC}"
echo ""
if curl -s -k -f -m 5 https://credgestor.app.br/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    curl -s -k https://credgestor.app.br/api/health | jq . 2>/dev/null || curl -s -k https://credgestor.app.br/api/health
else
    echo -e "${RED}❌ Health check falhou${NC}"
fi
echo ""

# 5. Verificar Prometheus
echo -e "${YELLOW}[5/8] Testando acesso ao Prometheus...${NC}"
echo ""

PROMETHEUS_URLS=(
    "http://localhost:9090"
    "http://167.235.76.26:9090"
    "https://prometheus.aiagentautomate.com.br"
)

PROMETHEUS_ACCESSIBLE=false
for url in "${PROMETHEUS_URLS[@]}"; do
    echo "Testando: $url"
    if curl -s -f -m 5 "$url/-/healthy" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Prometheus acessível em: $url${NC}"
        PROMETHEUS_ACCESSIBLE=true
        PROMETHEUS_URL=$url
        break
    else
        echo -e "${RED}❌ Prometheus não acessível em: $url${NC}"
    fi
done
echo ""

# 6. Verificar targets do Prometheus
if [ "$PROMETHEUS_ACCESSIBLE" = true ]; then
    echo -e "${YELLOW}[6/8] Verificando targets do Prometheus...${NC}"
    echo ""
    
    # Tentar obter targets via API
    TARGETS=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null)
    if [ ! -z "$TARGETS" ]; then
        echo "Targets do Prometheus:"
        echo "$TARGETS" | jq -r '.data.activeTargets[] | "\(.labels.job // "unknown"): \(.health // "unknown") - \(.scrapeUrl // "unknown")"' 2>/dev/null || echo "$TARGETS"
        
        # Verificar especificamente credgestor-api
        if echo "$TARGETS" | grep -q "credgestor-api"; then
            echo ""
            echo "Status do target credgestor-api:"
            echo "$TARGETS" | jq -r '.data.activeTargets[] | select(.labels.job=="credgestor-api") | "Health: \(.health), URL: \(.scrapeUrl)"' 2>/dev/null
        else
            echo -e "${YELLOW}⚠️  Target 'credgestor-api' não encontrado${NC}"
        fi
    else
        echo -e "${RED}❌ Não foi possível obter targets do Prometheus${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}[6/8] Pulando verificação de targets (Prometheus não acessível)${NC}"
    echo ""
fi

# 7. Verificar instrumentação Prometheus na API
echo -e "${YELLOW}[7/8] Verificando instrumentação Prometheus na API...${NC}"
echo ""

if [ ! -z "$API_CONTAINER" ]; then
    echo "Verificando se prometheus-fastapi-instrumentator está instalado:"
    if docker exec $API_CONTAINER pip list 2>/dev/null | grep -q prometheus-fastapi-instrumentator; then
        echo -e "${GREEN}✅ prometheus-fastapi-instrumentator está instalado${NC}"
        docker exec $API_CONTAINER pip list | grep prometheus
    else
        echo -e "${RED}❌ prometheus-fastapi-instrumentator NÃO está instalado${NC}"
    fi
    echo ""
    
    echo "Verificando se o código tem instrumentação:"
    if docker exec $API_CONTAINER grep -q "instrumentator" /app/backend/main.py 2>/dev/null; then
        echo -e "${GREEN}✅ Código tem instrumentação${NC}"
        docker exec $API_CONTAINER grep -A 5 "instrumentator" /app/backend/main.py | head -10
    else
        echo -e "${RED}❌ Código NÃO tem instrumentação${NC}"
    fi
    echo ""
else
    echo -e "${RED}❌ Container da API não encontrado para verificação${NC}"
    echo ""
fi

# 8. Verificar configuração do Prometheus
echo -e "${YELLOW}[8/8] Verificando configuração do Prometheus...${NC}"
echo ""

PROMETHEUS_CONFIG="/var/www/findfruit/observability/prometheus/prometheus.yml"
if [ -f "$PROMETHEUS_CONFIG" ]; then
    echo -e "${GREEN}✅ Arquivo de configuração encontrado: $PROMETHEUS_CONFIG${NC}"
    echo ""
    echo "Configuração do job credgestor-api:"
    if grep -A 10 "credgestor-api" "$PROMETHEUS_CONFIG" 2>/dev/null; then
        echo -e "${GREEN}✅ Job 'credgestor-api' encontrado na configuração${NC}"
    else
        echo -e "${RED}❌ Job 'credgestor-api' NÃO encontrado na configuração${NC}"
        echo ""
        echo "Você precisa adicionar o job. Veja: prometheus-config-credgestor.yml"
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo de configuração não encontrado em: $PROMETHEUS_CONFIG${NC}"
    echo "Procurando em outros locais..."
    find /var/www -name "prometheus.yml" 2>/dev/null | head -5
fi
echo ""

# Resumo
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Resumo do Diagnóstico${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ! -z "$API_CONTAINER" ]; then
    echo -e "${GREEN}✅ Container da API: Rodando${NC}"
else
    echo -e "${RED}❌ Container da API: Não encontrado${NC}"
fi

if [ "$PROMETHEUS_ACCESSIBLE" = true ]; then
    echo -e "${GREEN}✅ Prometheus: Acessível em $PROMETHEUS_URL${NC}"
else
    echo -e "${RED}❌ Prometheus: Não acessível${NC}"
fi

echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Se a API não está acessível, verifique: docker service logs credgestor_api"
echo "2. Se o Prometheus não está acessível, verifique: docker service logs observability_prometheus"
echo "3. Se o target está DOWN, verifique a configuração do Prometheus"
echo "4. Consulte: DIAGNOSTICO_CONECTIVIDADE.md para mais detalhes"
echo ""
