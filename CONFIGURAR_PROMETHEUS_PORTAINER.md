# 🔧 Configurar Prometheus no Portainer para CredGestor

## 📋 Situação Atual

Você está usando um Prometheus separado no Portainer, localizado em `/var/www/prometheus`, conectado à rede `network_public` do CredGestor.

## ✅ Passo a Passo

### 1. Criar Docker Config no Portainer

1. No Portainer, vá em **Configs** (menu lateral)
2. Clique em **Add config**
3. Configure:
   - **Name**: `prometheus_config`
   - **Configuration**: Cole o conteúdo abaixo
4. Clique em **Create the config**

**Conteúdo do Config:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'credgestor-production'
    environment: 'production'

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'
          component: 'monitoring'

  # CredGestor API - Coleta de métricas via Traefik
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
          instance: 'api-https'

  # cAdvisor - Métricas de containers (se disponível)
  - job_name: 'cadvisor'
    scrape_interval: 15s
    static_configs:
      - targets: ['observability_cadvisor:8080']
        labels:
          service: 'cadvisor'
          component: 'container-metrics'

  # Node Exporter - Métricas do sistema (se disponível)
  - job_name: 'node-exporter'
    scrape_interval: 15s
    static_configs:
      - targets: ['observability_node_exporter:9100']
        labels:
          service: 'node-exporter'
          component: 'host-metrics'
```

### 2. Atualizar Docker Compose no Portainer

No Portainer, vá em **Stacks** → **prometheus** → **Editor** e atualize o `docker-compose.yml`:

```yaml
version: '3.9'

services:
  prometheus:
    image: prom/prometheus:latest
    # Porta alternativa (9090 já está em uso pelo observability_prometheus)
    ports:
      - "9091:9090"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == manager
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
        uid: '65534'
        gid: '65534'
        mode: 0644
    volumes:
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
      - '--web.listen-address=0.0.0.0:9090'
    networks:
      - prometheus_net

configs:
  prometheus_config:
    external: true
    name: prometheus_config

volumes:
  prometheus_data:
    driver: local

networks:
  prometheus_net:
    driver: overlay
    external: true
    name: network_public
```

**Mudanças importantes:**
- ✅ Removido `volumes: - ./prometheus.yml:...` (não funciona no Portainer)
- ✅ Adicionado `configs:` para usar Docker Config
- ✅ Adicionado `--web.listen-address=0.0.0.0:9090` no command
- ✅ Mantido `network_public` para acessar a API

### 3. Deploy do Stack

1. No Portainer, após atualizar o docker-compose.yml
2. Clique em **Update the stack**
3. Aguarde o serviço iniciar

### 4. Verificar Status

```bash
# Verificar se o serviço está rodando
docker service ps prometheus_prometheus

# Verificar logs
docker service logs prometheus_prometheus --tail 50

# Verificar se consegue acessar a API
docker exec $(docker ps -q -f name=prometheus_prometheus) curl -k https://credgestor.app.br/api/metrics | head -5
```

### 5. Acessar Prometheus

Como a porta 9090 está em uso pelo `observability_prometheus`, você tem algumas opções:

**Opção A: Usar porta alternativa (recomendado)**
- Descomente `ports: - "9091:9090"` no docker-compose.yml
- Acesse: `http://localhost:9091` ou `http://167.235.76.26:9091`

**Opção B: Configurar via Traefik**
- Adicione labels Traefik no `deploy.labels`:
```yaml
deploy:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.prometheus.rule=Host(`prometheus.credgestor.app.br`)"
    - "traefik.http.routers.prometheus.entrypoints=websecure"
    - "traefik.http.routers.prometheus.tls.certresolver=letsencrypt"
    - "traefik.http.services.prometheus.loadbalancer.server.port=9090"
```
- Acesse: `https://prometheus.credgestor.app.br`

### 6. Verificar Targets

1. Acesse o Prometheus (porta 9091 ou via Traefik)
2. Vá em **Status** → **Targets**
3. Verifique se `credgestor-api` está **UP** (verde)

### 7. Configurar Grafana

1. No Grafana, vá em **Configuration** → **Data Sources** → **Add data source**
2. Selecione **Prometheus**
3. Configure:
   - **Name**: `Prometheus` (ou outro nome)
   - **URL**: 
     - Se na mesma rede: `http://prometheus_prometheus:9090`
     - Se porta alternativa: `http://localhost:9091`
     - Se via Traefik: `https://prometheus.credgestor.app.br`
4. Clique em **Save & Test**

## 🔍 Troubleshooting

### Serviço não inicia

**Erro**: `bind source path does not exist`

**Solução**: Use Docker Config ao invés de volume bind (como mostrado acima)

### Target está DOWN

1. **Verificar conectividade**:
   ```bash
   docker exec $(docker ps -q -f name=prometheus_prometheus) curl -k https://credgestor.app.br/api/metrics
   ```

2. **Verificar logs**:
   ```bash
   docker service logs prometheus_prometheus --tail 50 | grep -i error
   ```

3. **Verificar rede**:
   ```bash
   docker network inspect network_public | grep -A 5 prometheus
   ```

### Métricas não aparecem no Grafana

1. Verifique se o Prometheus está coletando (Status → Targets)
2. Teste queries no Prometheus: `http_requests_total`
3. Verifique o data source no Grafana
4. Ajuste o time range no dashboard

## 📝 Resumo

✅ **Config criado**: `prometheus_config` no Portainer
✅ **Docker Compose atualizado**: Usando configs ao invés de volumes
✅ **Rede configurada**: `network_public` para acessar a API
✅ **Job configurado**: `credgestor-api` coletando de `https://credgestor.app.br/api/metrics`
✅ **Labels corretos**: `handler`, `method`, `status`

## 🎯 Próximos Passos

1. ✅ Criar Docker Config no Portainer
2. ✅ Atualizar docker-compose.yml
3. ✅ Deploy do stack
4. ✅ Verificar targets no Prometheus
5. ✅ Configurar data source no Grafana
6. ✅ Importar dashboard: `grafana-dashboard-sre-completo.json`
