# ✅ Configuração do Prometheus Concluída

## O que foi feito

1. ✅ **Arquivo encontrado**: `/var/www/findfruit/observability/prometheus/prometheus.yml`
2. ✅ **Backup criado**: `prometheus.yml.backup.[timestamp]`
3. ✅ **Job adicionado**: `credgestor-api` configurado para coletar métricas
4. ✅ **Prometheus atualizado**: Serviço reiniciado para aplicar configuração

## Configuração Adicionada

```yaml
# ===== CREDGESTOR / API FastAPI =====
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

## Verificação

### 1. Verificar se `/metrics` está funcionando

```bash
curl http://167.235.76.26:8000/metrics
```

Você deve ver métricas como:
- `http_requests_total`
- `http_request_duration_seconds`
- `http_requests_inprogress`

### 2. Verificar no Prometheus

1. Acesse: `http://seu-prometheus:9090/targets`
2. Procure por `credgestor-api`
3. Deve estar **UP** (verde)

### 3. Testar Queries no Prometheus

No Prometheus UI (`http://localhost:9090/graph`), teste:

```promql
# Verificar se as métricas estão sendo coletadas
http_requests_total

# Taxa de requisições por segundo
sum(rate(http_requests_total[5m])) by (method, endpoint)

# Latência p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
```

### 4. Verificar no Grafana

Após alguns minutos, os painéis do dashboard devem começar a mostrar dados:
- ✅ Taxa de Requisições (RPS)
- ✅ Latência (p50, p95, p99)
- ✅ Taxa de Erros (4xx, 5xx)
- ✅ Status API

## Troubleshooting

### Target está DOWN

1. **Verificar se a API está acessível**:
   ```bash
   curl http://167.235.76.26:8000/metrics
   ```

2. **Verificar se o endpoint `/metrics` existe**:
   ```bash
   curl http://167.235.76.26:8000/metrics | head -5
   ```

3. **Verificar logs do Prometheus**:
   ```bash
   docker service logs observability_prometheus | grep credgestor
   ```

### Métricas não aparecem

1. **Aguardar alguns minutos**: O Prometheus coleta a cada 15 segundos
2. **Verificar time range no Grafana**: Use "Last 6 hours" ou mais
3. **Testar queries no Explore**: Use o Grafana Explore para testar antes

## Arquivo de Configuração

O arquivo está localizado em:
```
/var/www/findfruit/observability/prometheus/prometheus.yml
```

Para editar no futuro:
```bash
sudo nano /var/www/findfruit/observability/prometheus/prometheus.yml
docker service update --force observability_prometheus
```

## Próximos Passos

1. ✅ Configuração do Prometheus concluída
2. ⏳ Aguardar coleta de métricas (alguns minutos)
3. ✅ Verificar no Grafana se os dados aparecem
4. 📊 Configurar alertas (opcional)
