#!/bin/bash
# Script para configurar o Prometheus para coletar métricas do CredGestor
# Este script ajuda a adicionar o job do CredGestor ao Prometheus

set -e

echo "🔧 Configurando Prometheus para coletar métricas do CredGestor"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o arquivo prometheus.yml existe
PROMETHEUS_CONFIG="${PROMETHEUS_CONFIG:-/var/lib/docker/volumes/observability_prometheus_data/_data/prometheus.yml}"

if [ ! -f "$PROMETHEUS_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Arquivo prometheus.yml não encontrado em: $PROMETHEUS_CONFIG${NC}"
    echo ""
    echo "Por favor, informe o caminho do arquivo prometheus.yml:"
    read -p "Caminho: " PROMETHEUS_CONFIG
    
    if [ ! -f "$PROMETHEUS_CONFIG" ]; then
        echo -e "${RED}❌ Arquivo não encontrado!${NC}"
        echo ""
        echo "Você pode:"
        echo "1. Encontrar o arquivo prometheus.yml do seu stack observability"
        echo "2. Adicionar manualmente o conteúdo de prometheus-config-credgestor.yml"
        echo "3. Ou configurar via Portainer/interface do Prometheus"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Arquivo encontrado: $PROMETHEUS_CONFIG${NC}"
echo ""

# Verificar se o job já existe
if grep -q "job_name: 'credgestor-api'" "$PROMETHEUS_CONFIG"; then
    echo -e "${YELLOW}⚠️  Job 'credgestor-api' já existe no arquivo${NC}"
    read -p "Deseja substituir? (s/N): " REPLACE
    if [[ ! $REPLACE =~ ^[Ss]$ ]]; then
        echo "Operação cancelada."
        exit 0
    fi
    # Remover job existente
    sed -i "/job_name: 'credgestor-api'/,/^  -/d" "$PROMETHEUS_CONFIG"
fi

# Backup do arquivo original
BACKUP_FILE="${PROMETHEUS_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PROMETHEUS_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"

# Adicionar o job ao final da seção scrape_configs
echo ""
echo "Adicionando job 'credgestor-api' ao prometheus.yml..."

# Encontrar a última linha de scrape_configs e adicionar antes do fechamento
if grep -q "scrape_configs:" "$PROMETHEUS_CONFIG"; then
    # Adicionar o job antes do último fechamento de scrape_configs
    cat >> "$PROMETHEUS_CONFIG" << 'EOF'

  # Job para coletar métricas da API CredGestor
  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['167.235.76.26:8000']
        labels:
          service: 'credgestor-api'
          environment: 'production'
EOF
    echo -e "${GREEN}✅ Job adicionado com sucesso!${NC}"
else
    echo -e "${RED}❌ Seção scrape_configs não encontrada no arquivo${NC}"
    echo "Adicione manualmente o conteúdo de prometheus-config-credgestor.yml"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Recarregue a configuração do Prometheus:"
echo "   curl -X POST http://localhost:9090/-/reload"
echo "   OU reinicie o container do Prometheus"
echo ""
echo "2. Verifique se o target está UP:"
echo "   Acesse: http://localhost:9090/targets"
echo ""
echo "3. Teste as métricas:"
echo "   curl http://167.235.76.26:8000/metrics"
echo ""
