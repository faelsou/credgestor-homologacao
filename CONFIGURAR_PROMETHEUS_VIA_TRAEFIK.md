# 🔧 Configurar Prometheus para Coletar Métricas via Traefik

## ✅ Status Atual

As métricas estão funcionando e acessíveis via:
- **HTTPS**: `https://credgestor.app.br/api/metrics`
- **HTTP direto**: `http://167.235.76.26:8000/metrics`

## 📋 Labels das Métricas

As métricas expostas usam os seguintes labels:
- `handler` - Caminho do endpoint (ex: `/tenants/{tenant_id}/{resource}`)
- `method` - Método HTTP (GET, POST, PUT, etc.)
- `status` - Código de status HTTP (200, 404, 500, etc.)

**Métricas disponíveis:**
- `http_requests_total` - Contador de requisições
- `http_request_duration_seconds` - Histograma de latência
- `http_requests_inprogress` - Requisições em progresso

## 🔧 Configuração do Prometheus

### Opção 1: Coletar via Traefik (HTTPS) - Recomendado

Se o Prometheus está em uma rede diferente ou precisa acessar via HTTPS:

```yaml
scrape_configs:
  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    scheme: https
    tls_config:
      insecure_skip_verify: true  # Se usar certificado auto-assinado
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['credgestor.app.br:443']
        labels:
          service: 'credgestor-api'
          environment: 'production'
```

### Opção 2: Coletar diretamente (HTTP) - Se na mesma rede

Se o Prometheus está na mesma rede Docker e pode acessar diretamente:

```yaml
scrape_configs:
  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['167.235.76.26:8000']
        labels:
          service: 'credgestor-api'
          environment: 'production'
```

### Opção 3: Coletar via nome do serviço Docker

Se o Prometheus está na mesma rede Docker Swarm:

```yaml
scrape_configs:
  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['credgestor_api:8000']  # Nome do serviço Docker
        labels:
          service: 'credgestor-api'
          environment: 'production'
```

## 🔍 Verificar Configuração

### 1. Verificar se o target está UP

Acesse o Prometheus: `http://localhost:9090/targets` (ou sua URL)

O target `credgestor-api` deve estar:
- ✅ **UP** (verde) - Coletando métricas
- ❌ **DOWN** (vermelho) - Verifique conectividade

### 2. Testar queries no Prometheus

No Prometheus UI (`http://localhost:9090/graph`), teste:

```promql
# Verificar se as métricas estão sendo coletadas
http_requests_total

# Taxa de requisições por segundo
sum(rate(http_requests_total[5m])) by (method, handler)

# Latência p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)) * 1000

# Erros 5xx
sum(rate(http_requests_total{status=~"5.."}[5m])) by (status, handler)
```

### 3. Verificar no Grafana

Após configurar o Prometheus:

1. **Configure o data source Prometheus** no Grafana
2. **Importe o dashboard**: `grafana-dashboard-sre-completo.json`
3. **Aguarde alguns minutos** para as métricas começarem a aparecer

## 🛠️ Troubleshooting

### Target está DOWN

1. **Verificar conectividade**:
   ```bash
   # Do container do Prometheus
   curl https://credgestor.app.br/api/metrics
   # OU
   curl http://167.235.76.26:8000/metrics
   ```

2. **Verificar logs do Prometheus**:
   ```bash
   docker service logs observability_prometheus | grep credgestor
   ```

3. **Verificar configuração**:
   ```bash
   # Verificar se o job está no prometheus.yml
   grep -A 10 "credgestor-api" /var/www/findfruit/observability/prometheus/prometheus.yml
   ```

### Métricas não aparecem no Grafana

1. **Verificar se o Prometheus está coletando**:
   - Acesse: `http://prometheus:9090/targets`
   - Verifique se `credgestor-api` está UP

2. **Testar queries no Grafana Explore**:
   - Vá em **Explore** → Selecione **Prometheus**
   - Execute: `http_requests_total`

3. **Verificar time range**:
   - Certifique-se de que o time range inclui o período de coleta

### Labels diferentes

Se as métricas usam labels diferentes, ajuste as queries no dashboard:

- **Atual**: `handler`, `method`, `status`
- **Se diferente**: Edite as queries no dashboard para usar os labels corretos

## 📝 Exemplo de Configuração Completa

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # ... outros jobs existentes ...
  
  # Job para coletar métricas da API CredGestor
  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    scheme: https
    tls_config:
      insecure_skip_verify: true
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['credgestor.app.br:443']
        labels:
          service: 'credgestor-api'
          environment: 'production'
```

## 🎯 Próximos Passos

1. ✅ Adicionar job ao `prometheus.yml`
2. ✅ Recarregar configuração do Prometheus
3. ✅ Verificar targets no Prometheus
4. ✅ Testar queries
5. ✅ Importar dashboard no Grafana
6. ✅ Verificar se os dados aparecem

## 📚 Referências

- Dashboard atualizado: `grafana-dashboard-sre-completo.json`
- Labels corretos: `handler`, `method`, `status`
- Endpoint de métricas: `https://credgestor.app.br/api/metrics`
