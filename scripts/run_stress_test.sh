#!/bin/bash
# Script auxiliar para executar testes de stress

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}🚀 Script de Teste de Stress - CredGestor${NC}\n"

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 não encontrado. Por favor, instale Python 3.8 ou superior.${NC}"
    exit 1
fi

# Verificar se as dependências estão instaladas
echo -e "${YELLOW}📦 Verificando dependências...${NC}"
if ! python3 -c "import httpx" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  httpx não encontrado. Instalando...${NC}"
    pip3 install httpx
fi

if ! python3 -c "import rich" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  rich não encontrado. Instalando...${NC}"
    pip3 install rich
fi

echo -e "${GREEN}✅ Dependências OK${NC}\n"

# Configurações padrão
BASE_URL="${BASE_URL:-http://localhost:8000}"
USERS="${USERS:-10}"
DURATION="${DURATION:-60}"
RAMP_UP="${RAMP_UP:-5}"

# Verificar se variáveis de ambiente estão definidas
if [ -z "$AUTH_EMAIL" ] || [ -z "$AUTH_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Variáveis AUTH_EMAIL e AUTH_PASSWORD não definidas${NC}"
    echo -e "${YELLOW}   O teste será executado apenas em endpoints públicos${NC}\n"
    
    # Executar sem autenticação
    python3 "$SCRIPT_DIR/stress_test.py" \
        --base-url "$BASE_URL" \
        --users "$USERS" \
        --duration "$DURATION" \
        --ramp-up "$RAMP_UP" \
        "$@"
else
    echo -e "${GREEN}✅ Credenciais encontradas nas variáveis de ambiente${NC}\n"
    
    # Executar com autenticação
    python3 "$SCRIPT_DIR/stress_test.py" \
        --base-url "$BASE_URL" \
        --users "$USERS" \
        --duration "$DURATION" \
        --ramp-up "$RAMP_UP" \
        --auth-email "$AUTH_EMAIL" \
        --auth-password "$AUTH_PASSWORD" \
        --tenant-id "${TENANT_ID:-00000000-0000-0000-0000-000000000001}" \
        "$@"
fi

echo -e "\n${GREEN}✅ Teste concluído!${NC}"
