# 📊 Adicionar Métricas Prometheus na API FastAPI

Este guia explica como adicionar instrumentação Prometheus na API FastAPI para coletar métricas de requisições, latência e erros.

## ✅ O que foi feito

1. ✅ Adicionada dependência `prometheus-fastapi-instrumentator` no `requirements.txt`
2. ✅ Adicionada instrumentação no `backend/main.py`
3. ✅ Endpoint `/metrics` exposto automaticamente

## 🚀 Próximos Passos

### 1. Rebuild da Imagem Docker

Após adicionar a dependência, você precisa fazer rebuild da imagem:

```bash
# Na VPS ou localmente
cd /var/www/credgestor-homologacao

# Build da nova imagem com a dependência
docker build -f Dockerfile.backend -t faelsouz/credgestor-homologacao-backend:latest .

# OU se estiver usando GitHub Actions, faça commit e push
git add requirements.txt backend/main.py
git commit -m "feat: adiciona instrumentação Prometheus na API"
git push
```

### 2. Verificar se `/metrics` está funcionando

Após o deploy, teste o endpoint:

```bash
# Teste local
curl http://localhost:8000/metrics

# Teste na VPS
curl http://167.235.76.26:8000/metrics

# Ou via navegador
http://167.235.76.26:8000/metrics
```

Você deve ver métricas como:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health",status_code="200"} 10.0

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/health",le="0.005"} 10.0
...
```

### 3. Configurar Prometheus para Coletar Métricas

No seu Prometheus (stack observability), você precisa adicionar um job para coletar métricas da API.

#### Opção A: Via arquivo de configuração do Prometheus

Se você tem acesso ao arquivo `prometheus.yml`:

```yaml
scrape_configs:
  # ... outros jobs existentes ...
  
  - job_name: 'credgestor-api'
    static_configs:
      - targets: ['167.235.76.26:8000']  # Ajuste conforme necessário
    metrics_path: '/metrics'
    scrape_interval: 15s
```

#### Opção B: Via Docker Swarm Labels (se o Prometheus usa service discovery)

Adicione labels no `docker-compose.yml` do CredGestor:

```yaml
services:
  api:
    # ... configuração existente ...
    deploy:
      labels:
        # ... labels existentes do Traefik ...
        - prometheus.io/scrape=true
        - prometheus.io/port=8000
        - prometheus.io/path=/metrics
```

#### Opção C: Via Prometheus Service Discovery

Se o Prometheus está configurado para descobrir serviços automaticamente, ele pode detectar o serviço se estiver na mesma rede Docker.

### 4. Verificar no Prometheus

1. Acesse o Prometheus: `http://seu-prometheus:9090`
2. Vá em **Status** → **Targets**
3. Verifique se o job `credgestor-api` está **UP**
4. Se estiver **DOWN**, verifique:
   - Se a API está acessível na porta 8000
   - Se o endpoint `/metrics` está funcionando
   - Se há problemas de rede/firewall

### 5. Testar Queries no Grafana

Após configurar o Prometheus, teste as queries no Grafana Explore:

```promql
# Verificar se as métricas estão sendo coletadas
http_requests_total

# Taxa de requisições por segundo
sum(rate(http_requests_total[5m])) by (method, endpoint)

# Latência p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))

# Erros 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (status_code)
```

## 📊 Métricas Disponíveis

Após a instrumentação, você terá acesso a:

### Contadores
- `http_requests_total` - Total de requisições HTTP
  - Labels: `method`, `endpoint`, `status_code`

### Histogramas
- `http_request_duration_seconds` - Duração das requisições
  - Labels: `method`, `endpoint`
  - Buckets: 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0

### Gauges
- `http_requests_inprogress` - Requisições em progresso
  - Labels: `method`, `endpoint`

## 🔧 Personalização (Opcional)

Se você quiser personalizar as métricas, edite a configuração do instrumentator em `backend/main.py`:

```python
instrumentator = Instrumentator(
    should_group_status_codes=False,  # Não agrupa códigos de status
    should_ignore_untemplated=True,   # Ignora rotas sem templates
    should_instrument_requests_inprogress=True,  # Instrumenta requisições em progresso
    excluded_handlers=["/metrics", "/health"],  # Exclui endpoints
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
    metric_namespace="credgestor",  # Prefixo para as métricas
    metric_subsystem="api",         # Subsistema
)
```

## 🚨 Troubleshooting

### Endpoint `/metrics` retorna 404

1. Verifique se a dependência foi instalada:
   ```bash
   docker exec -it <container_id> pip list | grep prometheus
   ```

2. Verifique se o código foi atualizado:
   ```bash
   docker exec -it <container_id> cat /app/backend/main.py | grep instrumentator
   ```

3. Reinicie o container:
   ```bash
   docker restart <container_id>
   ```

### Prometheus não está coletando

1. Verifique se o Prometheus consegue acessar a API:
   ```bash
   # Do container do Prometheus
   curl http://167.235.76.26:8000/metrics
   ```

2. Verifique os logs do Prometheus:
   ```bash
   docker logs <prometheus_container> | grep credgestor-api
   ```

3. Verifique a configuração do job no Prometheus

### Métricas não aparecem no Grafana

1. Verifique se o Prometheus está coletando:
   - No Prometheus UI, execute: `http_requests_total`

2. Verifique se o time range está correto no Grafana

3. Verifique se as queries estão corretas:
   - Use o Explore do Grafana para testar queries antes de adicionar ao dashboard

## 📚 Referências

- [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
