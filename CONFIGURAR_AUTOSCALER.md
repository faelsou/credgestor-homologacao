# 🔧 Configurar Auto-Scaling para Docker Swarm

## 📋 Situação Atual

Os labels de auto-scaling já foram adicionados ao serviço `api` no `docker-compose.yml`:
- `com.docker.swarm.autoscale.min=1`
- `com.docker.swarm.autoscale.max=5`
- `com.docker.swarm.autoscale.target=80` (CPU %)

Agora é necessário configurar um sistema que leia esses labels e ajuste as réplicas automaticamente.

## ✅ Opções de Implementação

### Opção 1: Usar Portainer (Recomendado - Mais Simples)

Se você já tem Portainer instalado, pode configurar auto-scaling via interface:

1. Acesse o Portainer
2. Vá em **Services** → **credgestor_api**
3. Procure por **Auto-scaling** ou **Scaling policies**
4. Configure:
   - Min replicas: 1
   - Max replicas: 5
   - Target CPU: 80%
   - Check interval: 30s

**Nota:** Nem todas as versões do Portainer têm auto-scaling nativo. Se não encontrar essa opção, use a Opção 2.

### Opção 2: Usar Script Python Customizado (Mais Controle)

#### 2.1. Criar Container com Autoscaler

```bash
# Criar Dockerfile para o autoscaler
cat > Dockerfile.autoscaler << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN pip install docker requests

COPY scripts/autoscaler.py /app/autoscaler.py

CMD ["python", "/app/autoscaler.py"]
EOF

# Build da imagem
docker build -f Dockerfile.autoscaler -t credgestor-autoscaler:latest .

# Deploy como serviço no Swarm
docker service create \
  --name autoscaler \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock,readonly \
  --network network_public \
  --constraint 'node.role==manager' \
  --restart-condition on-failure \
  -e PROMETHEUS_URL=http://prometheus_prometheus:9090 \
  -e CHECK_INTERVAL=30 \
  -e COOLDOWN_PERIOD=60 \
  credgestor-autoscaler:latest
```

#### 2.2. Usar docker-compose-autoscaler.yml (Recomendado)

```bash
# 1. Build da imagem do autoscaler
docker build -f Dockerfile.autoscaler -t credgestor-autoscaler:latest .

# 2. Deploy do autoscaler
docker stack deploy -c docker-compose-autoscaler.yml autoscaler

# 3. Verificar status
docker service ps autoscaler_autoscaler

# 4. Ver logs
docker service logs -f autoscaler_autoscaler
```

**Nota:** Se o Prometheus estiver em outro stack, ajuste a variável `PROMETHEUS_URL` no `docker-compose-autoscaler.yml` para o nome completo do serviço (ex: `http://prometheus_prometheus:9090`).

### Opção 3: Usar Docker Swarm Autoscaler (Terceiros)

Existem projetos open-source que fazem isso:

1. **crlab/swarm-autoscaler** (já incluído no docker-compose-autoscaler.yml)
2. **docker-autoscale** (outro projeto similar)

## 🔍 Verificação

### Listar serviços com auto-scaling configurado:

```bash
# Usar o script helper
./scripts/listar-servicos-autoscaling.sh

# Ou verificar manualmente
docker service inspect credgestor_api --format '{{range $k, $v := .Spec.Labels}}{{if eq $k "com.docker.swarm.autoscale.min"}}Serviço tem auto-scaling configurado{{end}}{{end}}'

# Ver todos os labels de autoscaling de um serviço
docker service inspect credgestor_api --format '{{json .Spec.Labels}}' | python3 -m json.tool | grep autoscale
```

### Verificar se o autoscaler está funcionando:

```bash
# Ver logs do autoscaler
docker service logs -f autoscaler_autoscaler

# Ver réplicas atuais do serviço API
docker service ps credgestor_api

# Verificar métricas de CPU via Prometheus
curl "http://localhost:9090/api/v1/query?query=container_cpu_usage_seconds_total{name=~'.*credgestor_api.*'}"
```

### Testar auto-scaling:

```bash
# Gerar carga na API para testar escalonamento
ab -n 10000 -c 100 https://credgestor.app.br/api/health

# Monitorar réplicas em tempo real
watch -n 2 'docker service ps credgestor_api --no-trunc'
```

## ⚙️ Configuração Avançada

### Ajustar parâmetros do autoscaler:

Edite as variáveis de ambiente no `docker-compose-autoscaler.yml`:

```yaml
environment:
  - PROMETHEUS_URL=http://prometheus:9090  # URL do Prometheus
  - CHECK_INTERVAL=30                       # Verificar a cada 30s
  - COOLDOWN_PERIOD=60                      # Esperar 60s entre escalonamentos
  - METRIC_NAME=container_cpu_usage_seconds_total  # Métrica de CPU
```

### Ajustar thresholds nos labels:

No `docker-compose.yml`, ajuste os labels do serviço `api`:

```yaml
labels:
  - com.docker.swarm.autoscale.min=1    # Mínimo de réplicas
  - com.docker.swarm.autoscale.max=10   # Máximo de réplicas
  - com.docker.swarm.autoscale.target=70 # CPU target (70%)
```

## 📊 Monitoramento

### Dashboard Grafana

Crie um painel no Grafana para monitorar:

- Número de réplicas do serviço
- CPU usage por container
- Escalonamentos (up/down)

### Alertas

Configure alertas no Prometheus/Grafana para:
- Auto-scaling falhando
- CPU consistentemente acima do target
- Número máximo de réplicas atingido

## 🐛 Troubleshooting

### Autoscaler não está escalando:

1. Verificar se o autoscaler está rodando:
   ```bash
   docker service ps autoscaler_autoscaler
   ```

2. Verificar logs:
   ```bash
   docker service logs autoscaler_autoscaler --tail 100
   ```

3. Verificar se o Prometheus está acessível:
   ```bash
   docker exec $(docker ps -q -f name=autoscaler) curl http://prometheus:9090/api/v1/query?query=up
   ```

4. Verificar se os labels estão corretos:
   ```bash
   docker service inspect credgestor_api --pretty | grep autoscale
   ```

### CPU não está sendo coletada:

1. Verificar se o cAdvisor está rodando (coleta métricas de containers)
2. Verificar configuração do Prometheus para coletar métricas de containers
3. Verificar se a métrica `container_cpu_usage_seconds_total` existe no Prometheus

## 📝 Notas Importantes

- O autoscaler precisa ter acesso ao socket do Docker (`/var/run/docker.sock`)
- O autoscaler precisa estar na mesma rede que o Prometheus
- O cooldown period evita oscilações (escalar para cima e para baixo rapidamente)
- O autoscaler só funciona com serviços que têm os labels configurados
- Recomenda-se monitorar o autoscaler para garantir que está funcionando corretamente

## ✅ Checklist de Implementação

- [x] Labels de auto-scaling adicionados ao `docker-compose.yml`
- [ ] Autoscaler configurado e rodando
- [ ] Prometheus coletando métricas de CPU
- [ ] Testado escalonamento automático
- [ ] Dashboard de monitoramento criado
- [ ] Alertas configurados
