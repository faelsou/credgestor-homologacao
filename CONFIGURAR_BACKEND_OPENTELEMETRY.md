# 🔧 Configurar Backend para Enviar Traces ao OpenTelemetry

## ✅ Status Atual

- ✅ Jaeger UI está funcionando (http://localhost:16686)
- ✅ OpenTelemetry Collector está rodando
- ⚠️ Backend ainda não está configurado para enviar traces

## 📝 Passo a Passo

### 1. Adicionar Variáveis de Ambiente no docker-compose.yml

Edite o arquivo `docker-compose.yml` e adicione as seguintes variáveis na seção `api` → `environment`:

```yaml
services:
  api:
    environment:
      # ... variáveis existentes ...
      
      # OpenTelemetry Configuration
      OTEL_SERVICE_NAME: ${OTEL_SERVICE_NAME:-credgestor-api}
      OTEL_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-0.1.0}
      OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_EXPORTER_OTLP_ENDPOINT:-http://otel-collector:4318}
      OTEL_TRACES_EXPORTER: ${OTEL_TRACES_EXPORTER:-otlp}
      OTEL_METRICS_EXPORTER: ${OTEL_METRICS_EXPORTER:-otlp}
      OTEL_LOGS_EXPORTER: ${OTEL_LOGS_EXPORTER:-otlp}
```

### 2. Conectar Coletor à Rede do Backend

Execute o script para conectar o coletor à `network_public`:

```bash
./scripts/conectar-opentelemetry-rede.sh
```

### 3. Reiniciar o Backend

Se estiver usando Docker Swarm:

```bash
docker service update --env-add OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 credgestor_api
docker service update --env-add OTEL_TRACES_EXPORTER=otlp credgestor_api
docker service scale credgestor_api=0
docker service scale credgestor_api=1
```

Ou se estiver usando docker-compose:

```bash
docker-compose restart api
```

### 4. Verificar se Está Funcionando

```bash
# Ver logs do backend
docker service logs credgestor_api --tail 50 | grep -i opentelemetry

# Ou se usar docker-compose:
docker logs credgestor_api | grep -i opentelemetry
```

Deve aparecer:
```
✅ OpenTelemetry Traces configurado (OTLP: http://otel-collector:4318)
✅ FastAPI instrumentado com OpenTelemetry
✅ Bibliotecas HTTP instrumentadas (httpx, requests)
🎉 OpenTelemetry configurado com sucesso!
```

### 5. Gerar Alguns Traces

Faça algumas requisições à API:

```bash
# Health check
curl http://localhost:8000/health

# Ou acesse a documentação
# http://localhost:8000/docs
```

### 6. Ver Traces no Jaeger

1. Acesse: http://localhost:16686
2. Selecione o serviço: `credgestor-api`
3. Clique em "Find Traces"
4. Você deve ver traces das requisições!

## 🔍 Troubleshooting

### Traces não aparecem no Jaeger

1. **Verificar se o backend está enviando:**
   ```bash
   docker logs otel-collector | grep -i trace
   ```

2. **Verificar conectividade:**
   ```bash
   # Do container do backend, testar conexão com o coletor
   docker exec <container-backend> curl http://otel-collector:4318/v1/traces
   ```

3. **Verificar variáveis de ambiente:**
   ```bash
   docker service inspect credgestor_api | grep -A 20 "Env"
   ```

### Erro: "Cannot connect to otel-collector"

**Solução:** Execute o script de conexão:
```bash
./scripts/conectar-opentelemetry-rede.sh
```

### Backend não inicia

**Solução:** Verifique se as dependências do OpenTelemetry foram instaladas:
```bash
docker exec <container-backend> pip list | grep opentelemetry
```

Se não estiverem instaladas, faça rebuild da imagem:
```bash
docker-compose build api
docker-compose up -d api
```

## 📊 O que Você Verá no Jaeger

Após configurar, você verá:

- **Serviço:** `credgestor-api`
- **Operações:** 
  - `GET /health`
  - `GET /tenants/{tenant_id}/clients`
  - `POST /auth/login`
  - etc.
- **Spans:** Cada operação terá spans mostrando:
  - Tempo de execução
  - Chamadas ao banco de dados
  - Erros (se houver)
  - Correlação com frontend (quando configurado)

## ✅ Checklist

- [ ] Variáveis de ambiente adicionadas no docker-compose.yml
- [ ] Coletor conectado à network_public
- [ ] Backend reiniciado
- [ ] Logs mostram OpenTelemetry configurado
- [ ] Traces aparecem no Jaeger
