#!/bin/bash
# Script para verificar se as variáveis de ambiente estão configuradas corretamente

echo "🔍 Verificando variáveis de ambiente..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Lista de variáveis obrigatórias
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
)

# Lista de variáveis opcionais
OPTIONAL_VARS=(
  "SUPABASE_ANON_KEY"
  "DATABASE_URL"
  "API_HOST"
  "API_PORT"
)

# Verifica variáveis obrigatórias
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    echo -e "${RED}❌ $var não está configurada${NC}"
  else
    echo -e "${GREEN}✅ $var está configurada${NC}"
  fi
done

# Verifica variáveis opcionais
for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠️  $var não está configurada (opcional)${NC}"
  else
    echo -e "${GREEN}✅ $var está configurada${NC}"
  fi
done

# Resultado final
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo -e "\n${GREEN}✅ Todas as variáveis obrigatórias estão configuradas!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ Faltam variáveis obrigatórias: ${MISSING_VARS[*]}${NC}"
  echo -e "${YELLOW}💡 Configure-as no arquivo .env ou exporte-as no ambiente${NC}"
  exit 1
fi
