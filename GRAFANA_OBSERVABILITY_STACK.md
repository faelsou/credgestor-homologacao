# 🎯 Guia: Dashboard CredGestor com Stack Observability

Este guia é específico para sua configuração com o stack **observability** que inclui:
- **Prometheus** (porta 9090)
- **cAdvisor** (porta 8080) - Métricas de containers Docker
- **node_exporter** (porta 9100) - Métricas de sistema/host
- **Grafana** (já configurado)

## 📊 Configuração do Data Source Prometheus

1. No Grafana, vá em **Configuration** → **Data Sources** → **Add data source**
2. Selecione **Prometheus**
3. Configure:
   - **Name**: `Prometheus` (ou o nome que você preferir)
   - **URL**: `http://observability_prometheus:9090` (se na mesma rede Docker)
     - OU `http://localhost:9090` (se acessando externamente)
     - OU `http://seu-ip-vps:9090` (se acessando de fora)
4. Clique em **Save & Test**

## 🔍 Métricas Disponíveis

### Métricas do cAdvisor (Containers Docker)

O cAdvisor expõe métricas de todos os containers Docker. Para filtrar apenas os containers do CredGestor, use:

```promql
# CPU dos containers CredGestor
container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}

# Memória dos containers CredGestor
container_memory_usage_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"}

# Limite de memória
container_spec_memory_limit_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"}

# Network
container_network_receive_bytes_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}
container_network_transmit_bytes_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}
```

### Métricas do node_exporter (Sistema/Host)

```promql
# CPU do sistema
node_cpu_seconds_total{mode="idle"}

# Memória do sistema
node_memory_MemAvailable_bytes
node_memory_MemTotal_bytes

# Disco
node_filesystem_avail_bytes{mountpoint="/"}
node_filesystem_size_bytes{mountpoint="/"}

# Network do host
node_network_receive_bytes_total
node_network_transmit_bytes_total
```

## 📝 Queries Recomendadas para o Dashboard

### Status dos Containers

```promql
# Status dos serviços CredGestor
up{job=~"credgestor.*|.*api.*"}
```

### CPU - Containers (cAdvisor)

```promql
# CPU disponível dos containers CredGestor
100 - (avg(rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}[5m])) * 100)

# CPU usado por container
rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}[5m]) * 100
```

### Memória - Containers (cAdvisor)

```promql
# Memória disponível dos containers CredGestor
100 - ((container_memory_usage_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"} / container_spec_memory_limit_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"}) * 100)

# Memória usada por container
container_memory_usage_bytes{container_label_com_docker_swarm_service_name=~"credgestor.*"} / 1024 / 1024
```

### CPU - Sistema (node_exporter)

```promql
# CPU disponível do sistema
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU usado por modo
rate(node_cpu_seconds_total[5m]) * 100
```

### Memória - Sistema (node_exporter)

```promql
# Memória disponível do sistema
(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Memória usada
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1024 / 1024 / 1024
```

### Disco (node_exporter)

```promql
# Disco disponível
100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}) * 100)

# Espaço usado em GB
(node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"} - node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"}) / 1024 / 1024 / 1024
```

### Network - Containers (cAdvisor)

```promql
# Tráfego recebido
rate(container_network_receive_bytes_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}[5m])

# Tráfego enviado
rate(container_network_transmit_bytes_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}[5m])
```

## 🔧 Descobrir Labels dos Seus Containers

### Método 1: Via Prometheus UI

1. Acesse `http://seu-prometheus:9090/graph`
2. Execute: `container_cpu_usage_seconds_total`
3. Veja os resultados e identifique os labels disponíveis
4. Procure por `container_label_com_docker_swarm_service_name` ou `name`

### Método 2: Via Grafana Explore

1. No Grafana, vá em **Explore**
2. Selecione o data source do Prometheus
3. Digite: `container_cpu_usage_seconds_total`
4. Use o autocomplete para ver labels disponíveis
5. Teste diferentes valores para `container_label_com_docker_swarm_service_name`

### Método 3: Listar Todos os Containers

```promql
# Ver todos os containers
container_cpu_usage_seconds_total

# Ver apenas containers do CredGestor (ajuste conforme necessário)
container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~"credgestor.*"}

# Ver labels de um container específico
container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name="credgestor_api"}
```

## 📊 Painéis do Dashboard

O dashboard já está configurado com queries que funcionam com cAdvisor e node_exporter:

### ✅ Painéis que Funcionam Automaticamente

1. **CPU Disponível** - Usa cAdvisor para containers CredGestor
2. **Memória Disponível** - Usa cAdvisor para containers CredGestor
3. **Utilização de Recursos** - Combina cAdvisor (containers) e node_exporter (sistema)
4. **Status API** - Verifica se os jobs estão UP

### ⚠️ Painéis que Precisam de Ajuste

1. **Taxa de Requisições (RPS)** - Precisa que a API expõe `/metrics`
2. **Latência** - Precisa que a API expõe `/metrics`
3. **Taxa de Erros** - Precisa que a API expõe `/metrics`

## 🚀 Adicionar Métricas da API (Opcional)

Se você quiser métricas da API FastAPI, adicione instrumentação:

### 1. Instalar dependência

```bash
pip install prometheus-fastapi-instrumentator
```

### 2. Adicionar no `backend/main.py`

```python
from prometheus_fastapi_instrumentator import Instrumentator

# Após criar o app FastAPI
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)
```

### 3. Configurar Prometheus para coletar

No arquivo de configuração do Prometheus (`prometheus.yml`), adicione:

```yaml
scrape_configs:
  - job_name: 'credgestor-api'
    static_configs:
      - targets: ['167.235.76.26:8000']  # Ajuste conforme necessário
    metrics_path: '/metrics'
```

### 4. Queries no Dashboard

Após configurar, as queries do dashboard funcionarão automaticamente:
- Taxa de requisições
- Latência
- Taxa de erros

## 🎯 Labels Comuns do Docker Swarm

No Docker Swarm, os containers têm labels específicos:

- `container_label_com_docker_swarm_service_name` - Nome do serviço no Swarm
- `container_label_com_docker_swarm_task_name` - Nome da task
- `name` - Nome do container
- `id` - ID do container

Para o CredGestor, use:
```promql
container_label_com_docker_swarm_service_name=~"credgestor.*"
```

## 🚨 Troubleshooting

### Métricas não aparecem

1. **Verifique se o Prometheus está coletando do cAdvisor**:
   ```promql
   up{job="cadvisor"}
   ```

2. **Verifique se o Prometheus está coletando do node_exporter**:
   ```promql
   up{job="node"}
   ```

3. **Liste todos os containers disponíveis**:
   ```promql
   container_cpu_usage_seconds_total
   ```

### Labels não encontrados

1. **Use queries mais genéricas primeiro**:
   ```promql
   container_cpu_usage_seconds_total
   ```

2. **Veja quais labels estão disponíveis**:
   - No Prometheus UI, clique em um resultado para ver todos os labels
   - No Grafana Explore, use o autocomplete

3. **Ajuste o regex conforme necessário**:
   ```promql
   # Mais específico
   container_label_com_docker_swarm_service_name=~"credgestor_api"
   
   # Mais genérico
   container_label_com_docker_swarm_service_name=~".*credgestor.*"
   ```

## 📚 Recursos

- [cAdvisor Metrics](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Node Exporter Metrics](https://github.com/prometheus/node_exporter)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/)
