#!/bin/bash
# Deploy do stack de staging (réplica isolada da produção)
# Uso: ./staging/deploy-stack.sh [tag]
# Exemplo: ./staging/deploy-stack.sh latest

set -euo pipefail

VERSION=${1:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME="credgestor-staging"

cd "$SCRIPT_DIR"

echo "🚀 Deploy CredGestor STAGING"
echo "📦 Tag: $VERSION"
echo "🌐 URL: https://staging.credgestor.app.br"
echo "📁 Path: $SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "❌ Arquivo staging/.env não encontrado"
  echo "📝 Crie com: cp staging/.env.example staging/.env"
  exit 1
fi

echo "📝 Carregando variáveis de ambiente..."
set -a
# shellcheck disable=SC1091
source .env
set +a

export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY DATABASE_URL API_HOST API_PORT
export DOCKER_VERSION="$VERSION"

if ! docker info | grep -q "Swarm: active"; then
  echo "🔄 Inicializando Docker Swarm..."
  docker swarm init || true
fi

if ! docker network ls | grep -q "network_public"; then
  echo "🌐 Criando rede network_public..."
  docker network create --driver overlay network_public || true
fi

echo "📥 Pull das imagens..."
docker pull "faelsouz/credgestor-homologacao-backend:$VERSION" || true
docker pull "faelsouz/credgestor-homologacao-frontend:$VERSION" || true

echo "🚀 docker stack deploy → $STACK_NAME"
docker stack deploy -c docker-compose.yml "$STACK_NAME"

echo "🔄 Forçando atualização dos serviços..."
docker service update --force --image "faelsouz/credgestor-homologacao-backend:$VERSION" "${STACK_NAME}_api" || true
docker service update --force --image "faelsouz/credgestor-homologacao-frontend:$VERSION" "${STACK_NAME}_site" || true

echo "✅ Deploy staging concluído"
sleep 5
docker stack services "$STACK_NAME"
docker stack ps "$STACK_NAME" --no-trunc | head -15

echo ""
echo "🔍 Logs:"
echo "   docker service logs -f ${STACK_NAME}_api"
echo "   docker service logs -f ${STACK_NAME}_site"
echo "🩺 Health: curl -f https://staging.credgestor.app.br/api/health"
