#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  rollback.sh --backend-tag <tag> --frontend-tag <tag> [--stack <nome>] [--repo-prefix <prefixo>] [--skip-healthcheck]

Exemplo:
  rollback.sh \
    --backend-tag backend-20260326-153000-abc1234 \
    --frontend-tag frontend-20260326-153000-abc1234 \
    --stack credgestor \
    --repo-prefix faelsouz/credgestor-homologacao

Parâmetros:
  --backend-tag      Tag da imagem backend (obrigatório)
  --frontend-tag     Tag da imagem frontend (obrigatório)
  --stack            Nome do stack docker swarm (default: credgestor)
  --repo-prefix      Prefixo das imagens no Docker Hub (default: faelsouz/credgestor-homologacao)
  --skip-healthcheck Não falha em caso de healthcheck HTTP indisponível
EOF
}

STACK_NAME="credgestor"
REPO_PREFIX="faelsouz/credgestor-homologacao"
BACKEND_TAG=""
FRONTEND_TAG=""
SKIP_HEALTHCHECK="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-tag)
      BACKEND_TAG="${2:-}"
      shift 2
      ;;
    --frontend-tag)
      FRONTEND_TAG="${2:-}"
      shift 2
      ;;
    --stack)
      STACK_NAME="${2:-}"
      shift 2
      ;;
    --repo-prefix)
      REPO_PREFIX="${2:-}"
      shift 2
      ;;
    --skip-healthcheck)
      SKIP_HEALTHCHECK="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "❌ Parâmetro desconhecido: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BACKEND_TAG" || -z "$FRONTEND_TAG" ]]; then
  echo "❌ É obrigatório informar --backend-tag e --frontend-tag"
  usage
  exit 1
fi

API_IMAGE="${REPO_PREFIX}-backend:${BACKEND_TAG}"
SITE_IMAGE="${REPO_PREFIX}-frontend:${FRONTEND_TAG}"

echo "🔄 Iniciando rollback..."
echo "   Stack: ${STACK_NAME}"
echo "   Backend image: ${API_IMAGE}"
echo "   Frontend image: ${SITE_IMAGE}"

if ! docker info | grep -q "Swarm: active"; then
  echo "❌ Docker Swarm não está ativo neste servidor."
  exit 1
fi

echo "📥 Validando imagens no Docker Hub..."
docker pull "${API_IMAGE}"
docker pull "${SITE_IMAGE}"

echo "🚀 Aplicando rollback nos serviços..."
docker service update --with-registry-auth --image "${API_IMAGE}" "${STACK_NAME}_api"
docker service update --with-registry-auth --image "${SITE_IMAGE}" "${STACK_NAME}_site"

echo "⏳ Aguardando estabilização dos serviços..."
sleep 20

echo "📊 Status atual do stack:"
docker stack services "${STACK_NAME}" || true
docker stack ps "${STACK_NAME}" --no-trunc || true

if [[ "${SKIP_HEALTHCHECK}" == "true" ]]; then
  echo "⚠️ Healthcheck HTTP ignorado por parâmetro."
  exit 0
fi

echo "🧪 Executando healthcheck após rollback..."
if curl -fsS --max-time 15 "https://credgestor.app.br/api/health" >/dev/null; then
  echo "✅ Healthcheck OK em https://credgestor.app.br/api/health"
  exit 0
fi

if curl -fsS --max-time 15 "http://127.0.0.1:8000/health" >/dev/null; then
  echo "✅ Healthcheck OK em http://127.0.0.1:8000/health"
  exit 0
fi

echo "❌ Healthcheck falhou após rollback."
exit 1
