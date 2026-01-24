# 🚀 OpenTelemetry - Quick Start

## ✅ Status Atual

Os containers do OpenTelemetry estão rodando:
- ✅ **Jaeger**: http://localhost:16686
- ✅ **OpenTelemetry Collector**: Porta 4318 (HTTP) e 4317 (gRPC)

## 📋 Passos para Acessar

### 1. Acessar Jaeger UI

Abra no navegador: **http://localhost:16686**

Você verá:
- Lista de serviços
- Traces de requisições
- Tempo de execução
- Erros e exceções

### 2. Configurar Backend para Enviar Dados

**Opção A: Se os containers estão na mesma rede (network_public)**

Adicione no `docker-compose.yml` (seção `api` → `environment`):

```yaml
environment:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
  OTEL_TRACES_EXPORTER: otlp
  OTEL_METRICS_EXPORTER: otlp
```

Depois execute:
```bash
./scripts/conectar-opentelemetry-rede.sh
docker-compose restart api
```

**Opção B: Se os containers estão em redes diferentes**

Use o IP do host:

```yaml
environment:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://<IP-DO-HOST>:4318
  OTEL_TRACES_EXPORTER: otlp
```

### 3. Configurar Frontend

Adicione no `.env`:

```bash
VITE_OTEL_ENABLED=true
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Depois faça rebuild:
```bash
docker-compose build site
docker-compose up -d site
```

### 4. Verificar se Está Funcionando

```bash
# Ver logs do coletor
docker logs otel-collector

# Ver logs do Jaeger
docker logs jaeger

# Verificar se o backend está enviando dados
docker logs credgestor_api | grep -i opentelemetry
```

### 5. Testar

1. Faça algumas requisições na aplicação
2. Acesse Jaeger: http://localhost:16686
3. Selecione o serviço: `credgestor-api` ou `credgestor-frontend`
4. Clique em "Find Traces"
5. Você deve ver as traces das requisições!

## 🔧 Comandos Úteis

### Iniciar/Parar OpenTelemetry

```bash
# Iniciar
docker-compose -f docker-compose-opentelemetry.yml up -d

# Parar
docker-compose -f docker-compose-opentelemetry.yml down

# Ver logs
docker-compose -f docker-compose-opentelemetry.yml logs -f
```

### Conectar à Rede Principal

Se precisar que os containers OpenTelemetry se comuniquem com `credgestor-api`:

```bash
./scripts/conectar-opentelemetry-rede.sh
```

### Verificar Status

```bash
# Ver containers rodando
docker ps | grep -E "jaeger|otel-collector"

# Verificar rede
docker network inspect otel_network

# Testar conectividade
docker exec credgestor_api ping -c 2 otel-collector
```

## 🐛 Troubleshooting

### Jaeger não abre no navegador

1. Verifique se está rodando:
   ```bash
   docker ps | grep jaeger
   ```

2. Verifique a porta:
   ```bash
   netstat -tlnp | grep 16686
   ```

3. Verifique logs:
   ```bash
   docker logs jaeger
   ```

### Não aparecem traces no Jaeger

1. Verifique se o coletor está recebendo dados:
   ```bash
   docker logs otel-collector | grep -i "received\|exported"
   ```

2. Verifique se o backend está configurado:
   ```bash
   docker exec credgestor_api env | grep OTEL
   ```

3. Verifique conectividade:
   ```bash
   docker exec credgestor_api curl -v http://otel-collector:4318/v1/traces
   ```

### Erro de rede

Se aparecer erro sobre rede não attachable:

1. Use a rede própria (já configurada):
   ```bash
   docker network inspect otel_network
   ```

2. Conecte manualmente à network_public:
   ```bash
   ./scripts/conectar-opentelemetry-rede.sh
   ```

## 📚 Próximos Passos

- Configure Grafana para visualização completa (veja `COMO_ACESSAR_OPENTELEMETRY.md`)
- Adicione spans customizados em operações críticas
- Configure alertas baseados em traces

## ✅ Checklist

- [x] Containers OpenTelemetry rodando
- [ ] Backend configurado com `OTEL_EXPORTER_OTLP_ENDPOINT`
- [ ] Frontend configurado com `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`
- [ ] Jaeger acessível em http://localhost:16686
- [ ] Traces aparecendo no Jaeger após fazer requisições
