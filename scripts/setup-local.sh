#!/bin/bash
# CredGestor - Local Development Setup Script
# Este script configura o ambiente de desenvolvimento local

set -e  # Exit on error

echo "🚀 CredGestor - Local Development Setup"
echo "========================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar pré-requisitos
echo "📋 Verificando pré-requisitos..."

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 não encontrado. Instale Python 3.8+${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 18+${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️  Docker não encontrado. Algumas funcionalidades podem não funcionar.${NC}"
fi

if ! command_exists docker-compose; then
    echo -e "${YELLOW}⚠️  Docker Compose não encontrado. Algumas funcionalidades podem não funcionar.${NC}"
fi

echo -e "${GREEN}✅ Pré-requisitos verificados${NC}"
echo ""

# 1. Criar arquivo .env se não existir
echo "📝 Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Arquivo .env criado a partir de .env.example${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais reais${NC}"
    else
        echo -e "${RED}❌ Arquivo .env.example não encontrado${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Arquivo .env já existe${NC}"
fi
echo ""

# 2. Instalar dependências Python
echo "🐍 Instalando dependências Python..."
if [ -f backend/requirements.txt ]; then
    python3 -m pip install --upgrade pip
    pip install -r backend/requirements.txt
    echo -e "${GREEN}✅ Dependências Python instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  backend/requirements.txt não encontrado${NC}"
fi
echo ""

# 3. Instalar dependências Node.js
echo "📦 Instalando dependências Node.js..."
if [ -f package.json ]; then
    npm install
    echo -e "${GREEN}✅ Dependências Node.js instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  package.json não encontrado${NC}"
fi
echo ""

# 4. Iniciar banco de dados (se Docker estiver disponível)
if command_exists docker-compose; then
    echo "🗄️  Iniciando banco de dados..."
    docker-compose up -d postgres 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível iniciar o banco via Docker${NC}"
    echo "Aguardando banco de dados ficar pronto..."
    sleep 5
    echo -e "${GREEN}✅ Banco de dados iniciado${NC}"
    echo ""
fi

# 5. Criar tabelas (se DATABASE_URL estiver configurada)
if [ -f .env ] && grep -q "DATABASE_URL" .env; then
    echo "📊 Criando tabelas do banco de dados..."
    export $(grep -v '^#' .env | xargs)
    python3 -m backend.legacy.create_tables 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível criar tabelas. Verifique DATABASE_URL no .env${NC}"
    echo ""
fi

# 6. Executar testes
echo "🧪 Executando testes..."
if [ -f backend/legacy/test_sistema.py ]; then
    python3 -m backend.legacy.test_sistema || echo -e "${YELLOW}⚠️  Alguns testes falharam${NC}"
else
    echo -e "${YELLOW}⚠️  Testes não encontrados${NC}"
fi
echo ""

# 7. Resumo
echo "========================================"
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Edite o arquivo .env com suas credenciais:"
echo "   nano .env"
echo ""
echo "2. Inicie o backend:"
echo "   python3 -m uvicorn backend.main:app --reload"
echo ""
echo "3. Em outro terminal, inicie o frontend:"
echo "   npm run dev"
echo ""
echo "4. Acesse:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "5. Para parar o banco de dados:"
echo "   docker-compose down"
echo ""
