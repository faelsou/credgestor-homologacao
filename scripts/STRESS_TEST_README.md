# 🚀 Script de Teste de Stress - CredGestor

Script completo para realizar testes de carga e stress na API CredGestor, validando performance, estabilidade e capacidade de resposta sob diferentes condições.

## 📋 Requisitos

### Dependências Python

```bash
pip install httpx rich
```

Ou adicione ao `requirements.txt`:

```
httpx>=0.24.0
rich>=13.0.0
```

## 🎯 Funcionalidades

- ✅ Teste de carga com múltiplos usuários simultâneos
- ✅ Ramp-up gradual de carga
- ✅ Autenticação automática (opcional)
- ✅ Teste de múltiplos endpoints
- ✅ Estatísticas detalhadas de performance
- ✅ Relatórios visuais e em texto
- ✅ Exportação de resultados em JSON
- ✅ Métricas de latência (média, P50, P95, P99)
- ✅ Taxa de requisições por segundo
- ✅ Análise de erros por status HTTP e endpoint

## 📖 Uso

### Uso Básico

```bash
# Teste simples com 10 usuários por 60 segundos
python scripts/stress_test.py --base-url http://localhost:8000
```

### Com Autenticação

```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

### Teste Intensivo

```bash
# 100 usuários simultâneos por 5 minutos com ramp-up de 30 segundos
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --users 100 \
  --duration 300 \
  --ramp-up 30 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

### Teste em Produção/Homologação

```bash
# Teste na VPS de homologação
python scripts/stress_test.py \
  --base-url http://167.235.76.26:8000 \
  --users 50 \
  --duration 120 \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001 \
  --output stress_test_results.json
```

### Teste com Endpoints Customizados

```bash
python scripts/stress_test.py \
  --base-url http://localhost:8000 \
  --endpoints /health /tenants/{tenant_id}/clients /tenants/{tenant_id}/loans \
  --auth-email admin@cliente-alpha.com \
  --auth-password senhaFort3! \
  --tenant-id 00000000-0000-0000-0000-000000000001
```

## ⚙️ Parâmetros

| Parâmetro | Descrição | Padrão | Obrigatório |
|-----------|-----------|--------|-------------|
| `--base-url` | URL base da API | - | ✅ Sim |
| `--users` | Número de usuários simultâneos | 10 | ❌ Não |
| `--duration` | Duração do teste em segundos | 60 | ❌ Não |
| `--ramp-up` | Tempo de ramp-up em segundos | 5 | ❌ Não |
| `--auth-email` | Email para autenticação | - | ❌ Não |
| `--auth-password` | Senha para autenticação | - | ❌ Não |
| `--tenant-id` | ID do tenant | - | ❌ Não |
| `--endpoints` | Lista de endpoints customizados | Endpoints padrão | ❌ Não |
| `--output` | Arquivo para salvar relatório JSON | - | ❌ Não |

## 📊 Endpoints Padrão Testados

Se não especificar `--endpoints`, o script testa:

- `/health` - Health check
- `/tenants/{tenant_id}/clients` - Listar clientes
- `/tenants/{tenant_id}/loans` - Listar empréstimos
- `/tenants/{tenant_id}/installments` - Listar parcelas

## 📈 Métricas Coletadas

### Estatísticas Gerais
- Duração total do teste
- Total de requisições
- Requisições por segundo (RPS)
- Taxa de sucesso (%)
- Número de sucessos e falhas

### Tempo de Resposta
- Média
- Mínimo
- Máximo
- P50 (Mediana)
- P95
- P99

### Análise de Erros
- Erros por status HTTP (400, 401, 403, 500, etc.)
- Erros por endpoint
- Taxa de sucesso por endpoint

## 📄 Exemplo de Relatório

```
╔══════════════════════════════════════════════════════════════╗
║           RELATÓRIO DE TESTE DE STRESS - CREDGESTOR          ║
╚══════════════════════════════════════════════════════════════╝

📊 ESTATÍSTICAS GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Duração Total:        60.00s
  Total de Requisições: 1250
  Requisições/Segundo:  20.83 req/s
  Taxa de Sucesso:      98.40%
  Sucessos:             1230
  Falhas:               20

⏱️  TEMPO DE RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Média:                45.23ms
  Mínimo:               12.34ms
  Máximo:               234.56ms
  P50 (Mediana):        42.10ms
  P95:                  89.45ms
  P99:                  156.78ms
```

## 🔍 Interpretando Resultados

### Taxa de Sucesso
- **> 99%**: Excelente
- **95-99%**: Bom
- **90-95%**: Aceitável (investigar erros)
- **< 90%**: Problemas críticos

### Tempo de Resposta
- **P95 < 200ms**: Excelente para APIs REST
- **P95 < 500ms**: Bom
- **P95 < 1000ms**: Aceitável
- **P95 > 1000ms**: Necessita otimização

### Requisições por Segundo
- Depende da capacidade do servidor
- Compare com métricas do Prometheus/Grafana
- Se RPS muito baixo, verificar gargalos

## 🚨 Troubleshooting

### Erro: "Dependência faltando"
```bash
pip install httpx rich
```

### Erro: "Connection refused"
- Verifique se a API está rodando
- Verifique a URL base (inclua porta se necessário)
- Verifique firewall/rede

### Erro: "Timeout"
- Aumente o timeout no código (padrão: 30s)
- Verifique se o servidor está sobrecarregado
- Reduza número de usuários simultâneos

### Autenticação falha
- Verifique credenciais
- Verifique se o tenant_id está correto
- Verifique se o usuário existe no Supabase

### Poucas requisições
- Aumente `--duration`
- Aumente `--users`
- Reduza delay entre requisições (edite código)

## 📝 Exemplo de Script de Automação

Crie um arquivo `run_stress_tests.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
EMAIL="admin@cliente-alpha.com"
PASSWORD="senhaFort3!"
TENANT_ID="00000000-0000-0000-0000-000000000001"

echo "🧪 Executando teste de stress leve (10 usuários, 60s)..."
python scripts/stress_test.py \
  --base-url "$BASE_URL" \
  --users 10 \
  --duration 60 \
  --auth-email "$EMAIL" \
  --auth-password "$PASSWORD" \
  --tenant-id "$TENANT_ID" \
  --output stress_test_light.json

echo ""
echo "🧪 Executando teste de stress médio (50 usuários, 120s)..."
python scripts/stress_test.py \
  --base-url "$BASE_URL" \
  --users 50 \
  --duration 120 \
  --ramp-up 10 \
  --auth-email "$EMAIL" \
  --auth-password "$PASSWORD" \
  --tenant-id "$TENANT_ID" \
  --output stress_test_medium.json

echo ""
echo "🧪 Executando teste de stress pesado (100 usuários, 300s)..."
python scripts/stress_test.py \
  --base-url "$BASE_URL" \
  --users 100 \
  --duration 300 \
  --ramp-up 30 \
  --auth-email "$EMAIL" \
  --auth-password "$PASSWORD" \
  --tenant-id "$TENANT_ID" \
  --output stress_test_heavy.json

echo ""
echo "✅ Todos os testes concluídos!"
```

Torne executável:
```bash
chmod +x run_stress_tests.sh
```

## 🔗 Integração com Prometheus/Grafana

Os resultados do teste de stress podem ser comparados com as métricas coletadas pelo Prometheus:

- `http_requests_total` - Total de requisições
- `http_request_duration_seconds` - Duração das requisições
- `http_requests_inprogress` - Requisições em progresso

## 📚 Referências

- [httpx Documentation](https://www.python-httpx.org/)
- [Rich Documentation](https://rich.readthedocs.io/)
- [FastAPI Performance](https://fastapi.tiangolo.com/advanced/async-tests/)

---

**Última atualização**: 2026-01-10
