#!/bin/bash
# Script para fazer deploy do Docker Stack com variáveis de ambiente corretas
# Uso: ./scripts/deploy-stack.sh [versão]

set -e

VERSION=${1:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🚀 Fazendo deploy do Docker Stack..."
echo "📦 Versão: $VERSION"

# Verifica se o arquivo .env existe
if [ ! -f .env ]; then
  echo "❌ Erro: Arquivo .env não encontrado em $PROJECT_DIR"
  echo "📝 Crie o arquivo .env com as variáveis necessárias"
  exit 1
fi

# Carrega e exporta variáveis do .env
echo "📝 Carregando variáveis de ambiente do arquivo .env..."
set -a
source .env
set +a

# Exporta explicitamente as variáveis críticas
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY DATABASE_URL API_HOST API_PORT DOCKER_VERSION=$VERSION

echo "✅ Variáveis de ambiente carregadas:"
echo "   - SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "   - SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:30}..."
echo "   - SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."

# Verifica se o Docker Swarm está inicializado
if ! docker info | grep -q "Swarm: active"; then
  echo "🔄 Inicializando Docker Swarm..."
  docker swarm init || echo "⚠️  Docker Swarm já está inicializado ou erro ao inicializar"
fi

# Verifica se a rede existe, se não, cria
if ! docker network ls | grep -q "network_public"; then
  echo "🌐 Criando rede network_public..."
  docker network create --driver overlay network_public || echo "⚠️  Rede já existe ou erro ao criar"
fi

# Faz pull das imagens mais recentes
echo "📥 Fazendo pull das imagens Docker..."
docker pull faelsouz/credgestor-homologacao-backend:$VERSION || true
docker pull faelsouz/credgestor-homologacao-frontend:$VERSION || true

# Executa o deploy
echo "🚀 Executando deploy do stack Docker..."
docker stack deploy -c docker-compose.yml credgestor

echo "✅ Deploy concluído com sucesso!"
echo "📊 Verificando status dos serviços..."
sleep 5
docker stack services credgestor

echo ""
echo "📋 Status dos containers:"
docker stack ps credgestor --no-trunc | head -10

echo ""
echo "🔍 Para ver os logs:"
echo "   docker service logs -f credgestor_api"
echo "   docker service logs -f credgestor_site"
