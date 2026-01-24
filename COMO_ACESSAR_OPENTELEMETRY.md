# 🔍 Como Acessar e Visualizar OpenTelemetry

Este guia mostra as diferentes formas de acessar e visualizar os dados coletados pelo OpenTelemetry.

## 📋 Opções Disponíveis

### 1. 🖥️ Console (Mais Simples - Para Debug)

A forma mais simples é usar o exporter `console` que mostra os dados no terminal/logs.

#### Backend

Configure no `.env` ou `docker-compose.yml`:

```bash
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console
```

**Acessar:** Os dados aparecerão nos logs do container:

```bash
docker logs -f credgestor_api
```

#### Frontend

Configure no `.env`:

```bash
VITE_OTEL_ENABLED=true
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=console
```

**Acessar:** Abra o Console do navegador (F12 → Console)

---

### 2. 🌐 Jaeger UI (Recomendado para Traces)

Jaeger é uma interface web para visualizar traces (rastreamento distribuído).

#### Passo 1: Iniciar Jaeger

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14250:14250 \
  --network network_public \
  jaegertracing/all-in-one:latest
```

#### Passo 2: Configurar Coletor OpenTelemetry

Crie `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger, logging]
```

#### Passo 3: Iniciar Coletor

```bash
docker run -d --name otel-collector \
  -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otel-collector-config.yaml \
  --network network_public \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector-config.yaml
```

#### Passo 4: Configurar Backend e Frontend

**Backend** (`.env` ou `docker-compose.yml`):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_TRACES_EXPORTER=otlp
```

**Frontend** (`.env`):

```bash
VITE_OTEL_ENABLED=true
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### Passo 5: Acessar Jaeger

Abra no navegador: **http://localhost:16686**

**O que você verá:**
- Lista de serviços (credgestor-api, credgestor-frontend)
- Traces de requisições HTTP
- Tempo de execução de cada operação
- Erros e exceções
- Correlação entre frontend e backend

---

### 3. 📊 Grafana (Completo - Traces + Métricas)

Grafana permite visualizar traces e métricas em dashboards.

#### Passo 1: Configurar Coletor com Prometheus

Atualize `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, logging]
```

#### Passo 2: Iniciar Serviços

```bash
# Jaeger
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14250:14250 \
  --network network_public \
  jaegertracing/all-in-one:latest

# Coletor
docker run -d --name otel-collector \
  -p 4318:4318 \
  -p 8889:8889 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otel-collector-config.yaml \
  --network network_public \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector-config.yaml
```

#### Passo 3: Configurar Grafana

1. **Adicionar Data Source - Jaeger:**
   - Vá em Configuration → Data Sources → Add data source
   - Selecione **Jaeger**
   - URL: `http://jaeger:16686`
   - Save & Test

2. **Adicionar Data Source - Prometheus:**
   - Vá em Configuration → Data Sources → Add data source
   - Selecione **Prometheus**
   - URL: `http://otel-collector:8889`
   - Save & Test

3. **Importar Dashboards:**
   - Vá em Dashboards → Import
   - Importe os seguintes dashboards:
     - [OpenTelemetry Collector](https://grafana.com/grafana/dashboards/14459)
     - [OpenTelemetry Service](https://grafana.com/grafana/dashboards/14460)

#### Passo 4: Acessar Grafana

Abra no navegador: **http://localhost:3000** (ou sua URL do Grafana)

---

### 4. ☁️ Serviços Gerenciados (Produção)

Para produção, você pode usar serviços gerenciados:

#### Grafana Cloud

1. Crie conta em: https://grafana.com/auth/sign-up/create-user
2. Obtenha o endpoint OTLP: `https://otlp-gateway-prod-us-central-0.grafana.net`
3. Configure no backend/frontend:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <seu-token>
```

#### Honeycomb

1. Crie conta em: https://www.honeycomb.io/
2. Obtenha API key
3. Configure:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<sua-api-key>
```

---

## 🚀 Setup Rápido (Local)

Para começar rapidamente com Jaeger:

```bash
# 1. Iniciar Jaeger
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14250:14250 \
  --network network_public \
  jaegertracing/all-in-one:latest

# 2. Configurar backend para usar console (temporário)
# No docker-compose.yml ou .env:
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console

# 3. Reiniciar backend
docker-compose restart api

# 4. Ver logs
docker logs -f credgestor_api | grep -i "trace\|span"
```

---

## 🔍 Verificando se está Funcionando

### Backend

```bash
# Ver logs do backend
docker logs credgestor_api | grep -i opentelemetry

# Deve mostrar:
# ✅ OpenTelemetry Traces configurado
# ✅ FastAPI instrumentado com OpenTelemetry
```

### Frontend

1. Abra o navegador (F12 → Console)
2. Deve ver: `✅ OpenTelemetry configurado no frontend`
3. Faça algumas requisições na aplicação
4. Verifique se aparecem spans no console

### Jaeger

1. Acesse: http://localhost:16686
2. Selecione o serviço: `credgestor-api` ou `credgestor-frontend`
3. Clique em "Find Traces"
4. Deve aparecer traces das requisições

---

## 📝 Exemplo de Uso

### Ver Traces de uma Requisição Específica

1. Acesse Jaeger: http://localhost:16686
2. Selecione o serviço: `credgestor-api`
3. Filtre por:
   - **Operation**: `GET /tenants/{tenant_id}/clients`
   - **Tags**: `http.method=GET`
4. Clique em uma trace para ver detalhes:
   - Tempo total
   - Spans individuais
   - Erros (se houver)
   - Correlação com frontend

### Ver Métricas no Grafana

1. Acesse Grafana
2. Vá em Explore
3. Selecione Prometheus como data source
4. Digite queries como:
   ```
   http_server_request_duration_seconds
   http_server_request_count
   ```

---

## 🐛 Troubleshooting

### Não aparecem traces no Jaeger

1. **Verificar se o coletor está rodando:**
   ```bash
   docker ps | grep otel-collector
   ```

2. **Verificar logs do coletor:**
   ```bash
   docker logs otel-collector
   ```

3. **Verificar se o endpoint está correto:**
   ```bash
   # Backend
   docker exec credgestor_api env | grep OTEL
   
   # Deve mostrar:
   # OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
   ```

### Traces aparecem mas sem detalhes

- Verifique se o coletor está configurado para exportar para Jaeger
- Verifique se o Jaeger está acessível na rede Docker

### Frontend não envia traces

1. Verifique o console do navegador (F12)
2. Verifique se `VITE_OTEL_ENABLED=true`
3. Verifique se o endpoint está acessível (pode ser problema de CORS)

---

## 📚 Recursos

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Grafana OpenTelemetry](https://grafana.com/docs/grafana/latest/datasources/jaeger/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)

---

## ✅ Checklist

- [ ] Jaeger iniciado e acessível em http://localhost:16686
- [ ] Coletor OpenTelemetry configurado e rodando
- [ ] Backend configurado com `OTEL_EXPORTER_OTLP_ENDPOINT`
- [ ] Frontend configurado com `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`
- [ ] Traces aparecendo no Jaeger
- [ ] (Opcional) Grafana configurado com Jaeger e Prometheus
