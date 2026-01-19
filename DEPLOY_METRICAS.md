# 🚀 Deploy: Adicionar Métricas Prometheus ao CredGestor

Este guia explica como fazer deploy das alterações para coletar métricas da aplicação.

## ✅ Alterações Realizadas

1. ✅ **Dependência adicionada**: `prometheus-fastapi-instrumentator==7.0.0` no `requirements.txt`
2. ✅ **Instrumentação adicionada**: Código no `backend/main.py` para expor `/metrics`
3. ✅ **Labels Docker**: Adicionados labels no `docker-compose.yml` para service discovery
4. ✅ **Configuração Prometheus**: Arquivo `prometheus-config-credgestor.yml` criado
5. ✅ **Script de configuração**: `scripts/configurar-prometheus.sh` criado

## 📋 Passo a Passo para Deploy

### 1. Fazer Commit das Alterações

```bash
cd /var/www/credgestor-homologacao

# Verificar alterações
git status

# Adicionar arquivos modificados
git add requirements.txt backend/main.py docker-compose.yml
git add prometheus-config-credgestor.yml scripts/configurar-prometheus.sh

# Commit
git commit -m "feat: adiciona instrumentação Prometheus para métricas da API

- Adiciona prometheus-fastapi-instrumentator
- Expõe endpoint /metrics na API
- Adiciona labels Docker para service discovery
- Cria configuração e script para Prometheus"

# Push
git push
```

### 2. Build e Push da Nova Imagem (via GitHub Actions)

O GitHub Actions fará o build automaticamente após o push. Aguarde o workflow completar.

**OU fazer build manual:**

```bash
# Build da imagem
docker build -f Dockerfile.backend -t faelsouz/credgestor-homologacao-backend:latest .

# Push para Docker Hub
docker push faelsouz/credgestor-homologacao-backend:latest
```

### 3. Deploy na VPS

```bash
# Na VPS
cd /var/www/credgestor-homologacao

# Fazer pull das alterações
git pull

# Fazer pull da nova imagem
docker pull faelsouz/credgestor-homologacao-backend:latest

# Fazer deploy do stack
source .env
docker stack deploy -c docker-compose.yml credgestor

# OU se usar docker-compose
docker-compose pull api
docker-compose up -d api
```

### 4. Verificar se `/metrics` está funcionando

```bash
# Teste local na VPS
curl http://localhost:8000/metrics

# Teste externo
curl http://167.235.76.26:8000/metrics

# Verificar logs do container
docker service logs -f credgestor_api
# OU
docker-compose logs -f api
```

Você deve ver métricas como:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health",status_code="200"} 1.0
...
```

### 5. Configurar Prometheus para Coletar Métricas

#### Opção A: Usar o Script Automático

```bash
# Na VPS
cd /var/www/credgestor-homologacao
./scripts/configurar-prometheus.sh
```

O script irá:
- Localizar o arquivo `prometheus.yml` do stack observability
- Adicionar o job `credgestor-api`
- Criar backup do arquivo original

#### Opção B: Configuração Manual

1. **Encontrar o arquivo prometheus.yml**:
   ```bash
   # Se usar Docker Swarm
   docker service ps observability_prometheus --no-trunc
   
   # Verificar volumes
   docker volume ls | grep prometheus
   ```

2. **Adicionar o job manualmente**:
   - Copie o conteúdo de `prometheus-config-credgestor.yml`
   - Adicione ao arquivo `prometheus.yml` do Prometheus
   - Ajuste o target conforme necessário:
     - Se na mesma rede: `credgestor_api:8000`
     - Se externo: `167.235.76.26:8000`

3. **Recarregar configuração do Prometheus**:
   ```bash
   # Via API
   curl -X POST http://localhost:9090/-/reload
   
   # OU reiniciar o serviço
   docker service update --force observability_prometheus
   ```

### 6. Verificar no Prometheus

1. **Acesse o Prometheus**: `http://seu-prometheus:9090`

2. **Verifique Targets**:
   - Vá em **Status** → **Targets**
   - Procure por `credgestor-api`
   - Deve estar **UP** (verde)

3. **Teste Queries**:
   ```promql
   # Verificar se as métricas estão sendo coletadas
   http_requests_total
   
   # Taxa de requisições
   sum(rate(http_requests_total[5m])) by (method, endpoint)
   ```

### 7. Verificar no Grafana

Após configurar o Prometheus, os painéis do dashboard devem começar a mostrar dados:

1. **Taxa de Requisições (RPS)**: Deve mostrar requisições por segundo
2. **Latência (p50, p95, p99)**: Deve mostrar percentis de latência
3. **Taxa de Erros (4xx, 5xx)**: Deve mostrar erros HTTP
4. **Status API**: Deve mostrar se o job está UP

## 🔍 Troubleshooting

### Endpoint `/metrics` retorna 404

1. **Verificar se a dependência foi instalada**:
   ```bash
   docker exec -it $(docker ps -q -f name=credgestor_api) pip list | grep prometheus
   ```

2. **Verificar se o código foi atualizado**:
   ```bash
   docker exec -it $(docker ps -q -f name=credgestor_api) grep -i instrumentator /app/backend/main.py
   ```

3. **Reiniciar o container**:
   ```bash
   docker service update --force credgestor_api
   ```

### Prometheus não está coletando

1. **Verificar conectividade**:
   ```bash
   # Do container do Prometheus
   docker exec -it $(docker ps -q -f name=prometheus) curl http://167.235.76.26:8000/metrics
   ```

2. **Verificar logs do Prometheus**:
   ```bash
   docker service logs observability_prometheus | grep credgestor
   ```

3. **Verificar configuração**:
   - Confirme que o job foi adicionado ao `prometheus.yml`
   - Verifique se o target está correto
   - Verifique se o Prometheus recarregou a configuração

### Métricas não aparecem no Grafana

1. **Verificar time range**: Use "Last 6 hours" ou mais
2. **Testar queries no Explore**: Use o Grafana Explore para testar queries antes
3. **Verificar labels**: As queries usam `job=~"credgestor.*|.*api.*"` - ajuste se necessário

## 📊 Métricas Disponíveis

Após o deploy, você terá acesso a:

- `http_requests_total` - Total de requisições HTTP
- `http_request_duration_seconds` - Duração das requisições (histograma)
- `http_requests_inprogress` - Requisições em progresso

Labels disponíveis:
- `method` - Método HTTP (GET, POST, etc.)
- `endpoint` - Endpoint da API
- `status_code` - Código de status HTTP

## ✅ Checklist de Deploy

- [ ] Commit e push das alterações
- [ ] Build da nova imagem (automático via GitHub Actions ou manual)
- [ ] Deploy na VPS
- [ ] Verificar `/metrics` está funcionando
- [ ] Configurar Prometheus para coletar
- [ ] Verificar target está UP no Prometheus
- [ ] Verificar métricas aparecem no Grafana

## 🎯 Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Métricas de API funcionando no Grafana
2. ✅ Monitoramento de latência e erros
3. ✅ Alertas configuráveis (opcional)
4. ✅ Dashboards personalizados (opcional)
