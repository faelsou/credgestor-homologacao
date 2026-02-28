# 📊 Dashboard Grafana - Teste de Stress Integrado

O dashboard do Grafana foi expandido para incluir painéis específicos para monitoramento de testes de stress e carga.

## 🎯 Painéis Adicionados

### 1. **Requisições em Progresso**
- **ID**: 20
- **Métrica**: `http_requests_inprogress`
- **Descrição**: Mostra quantas requisições estão sendo processadas simultaneamente durante o teste
- **Uso**: Indica a carga atual no sistema

### 2. **Taxa de Sucesso**
- **ID**: 21
- **Métrica**: `(sucessos / total) * 100`
- **Descrição**: Percentual de requisições bem-sucedidas (status 2xx)
- **Uso**: Monitora a qualidade das respostas durante o teste
- **Thresholds**: 
  - 🟢 Verde: > 95%
  - 🟡 Amarelo: 90-95%
  - 🔴 Vermelho: < 90%

### 3. **Latência Durante o Teste**
- **ID**: 22
- **Métricas**: p50, p95, p99
- **Descrição**: Latência em tempo real durante o teste (janela de 1 minuto)
- **Uso**: Identifica degradação de performance sob carga
- **Thresholds**:
  - 🟢 Verde: < 200ms
  - 🟡 Amarelo: 200-500ms
  - 🔴 Vermelho: > 500ms

### 4. **Taxa de Requisições (Sucesso vs Erro)**
- **ID**: 23
- **Métricas**: Requisições bem-sucedidas vs erros por endpoint
- **Descrição**: Comparação visual entre sucessos e erros
- **Uso**: Identifica quais endpoints estão falhando mais

### 5. **Requisições Simultâneas**
- **ID**: 24
- **Métrica**: `sum(http_requests_inprogress)`
- **Descrição**: Total de requisições simultâneas (indicador de carga)
- **Uso**: Mostra quando um teste está ativo
- **Thresholds**:
  - 🟢 Verde: < 10
  - 🟡 Amarelo: 10-50
  - 🟠 Laranja: 50-100
  - 🔴 Vermelho: > 100

### 6. **Taxa de Erros**
- **ID**: 25
- **Métrica**: `rate(http_requests_total{status=~"[45].."})`
- **Descrição**: Requisições por segundo com erro (4xx, 5xx)
- **Uso**: Monitora a taxa de falhas durante o teste

### 7. **Requisições por Segundo (RPS)**
- **ID**: 26
- **Métrica**: `rate(http_requests_total)`
- **Descrição**: Total de requisições por segundo
- **Uso**: Mede a intensidade do teste

### 8. **Latência P95**
- **ID**: 27
- **Métrica**: `histogram_quantile(0.95, ...)`
- **Descrição**: Percentil 95 da latência em tempo real
- **Uso**: Indicador rápido de performance
- **Thresholds**:
  - 🟢 Verde: < 200ms
  - 🟡 Amarelo: 200-500ms
  - 🔴 Vermelho: > 500ms

## 📥 Como Importar o Dashboard

### Opção 1: Via Interface do Grafana

1. Acesse o Grafana: `http://seu-grafana:3000`
2. Vá em **Dashboards** → **Import**
3. Clique em **Upload JSON file**
4. Selecione o arquivo: `grafana-dashboard-credgestor.json`
5. Configure os Data Sources:
   - `DS_PROMETHEUS`: Seu data source Prometheus
   - `DS_POSTGRES`: Seu data source PostgreSQL
6. Clique em **Import**

### Opção 2: Via API do Grafana

```bash
# Obter token de API do Grafana
GRAFANA_URL="http://seu-grafana:3000"
GRAFANA_TOKEN="seu-token-api"

# Importar dashboard
curl -X POST \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d @grafana-dashboard-credgestor.json \
  "$GRAFANA_URL/api/dashboards/db"
```

### Opção 3: Via Docker/Container

```bash
# Copiar para o volume do Grafana
docker cp grafana-dashboard-credgestor.json \
  grafana-container:/var/lib/grafana/dashboards/

# Ou montar como volume
docker run -v $(pwd)/grafana-dashboard-credgestor.json:/etc/grafana/provisioning/dashboards/dashboard.json \
  grafana/grafana
```

## 🔧 Configuração dos Data Sources

### Prometheus

O dashboard espera um data source Prometheus com as seguintes métricas:

- `http_requests_total` - Total de requisições HTTP
- `http_request_duration_seconds_bucket` - Histograma de latência
- `http_requests_inprogress` - Requisições em progresso

**Labels esperados:**
- `job`: deve corresponder ao padrão `credgestor.*` ou `.*api.*`
- `method`: método HTTP (GET, POST, etc.)
- `endpoint`: endpoint da API
- `status`: código de status HTTP

### PostgreSQL

O dashboard usa queries SQL diretas no Supabase. Configure o data source PostgreSQL com:

- **Host**: Host do Supabase
- **Database**: Nome do banco
- **User**: Usuário do banco
- **Password**: Senha do banco
- **SSL Mode**: Require (para Supabase)

## 🚀 Como Usar Durante um Teste de Stress

### 1. Preparação

1. Abra o dashboard no Grafana
2. Ajuste o intervalo de tempo para `Last 1 hour` ou `Last 6 hours`
3. Configure o refresh automático para `10s` (já configurado)

### 2. Durante o Teste

1. Execute o teste de stress:
   ```bash
   python scripts/stress_test.py \
     --base-url http://localhost:8000 \
     --users 50 \
     --duration 300 \
     --auth-email admin@cliente-alpha.com \
     --auth-password senhaFort3! \
     --tenant-id 00000000-0000-0000-0000-000000000001
   ```

2. Observe os painéis em tempo real:
   - **Requisições Simultâneas** deve aumentar
   - **RPS** deve mostrar a taxa de requisições
   - **Latência** pode aumentar durante o teste
   - **Taxa de Sucesso** deve permanecer alta (> 95%)

### 3. Análise Pós-Teste

1. Ajuste o intervalo de tempo para cobrir o período do teste
2. Analise os gráficos:
   - Identifique picos de latência
   - Verifique se houve degradação de performance
   - Analise quais endpoints foram mais afetados
   - Verifique se a taxa de sucesso se manteve alta

## 📈 Interpretação dos Resultados

### Requisições Simultâneas
- **< 10**: Carga baixa
- **10-50**: Carga moderada
- **50-100**: Carga alta
- **> 100**: Carga muito alta (pode indicar problemas)

### Taxa de Sucesso
- **> 99%**: Excelente
- **95-99%**: Bom
- **90-95%**: Aceitável (investigar)
- **< 90%**: Problemas críticos

### Latência P95
- **< 200ms**: Excelente
- **200-500ms**: Bom
- **500-1000ms**: Aceitável
- **> 1000ms**: Necessita otimização

### RPS
- Compare com a capacidade esperada do servidor
- Se RPS muito baixo, verificar gargalos
- Se RPS muito alto, verificar se está sobrecarregando

## 🔍 Troubleshooting

### Painéis não mostram dados

1. **Verificar Data Sources**:
   - Confirme que os data sources estão configurados
   - Teste as queries no Prometheus/PostgreSQL

2. **Verificar Labels**:
   - As métricas do Prometheus devem ter os labels corretos
   - Ajuste as queries se necessário (job, endpoint, etc.)

3. **Verificar Intervalo de Tempo**:
   - Certifique-se de que o intervalo cobre o período do teste
   - Use `Last 1 hour` ou `Last 6 hours`

### Métricas não aparecem

1. **Verificar se Prometheus está coletando**:
   ```bash
   curl http://prometheus:9090/api/v1/query?query=http_requests_total
   ```

2. **Verificar se a API está instrumentada**:
   - Confirme que `prometheus-fastapi-instrumentator` está instalado
   - Verifique se o endpoint `/metrics` está funcionando

3. **Verificar labels das métricas**:
   ```bash
   curl http://api:8000/metrics | grep http_requests_total
   ```

## 📝 Notas Importantes

1. **Refresh Rate**: O dashboard está configurado para atualizar a cada 10 segundos durante testes
2. **Janelas de Tempo**: As queries usam janelas de 1 minuto para testes e 5 minutos para monitoramento normal
3. **Labels**: Ajuste os padrões de `job` nas queries se necessário
4. **Performance**: Durante testes intensos, pode haver atraso na coleta de métricas

## 🔗 Integração com Script de Teste

O script `stress_test.py` gera métricas que são automaticamente coletadas pelo Prometheus. Para melhor visualização:

1. Execute o teste de stress
2. Monitore o dashboard em tempo real
3. Compare os resultados do script com as métricas do Grafana
4. Use as anotações do Grafana para marcar início/fim dos testes

## 📚 Referências

- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboard JSON](https://grafana.com/docs/grafana/latest/dashboards/json-model/)
- [FastAPI Prometheus Instrumentation](https://github.com/trallnag/prometheus-fastapi-instrumentator)

---

**Última atualização**: 2026-01-10
