#!/bin/bash
# Script para atualizar a versão no docker-compose.yml
# Uso: ./scripts/update-docker-compose-version.sh [versão]

set -e

VERSION_FILE="VERSION"
DOCKER_COMPOSE="docker-compose.yml"

if [ -z "$1" ]; then
  # Ler versão do arquivo VERSION
  if [ ! -f "$VERSION_FILE" ]; then
    echo "❌ Arquivo VERSION não encontrado!"
    exit 1
  fi
  VERSION=$(cat "$VERSION_FILE")
else
  VERSION=$1
fi

# Validar formato de versão (X.Y.Z)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Formato de versão inválido: $VERSION"
  echo "Use o formato: X.Y.Z (ex: 1.0.5)"
  exit 1
fi

VERSION_TAG="v$VERSION"

echo "🔄 Atualizando docker-compose.yml para versão $VERSION_TAG..."

# Atualizar versão padrão no docker-compose.yml
sed -i "s/DOCKER_VERSION:-v[0-9]\+\.[0-9]\+\.[0-9]\+/DOCKER_VERSION:-$VERSION_TAG/g" "$DOCKER_COMPOSE"

echo "✅ docker-compose.yml atualizado!"
echo "📦 Versão: $VERSION_TAG"
echo ""
echo "Para aplicar:"
echo "  source .env && export DOCKER_VERSION=$VERSION_TAG && docker stack deploy -c docker-compose.yml credgestor"
