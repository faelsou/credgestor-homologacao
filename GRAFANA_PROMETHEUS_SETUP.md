# 🔍 Guia: Reutilizar Prometheus Existente no Dashboard CredGestor

Este guia explica como descobrir quais métricas estão disponíveis no seu Prometheus e como ajustar o dashboard para usá-las.

## 📋 Passo 1: Descobrir Métricas Disponíveis

### 1.1. Acessar o Prometheus

1. Acesse a interface do Prometheus (geralmente em `http://seu-servidor:9090`)
2. Vá na aba **Graph** ou use a API

### 1.2. Listar Métricas Disponíveis

No Prometheus, execute estas queries para descobrir métricas:

```promql
# Listar todos os jobs disponíveis
up

# Métricas de containers Docker
container_cpu_usage_seconds_total
container_memory_usage_bytes
container_spec_memory_limit_bytes

# Métricas de node (se tiver node_exporter)
node_cpu_seconds_total
node_memory_MemAvailable_bytes
node_memory_MemTotal_bytes

# Métricas de HTTP (se a API expõe métricas)
http_requests_total
http_request_duration_seconds
```

### 1.3. Descobrir Labels Disponíveis

Para descobrir os labels corretos dos seus containers:

```promql
# Ver todos os containers disponíveis
container_cpu_usage_seconds_total

# Ver containers com nome específico
container_cpu_usage_seconds_total{name=~".*credgestor.*"}

# Ver todos os labels de um container
container_cpu_usage_seconds_total{name="credgestor-api"}
```

## 🔧 Passo 2: Ajustar Queries no Dashboard

### 2.1. Métricas de Containers Docker

As queries atuais usam `name=~"credgestor.*"`. Ajuste conforme seus labels:

**Opção 1: Por nome do container**
```promql
container_cpu_usage_seconds_total{name=~"credgestor.*"}
container_memory_usage_bytes{name=~"credgestor.*"}
```

**Opção 2: Por label customizado**
```promql
container_cpu_usage_seconds_total{label_app="credgestor"}
container_memory_usage_bytes{label_app="credgestor"}
```

**Opção 3: Por nome do serviço Docker Swarm**
```promql
container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}
```

### 2.2. Métricas de API (se a API expõe /metrics)

Se sua API FastAPI expõe métricas em `/metrics`, você pode usar:

**Opção 1: Com prometheus-fastapi-instrumentator**
```promql
# Taxa de requisições
sum(rate(http_requests_total[5m])) by (method, endpoint)

# Latência
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))

# Erros
sum(rate(http_requests_total{status=~"5.."}[5m])) by (status)
```

**Opção 2: Métricas genéricas do Prometheus**
```promql
# Se usar blackbox exporter ou similar
probe_http_status_code{job="credgestor-api"}
probe_http_duration_seconds{job="credgestor-api"}
```

### 2.3. Métricas de Infraestrutura (node_exporter)

Se você tem node_exporter configurado:

```promql
# CPU disponível
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memória disponível
(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Disco disponível
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

## 📝 Passo 3: Atualizar o Dashboard

### 3.1. Editar Queries no Grafana

1. Abra o dashboard no Grafana
2. Clique em **Edit** (ícone de lápis)
3. Clique no painel que você quer ajustar
4. Na seção **Query**, ajuste a query PromQL
5. Use o botão **Run query** para testar
6. Salve o painel

### 3.2. Variáveis de Template

O dashboard usa a variável `${DS_PROMETHEUS}`. Certifique-se de:

1. Ir em **Dashboard Settings** (ícone de engrenagem)
2. Vá em **Variables**
3. Verifique se `DS_PROMETHEUS` está configurada para seu data source do Prometheus
4. Se não existir, crie uma nova variável do tipo **Data source**

## 🎯 Exemplos de Queries por Cenário

### Cenário 1: Docker Swarm com cAdvisor

```promql
# CPU dos containers CredGestor
100 - (avg(rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}[5m])) * 100)

# Memória dos containers
100 - ((container_memory_usage_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"} / container_spec_memory_limit_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"}) * 100)
```

### Cenário 2: Docker Compose com labels

```promql
# CPU dos containers
100 - (avg(rate(container_cpu_usage_seconds_total{label_com_docker_compose_service=~"api|site"}[5m])) * 100)

# Memória dos containers
100 - ((container_memory_usage_bytes{label_com_docker_compose_service=~"api|site"} / container_spec_memory_limit_bytes{label_com_docker_compose_service=~"api|site"}) * 100)
```

### Cenário 3: Métricas de API via Traefik

Se você usa Traefik, pode coletar métricas dele:

```promql
# Requisições por segundo
sum(rate(traefik_entrypoint_requests_total{entrypoint="websecure"}[5m])) by (code)

# Latência
histogram_quantile(0.95, sum(rate(traefik_entrypoint_request_duration_seconds_bucket[5m])) by (le))
```

## 🔍 Como Descobrir os Labels Corretos

### Método 1: Via Interface do Prometheus

1. Acesse `http://seu-prometheus:9090/graph`
2. Digite: `container_cpu_usage_seconds_total`
3. Clique em **Execute**
4. Veja os resultados e identifique os labels disponíveis

### Método 2: Via API do Prometheus

```bash
# Listar todas as métricas
curl http://seu-prometheus:9090/api/v1/label/__name__/values

# Ver labels de uma métrica específica
curl 'http://seu-prometheus:9090/api/v1/query?query=container_cpu_usage_seconds_total'

# Ver valores de um label específico
curl http://seu-prometheus:9090/api/v1/label/name/values
```

### Método 3: Via Grafana Explore

1. No Grafana, vá em **Explore**
2. Selecione o data source do Prometheus
3. Digite uma query: `container_cpu_usage_seconds_total`
4. Use o autocomplete para ver labels disponíveis
5. Teste diferentes combinações de labels

## 📊 Queries Recomendadas para o Dashboard

### Status dos Containers

```promql
# Status dos containers CredGestor (ajuste o label conforme necessário)
up{job=~".*credgestor.*"}
# ou
up{instance=~".*credgestor.*"}
```

### CPU

```promql
# CPU disponível (ajuste labels conforme necessário)
100 - (avg(rate(container_cpu_usage_seconds_total{name=~"credgestor.*"}[5m])) * 100)
```

### Memória

```promql
# Memória disponível (ajuste labels conforme necessário)
100 - ((container_memory_usage_bytes{name=~"credgestor.*"} / container_spec_memory_limit_bytes{name=~"credgestor.*"}) * 100)
```

### Network (se disponível)

```promql
# Tráfego de rede recebido
rate(container_network_receive_bytes_total{name=~"credgestor.*"}[5m])

# Tráfego de rede enviado
rate(container_network_transmit_bytes_total{name=~"credgestor.*"}[5m])
```

## 🚨 Troubleshooting

### Query não retorna dados

1. **Verifique se a métrica existe**: Teste a query no Prometheus primeiro
2. **Verifique os labels**: Use `label_values()` no Grafana para ver valores disponíveis
3. **Verifique o time range**: Algumas métricas podem não ter dados históricos
4. **Verifique o job**: Certifique-se de que o Prometheus está coletando do target correto

### Labels não encontrados

1. **Use queries mais genéricas**: Remova filtros de labels e veja o que aparece
2. **Verifique a documentação do exporter**: Cada exporter tem labels diferentes
3. **Use regex mais amplo**: `name=~".*"` para ver todos os containers

### Métricas de API não aparecem

1. **Verifique se a API expõe /metrics**: Acesse `http://sua-api:8000/metrics`
2. **Verifique o job no Prometheus**: Confirme que está coletando do endpoint correto
3. **Adicione instrumentação**: Se necessário, adicione `prometheus-fastapi-instrumentator`

## 📚 Recursos Adicionais

- [Prometheus Querying Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus Label Matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#label-matching-operators)
- [cAdvisor Metrics](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Node Exporter Metrics](https://github.com/prometheus/node_exporter)
