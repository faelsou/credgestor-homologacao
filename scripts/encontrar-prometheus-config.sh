#!/bin/bash
# Script para encontrar o arquivo de configuração do Prometheus

set -e

echo "🔍 Procurando arquivo de configuração do Prometheus..."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Método 1: Procurar por volumes Docker
echo -e "${BLUE}1. Procurando em volumes Docker...${NC}"
VOLUMES=$(docker volume ls | grep -i prometheus | awk '{print $2}')
if [ ! -z "$VOLUMES" ]; then
    for VOL in $VOLUMES; do
        MOUNTPOINT=$(docker volume inspect $VOL 2>/dev/null | grep -i mountpoint | cut -d'"' -f4)
        if [ ! -z "$MOUNTPOINT" ]; then
            CONFIG_FILE="$MOUNTPOINT/prometheus.yml"
            if [ -f "$CONFIG_FILE" ]; then
                echo -e "${GREEN}✅ Encontrado: $CONFIG_FILE${NC}"
                echo "   Volume: $VOL"
                echo ""
                echo "Para editar, use:"
                echo "  docker exec -it \$(docker ps -q -f name=prometheus) cat /etc/prometheus/prometheus.yml"
                echo "  OU"
                echo "  sudo nano $CONFIG_FILE"
                exit 0
            fi
        fi
    done
fi

# Método 2: Procurar no container do Prometheus
echo -e "${BLUE}2. Procurando no container do Prometheus...${NC}"
PROMETHEUS_CONTAINER=$(docker ps -q -f name=prometheus | head -1)
if [ ! -z "$PROMETHEUS_CONTAINER" ]; then
    echo "Container encontrado: $PROMETHEUS_CONTAINER"
    
    # Verificar mounts do container
    echo ""
    echo "Mounts do container:"
    docker inspect $PROMETHEUS_CONTAINER | grep -A 10 "Mounts" | grep -E "Source|Destination" | head -10
    
    # Tentar encontrar o arquivo dentro do container
    CONFIG_IN_CONTAINER=$(docker exec $PROMETHEUS_CONTAINER find / -name "prometheus.yml" 2>/dev/null | head -1)
    if [ ! -z "$CONFIG_IN_CONTAINER" ]; then
        echo -e "${GREEN}✅ Arquivo encontrado no container: $CONFIG_IN_CONTAINER${NC}"
        echo ""
        echo "Para ver o conteúdo:"
        echo "  docker exec -it $PROMETHEUS_CONTAINER cat $CONFIG_IN_CONTAINER"
        echo ""
        echo "Para editar (se montado como volume):"
        echo "  Verifique o mount acima e edite o arquivo no host"
    fi
fi

# Método 3: Procurar em locais comuns
echo ""
echo -e "${BLUE}3. Procurando em locais comuns...${NC}"
COMMON_PATHS=(
    "/var/lib/docker/volumes/observability_prometheus_data/_data/prometheus.yml"
    "/var/lib/docker/volumes/observability_prometheus/_data/prometheus.yml"
    "/opt/prometheus/prometheus.yml"
    "/etc/prometheus/prometheus.yml"
    "./prometheus.yml"
)

for PATH in "${COMMON_PATHS[@]}"; do
    if [ -f "$PATH" ]; then
        echo -e "${GREEN}✅ Encontrado: $PATH${NC}"
        exit 0
    fi
done

# Método 4: Verificar se está em um stack Docker Swarm
echo ""
echo -e "${BLUE}4. Verificando stack Docker Swarm...${NC}"
STACKS=$(docker stack ls 2>/dev/null | grep -i observability | awk '{print $1}')
if [ ! -z "$STACKS" ]; then
    echo "Stack encontrado: $STACKS"
    echo ""
    echo "Para ver os serviços:"
    echo "  docker stack services $STACKS"
    echo ""
    echo "Para ver os volumes:"
    echo "  docker volume ls | grep $STACKS"
fi

# Se não encontrou, mostrar instruções
echo ""
echo -e "${YELLOW}⚠️  Arquivo prometheus.yml não foi encontrado automaticamente.${NC}"
echo ""
echo "Opções:"
echo ""
echo "1. Encontrar manualmente:"
echo "   docker exec -it \$(docker ps -q -f name=prometheus) find / -name prometheus.yml"
echo ""
echo "2. Ver configuração atual do Prometheus:"
echo "   docker exec -it \$(docker ps -q -f name=prometheus) cat /etc/prometheus/prometheus.yml"
echo ""
echo "3. Adicionar job via API do Prometheus (se suportado):"
echo "   Consulte a documentação do Prometheus para adicionar targets dinamicamente"
echo ""
echo "4. Configurar via Portainer:"
echo "   - Acesse o stack observability"
echo "   - Edite o serviço prometheus"
echo "   - Adicione o job manualmente no arquivo de configuração"
