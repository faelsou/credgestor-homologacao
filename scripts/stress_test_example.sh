#!/bin/bash
# Exemplo de uso do script de teste de stress

# Configurações
export BASE_URL="http://localhost:8000"
export AUTH_EMAIL="admin@cliente-alpha.com"
export AUTH_PASSWORD="senhaFort3!"
export TENANT_ID="00000000-0000-0000-0000-000000000001"

# Teste leve: 10 usuários, 60 segundos
echo "🧪 Teste Leve (10 usuários, 60s)..."
export USERS=10
export DURATION=60
export RAMP_UP=5
./scripts/run_stress_test.sh --output stress_test_light.json

# Teste médio: 50 usuários, 120 segundos
echo ""
echo "🧪 Teste Médio (50 usuários, 120s)..."
export USERS=50
export DURATION=120
export RAMP_UP=10
./scripts/run_stress_test.sh --output stress_test_medium.json

# Teste pesado: 100 usuários, 300 segundos
echo ""
echo "🧪 Teste Pesado (100 usuários, 300s)..."
export USERS=100
export DURATION=300
export RAMP_UP=30
./scripts/run_stress_test.sh --output stress_test_heavy.json

echo ""
echo "✅ Todos os testes concluídos!"
