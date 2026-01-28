#!/bin/bash
# Script de verificação do Dynatrace OneAgent e aplicação CredGestor

echo "🔍 Verificando Dynatrace OneAgent e Aplicação CredGestor"
echo "=================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar OneAgent instalado
echo "1️⃣ Verificando instalação do OneAgent..."
if [ -d "/opt/dynatrace/oneagent" ]; then
    echo -e "${GREEN}✅ OneAgent instalado em /opt/dynatrace/oneagent${NC}"
    ls -ld /opt/dynatrace/oneagent 2>/dev/null | awk '{print "   Localização: " $9}'
else
    echo -e "${RED}❌ OneAgent não encontrado em /opt/dynatrace/oneagent${NC}"
fi
echo ""

# 2. Verificar processos do OneAgent
echo "2️⃣ Verificando processos do OneAgent..."
ONAGENT_PROCESSES=$(ps aux | grep -i "oneagent\|dynatrace" | grep -v grep | wc -l)
if [ "$ONAGENT_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ OneAgent está rodando (${ONAGENT_PROCESSES} processos encontrados)${NC}"
    echo "   Processos ativos:"
    ps aux | grep -i "oneagent\|dynatrace" | grep -v grep | awk '{print "   - " $11 " (PID: " $2 ")"}'
else
    echo -e "${RED}❌ Nenhum processo do OneAgent encontrado${NC}"
fi
echo ""

# 3. Verificar serviço systemd (opcional)
echo "3️⃣ Verificando serviço systemd (opcional)..."
if systemctl list-unit-files | grep -q "dynatrace-oneagent"; then
    echo -e "${GREEN}✅ Serviço systemd encontrado${NC}"
    systemctl status dynatrace-oneagent --no-pager -l | head -5
else
    echo -e "${YELLOW}⚠️  Serviço systemd não encontrado (OneAgent pode estar rodando como processos do usuário)${NC}"
fi
echo ""

# 4. Verificar aplicação Backend (uvicorn)
echo "4️⃣ Verificando aplicação Backend (FastAPI/uvicorn)..."
UVICORN_PROCESS=$(ps aux | grep "uvicorn backend.main:app" | grep -v grep)
if [ -n "$UVICORN_PROCESS" ]; then
    echo -e "${GREEN}✅ Backend (uvicorn) está rodando${NC}"
    echo "$UVICORN_PROCESS" | awk '{print "   PID: " $2 " | Comando: " $11 " " $12 " " $13 " " $14}'
    echo "$UVICORN_PROCESS" | awk '{print "   Porta: 8000 (detectada do comando)"}'
else
    echo -e "${RED}❌ Backend (uvicorn) não encontrado${NC}"
fi
echo ""

# 5. Verificar aplicação Frontend (nginx)
echo "5️⃣ Verificando aplicação Frontend (nginx)..."
NGINX_PROCESSES=$(ps aux | grep "nginx" | grep -v grep | wc -l)
if [ "$NGINX_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ Frontend (nginx) está rodando (${NGINX_PROCESSES} processos encontrados)${NC}"
    echo "   Processos nginx:"
    ps aux | grep "nginx" | grep -v grep | head -3 | awk '{print "   - " $11 " (PID: " $2 ")"}'
else
    echo -e "${RED}❌ Frontend (nginx) não encontrado${NC}"
fi
echo ""

# 6. Verificar processos Python
echo "6️⃣ Verificando processos Python..."
PYTHON_PROCESSES=$(ps aux | grep "python" | grep -v grep | grep -v "oneagent" | wc -l)
if [ "$PYTHON_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ Processos Python encontrados (${PYTHON_PROCESSES} processos)${NC}"
    echo "   Principais processos Python:"
    ps aux | grep "python" | grep -v grep | grep -v "oneagent" | head -3 | awk '{print "   - " $11 " " $12 " (PID: " $2 ")"}'
else
    echo -e "${YELLOW}⚠️  Nenhum processo Python encontrado${NC}"
fi
echo ""

# 7. Resumo e próximos passos
echo "=================================================="
echo "📊 RESUMO"
echo "=================================================="

if [ -d "/opt/dynatrace/oneagent" ] && [ "$ONAGENT_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ OneAgent: INSTALADO E RODANDO${NC}"
else
    echo -e "${RED}❌ OneAgent: NÃO ESTÁ FUNCIONANDO${NC}"
fi

if [ -n "$UVICORN_PROCESS" ]; then
    echo -e "${GREEN}✅ Backend: RODANDO${NC}"
else
    echo -e "${RED}❌ Backend: NÃO ENCONTRADO${NC}"
fi

if [ "$NGINX_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ Frontend: RODANDO${NC}"
else
    echo -e "${RED}❌ Frontend: NÃO ENCONTRADO${NC}"
fi

echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "1. Acesse o Dynatrace: https://app.dynatrace.com"
echo "2. Vá em 'Services' e procure por:"
echo "   - Python ou FastAPI (backend)"
echo "   - Nginx (frontend)"
echo "3. Se os serviços não aparecerem, configure nomes customizados:"
echo "   - Adicione DT_SERVICE_NAME no docker-compose.yml"
echo "   - Ou configure via Settings → Service detection no Dynatrace"
echo ""
echo "📚 Para mais informações, consulte: CONFIGURAR_APLICACAO_DYNATRACE.md"
