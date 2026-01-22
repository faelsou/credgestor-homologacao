# 🔍 Diagnóstico: Métricas não estão sendo coletadas

## ✅ Verificações Rápidas

### 1. Verificar se `/metrics` está funcionando

```bash
curl http://167.235.76.26:8000/metrics | grep http_requests_total
```

**Esperado**: Deve mostrar métricas como:
```
http_requests_total{handler="/health",method="GET",status="200"} 1.0
```

### 2. Verificar se o Prometheus está coletando

```bash
# Verificar target
curl -s "http://localhost:9090/api/v1/targets" | grep -A 10 "credgestor-api"

# OU acesse no navegador:
# http://localhost:9090/targets
```

**Esperado**: Target `credgestor-api` deve estar **UP** (verde)

### 3. Verificar se as métricas estão no Prometheus

```bash
# No Prometheus UI (http://localhost:9090/graph), execute:
http_requests_total{job="credgestor-api"}
```

**Esperado**: Deve retornar séries de dados

### 4. Verificar variáveis do Dashboard

No Grafana:
1. Clique em ⚙️ (Settings) no dashboard
2. Vá em **Variables**
3. Verifique:
   - `DS_PROMETHEUS` → Deve estar selecionado "Prometheus"
   - `DS_POSTGRES` → Deve estar selecionado "grafana-postgresql-datasource-supabase-credgestor"

## 🔧 Correções Aplicadas no Dashboard

O arquivo `grafana-dashboard-credgestor-corrigido.json` tem as queries corrigidas:

### Mudanças nas Queries:

1. **Job correto**: `job="credgestor-api"` (não regex)
2. **Labels corretos**: 
   - `handler` em vez de `endpoint`
   - `status` em vez de `status_code`
3. **Métrica de latência**: `http_request_duration_highr_seconds_bucket` (não `http_request_duration_seconds_bucket`)

### Queries Corrigidas:

```promql
# Taxa de Requisições
sum(rate(http_requests_total{job="credgestor-api"}[5m])) by (method, handler)

# Latência
histogram_quantile(0.95, sum(rate(http_request_duration_highr_seconds_bucket{job="credgestor-api"}[5m])) by (le)) * 1000

# Erros
sum(rate(http_requests_total{job="credgestor-api", status=~"5.."}[5m])) by (status)

# Status
up{job="credgestor-api"}
```

## 📋 Checklist de Diagnóstico

- [ ] `/metrics` está funcionando (retorna métricas HTTP)
- [ ] Prometheus target está UP
- [ ] Métricas aparecem no Prometheus (`http_requests_total{job="credgestor-api"}`)
- [ ] Variáveis do dashboard estão configuradas
- [ ] Queries usam `job="credgestor-api"` (não regex)
- [ ] Queries usam `handler` e `status` (não `endpoint` e `status_code`)

## 🚀 Solução: Importar Dashboard Corrigido

1. **No Grafana**, vá em **Dashboards** → **Import**
2. **Faça upload** do arquivo: `grafana-dashboard-credgestor-corrigido.json`
3. **Configure as variáveis**:
   - `DS_PROMETHEUS` → Selecione seu data source Prometheus
   - `DS_POSTGRES` → Selecione "grafana-postgresql-datasource-supabase-credgestor"
4. **Clique em Import**

## 🔍 Se ainda não funcionar

### Verificar se o Prometheus está coletando

```bash
# Ver logs do Prometheus
docker service logs observability_prometheus | grep -i credgestor | tail -20

# Testar conectividade do Prometheus para a API
docker exec $(docker ps -q -f name=prometheus) curl -s http://167.235.76.26:8000/metrics | head -5
```

### Verificar configuração do Prometheus

```bash
# Verificar se o job está no arquivo
grep -A 5 "credgestor-api" /var/www/findfruit/observability/prometheus/prometheus.yml

# Verificar se o Prometheus recarregou
docker service logs observability_prometheus | tail -10
```

### Testar queries manualmente

No Grafana Explore:
1. Selecione data source Prometheus
2. Teste estas queries:

```promql
# 1. Verificar se o job está UP
up{job="credgestor-api"}

# 2. Ver métricas HTTP
http_requests_total{job="credgestor-api"}

# 3. Taxa de requisições
sum(rate(http_requests_total{job="credgestor-api"}[5m])) by (method, handler)
```

Se essas queries funcionarem no Explore, o problema está nas variáveis do dashboard ou no time range.
