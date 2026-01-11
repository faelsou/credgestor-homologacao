#!/bin/bash
# Script para incrementar a versão do projeto
# Uso: ./scripts/increment-version.sh [major|minor|patch]

set -e

VERSION_FILE="VERSION"
CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "1.0.0")

# Parse version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Determine increment type
INCREMENT_TYPE=${1:-patch}

case $INCREMENT_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "❌ Tipo de incremento inválido: $INCREMENT_TYPE"
    echo "Uso: $0 [major|minor|patch]"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
VERSION_TAG="v$NEW_VERSION"

# Update version file
echo "$NEW_VERSION" > "$VERSION_FILE"

# Update docker-compose.yml
DOCKER_COMPOSE="docker-compose.yml"
if [ -f "$DOCKER_COMPOSE" ]; then
  sed -i "s/DOCKER_VERSION:-v[0-9]\+\.[0-9]\+\.[0-9]\+/DOCKER_VERSION:-$VERSION_TAG/g" "$DOCKER_COMPOSE"
  # Atualizar comentário também
  sed -i "s/# Versão atual: v[0-9]\+\.[0-9]\+\.[0-9]\+/# Versão atual: $VERSION_TAG/g" "$DOCKER_COMPOSE"
  echo "✅ docker-compose.yml atualizado"
fi

echo ""
echo "✅ Versão atualizada: $CURRENT_VERSION → $NEW_VERSION"
echo "📦 Tag Docker: $VERSION_TAG"
echo ""
echo "📝 Próximos passos:"
echo "1. Faça commit das mudanças:"
echo "   git add VERSION docker-compose.yml"
echo "   git commit -m \"chore: Bump version to $VERSION_TAG\""
echo ""
echo "2. Crie uma tag git (opcional, mas recomendado):"
echo "   git tag $VERSION_TAG"
echo "   git push origin main --tags"
echo ""
echo "3. Push do código:"
echo "   git push origin main"
echo ""
echo "4. O GitHub Actions criará automaticamente as imagens Docker com a tag $VERSION_TAG"
echo ""
echo "5. Para deploy na VPS:"
echo "   source .env && export DOCKER_VERSION=$VERSION_TAG && docker stack deploy -c docker-compose.yml credgestor"
