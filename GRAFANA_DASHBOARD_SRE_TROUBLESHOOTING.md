# 🔧 Troubleshooting - Dashboard SRE Completo

## 📋 Checklist de Verificação

### 1. ✅ Verificar se o endpoint `/metrics` está funcionando

```bash
# Teste local
curl http://localhost:8000/metrics

# Teste na VPS
curl http://167.235.76.26:8000/metrics
```

**Resultado esperado**: Você deve ver métricas como:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health",status_code="200"} 10.0
```

**Se retornar 404**: A instrumentação Prometheus não está ativa. Verifique:
- Se `prometheus-fastapi-instrumentator` está instalado
- Se o código foi atualizado no `backend/main.py`

### 2. ✅ Verificar se o Prometheus está coletando métricas

1. Acesse o Prometheus: `http://localhost:9090` (ou sua URL)
2. Vá em **Status** → **Targets**
3. Procure por `credgestor-api`
4. Deve estar **UP** (verde)

**Se estiver DOWN**:
- Verifique se o Prometheus consegue acessar a API
- Verifique a configuração do job no `prometheus.yml`
- Verifique logs: `docker logs <prometheus_container>`

### 3. ✅ Verificar Data Sources no Grafana

1. Vá em **Configuration** → **Data Sources**
2. Verifique se existe:
   - **Prometheus** (nome exato ou conforme variável `DS_PROMETHEUS`)
   - **PostgreSQL** (nome exato ou conforme variável `DS_POSTGRES`)
3. Teste cada data source clicando em **Save & Test**

### 4. ✅ Testar Queries no Prometheus

No Prometheus UI (`http://localhost:9090/graph`), teste:

```promql
# Verificar se as métricas estão sendo coletadas
http_requests_total

# Verificar jobs disponíveis
up{job=~"credgestor.*|.*api.*"}

# Taxa de requisições
sum(rate(http_requests_total[5m])) by (method, endpoint)
```

**Se não retornar dados**: O Prometheus não está coletando. Verifique a configuração do job.

### 5. ✅ Ajustar Labels nas Queries (se necessário)

Se o job do Prometheus tem um nome diferente, você precisa ajustar as queries no dashboard.

**Opção 1: Ajustar o job no Prometheus** (recomendado)

No `prometheus.yml`, certifique-se de que o job se chama `credgestor-api`:

```yaml
- job_name: 'credgestor-api'
  static_configs:
    - targets: ['167.235.76.26:8000']
```

**Opção 2: Ajustar as queries no dashboard**

Se o job tem outro nome (ex: `api`, `backend`), edite as queries no dashboard:

1. Clique em **Edit** no painel
2. Na query, altere `job=~"credgestor.*|.*api.*"` para o nome do seu job
3. Exemplo: `job="api"` ou `job=~"backend.*"`

### 6. ✅ Verificar Labels dos Containers (cAdvisor)

Para métricas de CPU/Memória dos containers, verifique os labels:

```bash
# Verificar labels do container
docker inspect <container_id> | grep -A 10 Labels
```

O dashboard procura por: `container_label_com_docker_swarm_service_name=~"credgestor.*"`

**Se usar Docker Compose normal** (não Swarm), ajuste as queries para:
- `container_name=~"credgestor.*"`
- Ou use `name=~"credgestor.*"`

**Para ajustar no dashboard**:
1. Edite o painel de CPU/Memória
2. Altere a query de:
   ```
   container_label_com_docker_swarm_service_name=~"credgestor.*"
   ```
   Para:
   ```
   container_name=~"credgestor.*"
   ```
   Ou:
   ```
   name=~"credgestor.*"
   ```

### 7. ✅ Verificar node_exporter (Métricas do Sistema)

Para métricas de CPU/Memória do sistema, verifique se o `node_exporter` está rodando:

```bash
# Verificar se node_exporter está coletando
curl http://localhost:9100/metrics | grep node_cpu
```

**Se não estiver disponível**: Os painéis de "CPU do Sistema" e "Memória do Sistema" não funcionarão, mas os de containers continuarão funcionando.

### 8. ✅ Verificar PostgreSQL Data Source

Para painéis de negócio (Tenants, Usuários, etc.):

1. Verifique se o data source PostgreSQL está configurado
2. Teste uma query simples:
   ```sql
   SELECT COUNT(*) FROM tenants WHERE ativo = true;
   ```

**Se retornar erro**: Verifique:
- Credenciais do banco
- Permissões do usuário
- Se o banco está acessível do Grafana

## 🔍 Diagnóstico Passo a Passo

### Passo 1: Verificar Métricas da API

```bash
# 1. Verificar se /metrics responde
curl -v http://167.235.76.26:8000/metrics

# 2. Verificar se há métricas
curl http://167.235.76.26:8000/metrics | grep http_requests_total
```

### Passo 2: Verificar Prometheus

```bash
# 1. Verificar targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="credgestor-api")'

# 2. Verificar se está coletando
curl 'http://localhost:9090/api/v1/query?query=up{job="credgestor-api"}' | jq
```

### Passo 3: Verificar Grafana

1. Vá em **Explore** no Grafana
2. Selecione o data source **Prometheus**
3. Execute a query: `up{job="credgestor-api"}`
4. Se retornar dados, o problema está nas queries do dashboard
5. Se não retornar, o problema está no Prometheus ou data source

## 🛠️ Soluções Comuns

### Problema: "No data" em todos os painéis do Prometheus

**Causa**: Data source não configurado ou Prometheus não coletando

**Solução**:
1. Configure o data source Prometheus no Grafana
2. Verifique se o Prometheus está coletando (Status → Targets)
3. Teste queries no Explore

### Problema: "No data" apenas em alguns painéis

**Causa**: Labels diferentes ou métricas não disponíveis

**Solução**:
1. Verifique qual painel está com problema
2. Edite o painel e veja a query
3. Teste a query no Explore do Grafana
4. Ajuste os labels conforme necessário

### Problema: Métricas de containers não aparecem

**Causa**: Labels diferentes ou cAdvisor não configurado

**Solução**:
1. Verifique se o cAdvisor está rodando
2. Verifique os labels dos containers
3. Ajuste as queries no dashboard para usar os labels corretos

### Problema: Métricas de PostgreSQL não aparecem

**Causa**: Data source não configurado ou queries incorretas

**Solução**:
1. Configure o data source PostgreSQL
2. Teste a conexão
3. Verifique se as queries SQL estão corretas
4. Verifique permissões do usuário do banco

## 📊 Queries de Teste

### Teste 1: Verificar se métricas estão sendo coletadas

```promql
# No Prometheus ou Grafana Explore
http_requests_total
```

### Teste 2: Verificar taxa de requisições

```promql
sum(rate(http_requests_total[5m])) by (method, endpoint)
```

### Teste 3: Verificar latência

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)) * 1000
```

### Teste 4: Verificar erros

```promql
sum(rate(http_requests_total{status_code=~"[45].."}[5m])) by (status_code, endpoint)
```

### Teste 5: Verificar containers

```promql
# CPU
100 - (avg(rate(container_cpu_usage_seconds_total[5m])) * 100)

# Memória
100 - ((container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100)
```

## 🎯 Próximos Passos

1. ✅ Verificar endpoint `/metrics`
2. ✅ Verificar Prometheus targets
3. ✅ Configurar data sources no Grafana
4. ✅ Testar queries no Explore
5. ✅ Ajustar labels se necessário
6. ✅ Verificar logs se ainda houver problemas

## 📚 Documentação Relacionada

- `ADICIONAR_METRICAS_API.md` - Como adicionar métricas na API
- `CONFIGURACAO_PROMETHEUS_CONCLUIDA.md` - Configuração do Prometheus
- `GRAFANA_SETUP.md` - Setup do Grafana
- `prometheus-config-credgestor.yml` - Configuração de exemplo
