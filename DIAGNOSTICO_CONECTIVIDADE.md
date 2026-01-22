# 🔍 Diagnóstico de Conectividade - Prometheus e API

## 🚨 Problemas Identificados

1. **Prometheus em `localhost:9090` não acessível**
2. **API em `167.235.76.26:8000` dando timeout**

## 📋 Passo a Passo de Diagnóstico

### 1. Verificar onde o Prometheus está rodando

O Prometheus está em um stack separado (`observability`). Vamos encontrar:

```bash
# Verificar serviços Docker Swarm
docker service ls | grep prometheus

# Verificar containers
docker ps | grep prometheus

# Verificar em qual porta está exposto
docker service ps observability_prometheus --no-trunc
```

**Possíveis URLs do Prometheus:**
- `http://localhost:9090` (se exposto na porta 9090)
- `http://167.235.76.26:9090` (se acessível externamente)
- `http://observability_prometheus:9090` (se dentro da rede Docker)
- `https://prometheus.aiagentautomate.com.br` (se configurado no Traefik)

### 2. Verificar se a API está acessível

A API pode estar atrás do Traefik. Vamos testar:

```bash
# Teste 1: Via Traefik (HTTPS)
curl https://credgestor.app.br/api/metrics

# Teste 2: Via Traefik (HTTP - deve redirecionar)
curl -L http://credgestor.app.br/api/metrics

# Teste 3: Direto na porta (se exposta)
curl http://localhost:8000/metrics

# Teste 4: De dentro do container
docker exec $(docker ps -q -f name=credgestor_api) curl http://localhost:8000/metrics
```

### 3. Verificar se a API está rodando

```bash
# Verificar status do serviço
docker service ps credgestor_api

# Verificar logs
docker service logs credgestor_api --tail 50

# Verificar se o container está rodando
docker ps | grep credgestor
```

### 4. Testar conectividade de dentro da rede Docker

Se o Prometheus está na mesma rede Docker, teste de dentro do container:

```bash
# Entrar no container do Prometheus (se possível)
docker exec -it <prometheus_container> sh

# Testar acesso à API
curl http://credgestor_api:8000/metrics
# OU
curl http://167.235.76.26:8000/metrics
```

### 5. Verificar configuração do Prometheus

O arquivo de configuração está em: `/var/www/findfruit/observability/prometheus/prometheus.yml`

```bash
# Verificar configuração atual
cat /var/www/findfruit/observability/prometheus/prometheus.yml | grep -A 10 credgestor

# Verificar se o target está correto
# Deve ter algo como:
# - targets: ['credgestor_api:8000']  # Se na mesma rede
# OU
# - targets: ['167.235.76.26:8000']   # Se externo
```

## 🔧 Soluções por Cenário

### Cenário 1: Prometheus não encontra a API (mesma rede Docker)

**Problema**: Prometheus e API estão na mesma rede, mas não se comunicam.

**Solução**:

1. **Verificar se estão na mesma rede**:
   ```bash
   docker network ls
   docker network inspect network_public
   ```

2. **Ajustar target no Prometheus**:
   ```yaml
   - job_name: 'credgestor-api'
     static_configs:
       - targets: ['credgestor_api:8000']  # Nome do serviço Docker
   ```

3. **Recarregar Prometheus**:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   # OU
   docker service update --force observability_prometheus
   ```

### Cenário 2: API não está acessível externamente

**Problema**: A API está atrás do Traefik e não expõe a porta 8000 diretamente.

**Solução**:

1. **Usar o endpoint via Traefik**:
   ```yaml
   - job_name: 'credgestor-api'
     static_configs:
       - targets: ['credgestor.app.br:443']  # Via Traefik HTTPS
     scheme: https
     metrics_path: '/api/metrics'  # Caminho completo via Traefik
   ```

2. **OU expor a porta 8000 diretamente** (se necessário):
   ```yaml
   # No docker-compose.yml, garantir que a porta está exposta
   ports:
     - "8000:8000"
   ```

3. **OU usar o IP interno do container**:
   ```bash
   # Descobrir IP do container
   docker inspect $(docker ps -q -f name=credgestor_api) | grep IPAddress
   
   # Usar no Prometheus
   - targets: ['172.x.x.x:8000']  # IP interno
   ```

### Cenário 3: Prometheus não está acessível em localhost:9090

**Problema**: Prometheus está em outro host ou porta.

**Solução**:

1. **Descobrir URL real do Prometheus**:
   ```bash
   # Verificar portas expostas
   docker service ps observability_prometheus --no-trunc | grep -i port
   
   # Verificar se está no Traefik
   # Acesse: https://portainer.aiagentautomate.com.br
   # Procure por serviços do stack observability
   ```

2. **Atualizar variável no Grafana**:
   - Vá em **Dashboard Settings** → **Variables**
   - Edite `PROMETHEUS_URL`
   - Coloque a URL correta (ex: `http://167.235.76.26:9090`)

3. **Atualizar data source do Prometheus**:
   - Vá em **Configuration** → **Data Sources** → **Prometheus**
   - Atualize a URL para a correta

### Cenário 4: API está dando timeout

**Problema**: Firewall, rede ou API não está respondendo.

**Solução**:

1. **Verificar se a API está rodando**:
   ```bash
   docker service ps credgestor_api
   docker service logs credgestor_api --tail 20
   ```

2. **Testar health check**:
   ```bash
   curl https://credgestor.app.br/api/health
   ```

3. **Verificar firewall**:
   ```bash
   # Verificar se a porta está aberta
   sudo ufw status
   sudo netstat -tulpn | grep 8000
   ```

4. **Testar de dentro do container**:
   ```bash
   docker exec $(docker ps -q -f name=credgestor_api) curl http://localhost:8000/metrics
   ```

## 🎯 Checklist Rápido

- [ ] Prometheus está rodando? (`docker service ls | grep prometheus`)
- [ ] API está rodando? (`docker service ps credgestor_api`)
- [ ] `/metrics` responde via Traefik? (`curl https://credgestor.app.br/api/metrics`)
- [ ] `/metrics` responde diretamente? (`curl http://localhost:8000/metrics`)
- [ ] Prometheus consegue acessar a API? (Verificar em `http://prometheus:9090/targets`)
- [ ] Data source do Grafana está configurado? (Configuration → Data Sources)
- [ ] URLs estão corretas? (Variáveis do dashboard)

## 🔍 Comandos Úteis

### Verificar todos os serviços
```bash
docker service ls
docker stack ls
```

### Verificar redes Docker
```bash
docker network ls
docker network inspect network_public
```

### Verificar portas expostas
```bash
docker service ps credgestor_api --no-trunc
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Testar conectividade entre containers
```bash
# De dentro do container do Prometheus
docker exec -it <prometheus_container> sh
ping credgestor_api
curl http://credgestor_api:8000/metrics
```

### Ver logs em tempo real
```bash
docker service logs -f credgestor_api
docker service logs -f observability_prometheus
```

## 📝 Próximos Passos

1. **Identificar onde o Prometheus está rodando**
2. **Testar acesso à API via Traefik e diretamente**
3. **Ajustar configuração do Prometheus conforme necessário**
4. **Atualizar URLs no Grafana**
5. **Verificar targets no Prometheus** (`http://prometheus:9090/targets`)

## 🆘 Se Nada Funcionar

1. **Verificar se a instrumentação está ativa**:
   ```bash
   docker exec $(docker ps -q -f name=credgestor_api) pip list | grep prometheus
   ```

2. **Verificar código da API**:
   ```bash
   docker exec $(docker ps -q -f name=credgestor_api) cat /app/backend/main.py | grep instrumentator
   ```

3. **Reiniciar serviços**:
   ```bash
   docker service update --force credgestor_api
   docker service update --force observability_prometheus
   ```

4. **Verificar logs completos**:
   ```bash
   docker service logs credgestor_api > api.log
   docker service logs observability_prometheus > prometheus.log
   ```
