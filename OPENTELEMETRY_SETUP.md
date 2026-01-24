# 📊 Configuração do OpenTelemetry

Este documento descreve como configurar e usar o OpenTelemetry no projeto CredGestor para observabilidade completa (traces, métricas e logs).

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Configuração do Backend](#configuração-do-backend)
- [Configuração do Frontend](#configuração-do-frontend)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Coletor OpenTelemetry](#coletor-opentelemetry)
- [Visualização de Dados](#visualização-de-dados)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O OpenTelemetry foi implementado para fornecer:

- **Traces (Rastreamento)**: Rastreamento distribuído de requisições entre frontend e backend
- **Métricas**: Métricas customizadas além do Prometheus
- **Logs**: Estruturação e correlação de logs com traces

### Benefícios

- ✅ Rastreamento end-to-end de requisições
- ✅ Correlação entre frontend e backend
- ✅ Métricas de performance detalhadas
- ✅ Debugging mais eficiente com contexto completo
- ✅ Compatível com Prometheus (não substitui, complementa)

## 🏗️ Arquitetura

```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│  Frontend   │────────▶│   Backend   │────────▶│  OTLP Collector  │
│   (React)   │  OTLP   │  (FastAPI)  │  OTLP   │  (OpenTelemetry) │
└─────────────┘         └─────────────┘         └──────────────────┘
                                                         │
                                                         ▼
                                                ┌──────────────────┐
                                                │  Backend Storage  │
                                                │ (Jaeger/Tempo/...)│
                                                └──────────────────┘
```

## 🔧 Configuração do Backend

### Dependências

As dependências já estão adicionadas em `backend/requirements.txt`:

```python
opentelemetry-api>=1.24.0
opentelemetry-sdk>=1.24.0
opentelemetry-instrumentation-fastapi>=0.45b0
opentelemetry-instrumentation-httpx>=0.45b0
opentelemetry-instrumentation-requests>=0.45b0
opentelemetry-exporter-otlp-proto-http>=1.24.0
opentelemetry-instrumentation>=0.45b0
```

### Instrumentação Automática

O FastAPI é automaticamente instrumentado ao iniciar a aplicação. A configuração está em `backend/otel_config.py` e é inicializada em `backend/main.py`.

### Variáveis de Ambiente

Configure as seguintes variáveis no `.env` ou no `docker-compose.yml`:

```bash
# Nome do serviço
OTEL_SERVICE_NAME=credgestor-api

# Versão do serviço
OTEL_SERVICE_VERSION=0.1.0

# Endpoint do coletor OTLP (HTTP)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Headers opcionais (ex: autenticação)
OTEL_EXPORTER_OTLP_HEADERS=api-key=your-key-here

# Exporters (otlp, console, none)
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Atributos customizados do resource
OTEL_RESOURCE_ATTRIBUTES=environment=production,team=backend
```

### Uso Programático

Para criar spans customizados:

```python
from backend.otel_config import get_tracer

tracer = get_tracer()

def minha_funcao():
    with tracer.start_as_current_span("operacao_customizada") as span:
        span.set_attribute("tenant_id", tenant_id)
        span.set_attribute("user_id", user_id)
        # Sua lógica aqui
        return resultado
```

## 🎨 Configuração do Frontend

### Dependências

As dependências já estão adicionadas em `package.json`:

```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-web": "^1.20.0",
  "@opentelemetry/instrumentation-fetch": "^0.52.0",
  "@opentelemetry/instrumentation-xml-http-request": "^0.52.0",
  "@opentelemetry/instrumentation-document-load": "^0.52.0",
  "@opentelemetry/instrumentation-user-interaction": "^0.52.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.52.0"
}
```

### Instrumentação Automática

O frontend é automaticamente instrumentado ao carregar. A configuração está em `src/utils/otel.ts` e é inicializada em `src/index.tsx`.

### Variáveis de Ambiente

Configure as seguintes variáveis no `.env` ou no build:

```bash
# Habilitar OpenTelemetry
VITE_OTEL_ENABLED=true

# Nome do serviço
VITE_OTEL_SERVICE_NAME=credgestor-frontend

# Versão do serviço
VITE_OTEL_SERVICE_VERSION=0.1.0

# Endpoint do coletor OTLP
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Headers opcionais
VITE_OTEL_EXPORTER_OTLP_HEADERS=api-key=your-key-here
```

### Uso Programático

Para criar spans customizados:

```typescript
import { withSpan } from '@/utils/otel';

// Exemplo: rastrear uma operação assíncrona
const resultado = await withSpan(
  'buscar_clientes',
  async () => {
    return await fetchClients(token, tenantId);
  },
  {
    tenant_id: tenantId,
    operation: 'list',
  }
);
```

## 🔐 Variáveis de Ambiente

### Backend (FastAPI)

| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|--------|--------------|
| `OTEL_SERVICE_NAME` | Nome do serviço | `credgestor-api` | Não |
| `OTEL_SERVICE_VERSION` | Versão do serviço | `0.1.0` | Não |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP HTTP | - | Sim (se usar otlp) |
| `OTEL_EXPORTER_OTLP_HEADERS` | Headers HTTP (formato: `key1=value1,key2=value2`) | - | Não |
| `OTEL_TRACES_EXPORTER` | Exporter de traces (`otlp`, `console`, `none`) | `otlp` | Não |
| `OTEL_METRICS_EXPORTER` | Exporter de métricas (`otlp`, `console`, `none`) | `otlp` | Não |
| `OTEL_LOGS_EXPORTER` | Exporter de logs (`otlp`, `console`, `none`) | `otlp` | Não |
| `OTEL_RESOURCE_ATTRIBUTES` | Atributos do resource (formato: `key1=value1,key2=value2`) | - | Não |

### Frontend (React)

| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|--------|--------------|
| `VITE_OTEL_ENABLED` | Habilitar OpenTelemetry | `false` | Não |
| `VITE_OTEL_SERVICE_NAME` | Nome do serviço | `credgestor-frontend` | Não |
| `VITE_OTEL_SERVICE_VERSION` | Versão do serviço | `0.1.0` | Não |
| `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP HTTP | - | Sim (se habilitado) |
| `VITE_OTEL_EXPORTER_OTLP_HEADERS` | Headers HTTP (formato: `key1=value1,key2=value2`) | - | Não |

## 📦 Coletor OpenTelemetry

### Opção 1: Docker Compose (Recomendado para desenvolvimento)

Adicione ao seu `docker-compose.yml`:

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    container_name: otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318"   # OTLP HTTP receiver
      - "4317:4317"   # OTLP gRPC receiver
    networks:
      - network_public
```

### Opção 2: Configuração do Coletor

Crie `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512

exporters:
  # Jaeger (para traces)
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  # Prometheus (para métricas)
  prometheus:
    endpoint: "0.0.0.0:8889"
  
  # Console (para debug)
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, logging]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [logging]
```

### Opção 3: Serviços Gerenciados

Você pode usar serviços gerenciados como:
- **Honeycomb**: `https://api.honeycomb.io`
- **Datadog**: `https://trace-intake.datadoghq.com`
- **New Relic**: `https://otlp.nr-data.net`
- **Grafana Cloud**: `https://otlp-gateway-prod-us-central-0.grafana.net`

## 📊 Visualização de Dados

### Jaeger (Traces)

1. Inicie o Jaeger:
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14250:14250 \
  jaegertracing/all-in-one:latest
```

2. Acesse: `http://localhost:16686`

### Grafana (Traces + Métricas)

1. Configure o Grafana para usar:
   - **Jaeger** como data source para traces
   - **Prometheus** como data source para métricas

2. Importe dashboards do OpenTelemetry:
   - [OpenTelemetry Collector Dashboard](https://grafana.com/grafana/dashboards/14459)
   - [OpenTelemetry Service Dashboard](https://grafana.com/grafana/dashboards/14460)

## 🐛 Troubleshooting

### Backend não está enviando traces

1. **Verificar logs do backend**:
```bash
docker logs credgestor_api | grep -i opentelemetry
```

2. **Verificar se o endpoint está acessível**:
```bash
curl http://otel-collector:4318/v1/traces
```

3. **Testar com console exporter**:
```bash
OTEL_TRACES_EXPORTER=console docker-compose up api
```

### Frontend não está enviando traces

1. **Verificar console do navegador**:
   - Procure por mensagens de erro relacionadas ao OpenTelemetry
   - Verifique se `VITE_OTEL_ENABLED=true`

2. **Verificar Network tab**:
   - Procure por requisições para `/v1/traces`
   - Verifique se não há erros CORS

3. **Testar configuração**:
```typescript
// Adicione temporariamente em src/index.tsx
import { setupOpenTelemetry } from '@/utils/otel';
setupOpenTelemetry({
  enabled: true,
  serviceName: 'credgestor-frontend',
  otlpEndpoint: 'http://localhost:4318',
});
```

### Traces não aparecem no Jaeger

1. **Verificar se o coletor está recebendo dados**:
```bash
docker logs otel-collector
```

2. **Verificar configuração do pipeline**:
   - Confirme que `traces` está configurado no pipeline
   - Verifique se o exporter do Jaeger está correto

3. **Verificar conectividade**:
```bash
docker exec otel-collector ping jaeger
```

### Performance

Se notar impacto na performance:

1. **Aumentar batch size**:
```yaml
processors:
  batch:
    send_batch_size: 2048
    timeout: 30s
```

2. **Usar sampling**:
```python
# Em backend/otel_config.py
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

sampler = TraceIdRatioBased(0.1)  # 10% das traces
trace_provider = TracerProvider(resource=resource, sampler=sampler)
```

## 📚 Recursos Adicionais

- [Documentação OpenTelemetry](https://opentelemetry.io/docs/)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
- [OTLP Collector](https://opentelemetry.io/docs/collector/)

## ✅ Checklist de Implementação

- [x] Dependências adicionadas no backend
- [x] Dependências adicionadas no frontend
- [x] Configuração do OpenTelemetry no backend
- [x] Configuração do OpenTelemetry no frontend
- [x] Variáveis de ambiente documentadas
- [x] Documentação criada
- [ ] Coletor OpenTelemetry configurado (opcional)
- [ ] Jaeger/Grafana configurado para visualização (opcional)

## 🎉 Próximos Passos

1. Configure um coletor OpenTelemetry (local ou gerenciado)
2. Configure visualização (Jaeger, Grafana, etc.)
3. Adicione spans customizados em operações críticas
4. Configure alertas baseados em traces e métricas
5. Integre com seu sistema de monitoramento existente
