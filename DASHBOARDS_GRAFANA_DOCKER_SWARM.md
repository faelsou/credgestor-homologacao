# 📊 Dashboards Grafana para Docker Swarm + OpenTelemetry

## ⚠️ Problema Identificado

O dashboard atual "CredGestor-jaeguer" está configurado para **Kubernetes** (mostra Cluster, Nodes, Deployments, etc.), mas você está usando **Docker Swarm**. Por isso não aparecem dados.

## ✅ Dashboards Recomendados

### 1. Para Traces (Jaeger)

**Dashboard:** Jaeger Search (nativo do Grafana)

1. Vá em **Explore** (ícone de bússola)
2. Selecione **Jaeger** como data source
3. Selecione o serviço: **credgestor-api**
4. Clique em **"Run query"**

**Ou importe dashboard específico:**
- ID: `13332` - [Jaeger Search Dashboard](https://grafana.com/grafana/dashboards/13332)

### 2. Para Métricas da API (Prometheus)

**Dashboard:** OpenTelemetry Service Metrics

1. Vá em **Dashboards** → **Import**
2. Digite o ID: `14460`
3. Selecione o data source: **Prometheus** (prometheus-otel)
4. Clique em **Import**

**Ou use queries customizadas no Explore:**

```promql
# Total de requisições
http_requests_total

# Taxa de requisições por segundo
rate(http_requests_total[5m])

# Latência p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))

# Taxa de erros
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (endpoint)
```

### 3. Para Containers Docker (cAdvisor)

Se você tem cAdvisor configurado, importe:

- ID: `14282` - [Docker Container & Host Metrics](https://grafana.com/grafana/dashboards/14282)

### 4. Para Métricas do Sistema (Node Exporter)

Se você tem Node Exporter configurado, importe:

- ID: `1860` - [Node Exporter Full](https://grafana.com/grafana/dashboards/1860)

## 🎯 Dashboard Customizado para CredGestor

Crie um dashboard simples focado em:

1. **Traces do Jaeger** (via Explore)
2. **Métricas da API** (via Prometheus)
3. **Status dos Serviços Docker Swarm**

### Passo a Passo para Criar Dashboard Simples

1. **Criar Novo Dashboard:**
   - Vá em **Dashboards** → **New** → **New Dashboard**
   - Nome: `CredGestor - Observability`

2. **Adicionar Painel de Traces:**
   - Clique em **Add visualization**
   - Selecione **Jaeger** como data source
   - Configure para mostrar traces do `credgestor-api`

3. **Adicionar Painel de Métricas:**
   - Clique em **Add visualization**
   - Selecione **Prometheus** como data source
   - Query: `rate(http_requests_total[5m])`
   - Visualização: **Time series**

4. **Adicionar Painel de Status:**
   - Query: `up{job="credgestor-api"}`
   - Visualização: **Stat**
   - Mostra se a API está UP (1) ou DOWN (0)

## 📋 Dashboards por Categoria

### OpenTelemetry

| ID | Nome | Descrição |
|----|------|-----------|
| `14459` | OpenTelemetry Collector | Métricas do coletor |
| `14460` | OpenTelemetry Service | Métricas de serviços instrumentados |

### Docker

| ID | Nome | Descrição |
|----|------|-----------|
| `14282` | Docker Container & Host Metrics | Métricas de containers Docker |
| `179` | Docker Swarm | Métricas do Docker Swarm |

### Jaeger

| ID | Nome | Descrição |
|----|------|-----------|
| `13332` | Jaeger Search | Busca e visualização de traces |

## 🔧 Configuração no Portainer

### Verificar Serviços Docker Swarm

No Portainer, você pode verificar:

1. **Serviços rodando:**
   - `credgestor_api`
   - `credgestor_site`
   - `observability_prometheus` (se configurado)
   - `otel-collector` (se adicionado como serviço)

2. **Networks:**
   - `network_public` (overlay network do Swarm)

### Adicionar OpenTelemetry Collector como Serviço Swarm (Opcional)

Se quiser adicionar o coletor como serviço do Swarm no Portainer:

1. Vá em **Stacks** → **Add stack**
2. Nome: `opentelemetry`
3. Cole o conteúdo do `docker-compose-opentelemetry.yml`
4. Ajuste para usar `network_public` como rede externa
5. Deploy

## 🎨 Dashboard Recomendado para Começar

### Dashboard Simples "CredGestor Observability"

**Painéis sugeridos:**

1. **Status da API**
   - Query: `up{job="credgestor-api"}`
   - Tipo: Stat
   - Mostra: 1 = UP, 0 = DOWN

2. **Taxa de Requisições**
   - Query: `sum(rate(http_requests_total[5m])) by (method)`
   - Tipo: Time series
   - Mostra: Requisições por segundo por método HTTP

3. **Latência p95**
   - Query: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))`
   - Tipo: Time series
   - Mostra: Latência do percentil 95

4. **Taxa de Erros**
   - Query: `sum(rate(http_requests_total{status_code=~"5.."}[5m]))`
   - Tipo: Time series
   - Mostra: Erros 5xx por segundo

5. **Traces Recentes** (via Jaeger)
   - Data source: Jaeger
   - Service: credgestor-api
   - Mostra: Últimos traces

## 📝 Notas Importantes

### Docker Swarm vs Kubernetes

- **Docker Swarm:** Use dashboards de Docker/containers
- **Kubernetes:** Dashboards mostram Cluster, Nodes, Deployments (não aplicável ao Swarm)

### Data Sources Necessários

1. **Jaeger:** `http://167.235.76.26:16686` ✅
2. **Prometheus:** `http://167.235.76.26:9090` ✅

### Métricas Disponíveis

Do Prometheus, você tem acesso a:
- `http_requests_total` - Total de requisições
- `http_request_duration_seconds` - Duração das requisições
- `http_requests_inprogress` - Requisições em progresso
- Métricas customizadas do banco de dados (se configuradas)

## 🚀 Próximos Passos

1. **Remover ou ignorar** o dashboard Kubernetes atual
2. **Criar novo dashboard** focado em Docker Swarm + OpenTelemetry
3. **Importar dashboards** recomendados acima
4. **Configurar alertas** baseados nas métricas

---

**Dica:** Comece com o **Explore** do Grafana para testar queries antes de criar dashboards complexos!
