# 🚀 Guia Rápido - Teste de Stress

## Instalação Rápida

```bash
# Instalar dependências
pip install httpx rich
```

## Uso Rápido

### 1. Teste Básico (sem autenticação)

```bash
python scripts/stress_test.py --base-url http://localhost:8000
```

### 2. Teste com Autenticação

```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

### 3. Usando Script Shell (Recomendado)

```bash
# Configurar variáveis de ambiente
export BASE_URL="http://localhost:8000"
export AUTH_EMAIL="admin@cliente-alpha.com"
export AUTH_PASSWORD="senhaFort3!"
export TENANT_ID="00000000-0000-0000-0000-000000000001"

# Executar teste
./scripts/run_stress_test.sh --users 50 --duration 120
```

## Exemplos Prontos

### Teste Leve
```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --users 10 \
  --duration 60 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

### Teste Médio
```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --users 50 \
  --duration 120 \
  --ramp-up 10 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

### Teste Pesado
```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --users 100 \
  --duration 300 \
  --ramp-up 30 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001 \
  --output stress_test_results.json
```

## O que o Script Faz

✅ Cria múltiplos usuários simultâneos  
✅ Faz requisições HTTP concorrentes  
✅ Coleta métricas de performance  
✅ Gera relatórios detalhados  
✅ Mostra estatísticas em tempo real  

## Métricas Coletadas

- 📊 Total de requisições
- ⚡ Requisições por segundo (RPS)
- ✅ Taxa de sucesso
- ⏱️ Tempo de resposta (média, P50, P95, P99)
- ❌ Erros por status HTTP
- 📈 Estatísticas por endpoint

## Ver Documentação Completa

Para mais detalhes, consulte: `scripts/STRESS_TEST_README.md`
