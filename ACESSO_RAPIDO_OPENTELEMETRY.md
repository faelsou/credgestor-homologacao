# 🚀 Acesso Rápido ao OpenTelemetry

## ⚠️ Portas Importantes

### ❌ NÃO é uma interface web:
- **Porta 4318** - OpenTelemetry Collector (OTLP receiver) - **Não acesse no navegador!**
- **Porta 4317** - OpenTelemetry Collector (OTLP gRPC receiver) - **Não acesse no navegador!**

### ✅ Interface Web:
- **Porta 16686** - **Jaeger UI** - **Acesse aqui para ver traces!**

## 🌐 Como Acessar

### 1. Jaeger UI (Visualização de Traces)

**URL:** http://localhost:16686

**O que você verá:**
- Lista de serviços (credgestor-api, credgestor-frontend)
- Traces de requisições HTTP
- Tempo de execução de cada operação
- Erros e exceções
- Correlação entre frontend e backend

**Como usar:**
1. Abra: http://localhost:16686
2. Selecione o serviço: `credgestor-api` ou `credgestor-frontend`
3. Clique em "Find Traces"
4. Veja os detalhes de cada trace clicando nele

### 2. OpenTelemetry Collector (Apenas para Debug)

**NÃO acesse no navegador!** Esta porta recebe dados via API.

Para verificar se está funcionando:
```bash
# Ver logs do coletor
docker logs otel-collector

# Verificar se está recebendo dados
curl http://localhost:4318/v1/traces
```

### 3. Prometheus Metrics (Se configurado)

**URL:** http://localhost:8889/metrics

**O que você verá:**
- Métricas em formato Prometheus
- Útil para integração com Grafana

## 🔍 Verificação Rápida

### Verificar se Jaeger está rodando:
```bash
docker ps | grep jaeger
```

### Verificar se Collector está rodando:
```bash
docker ps | grep otel-collector
```

### Ver logs para debug:
```bash
# Logs do Jaeger
docker logs jaeger --tail 20

# Logs do Collector
docker logs otel-collector --tail 20
```

## 📝 Resumo das URLs

| Serviço | Porta | URL | Descrição |
|---------|-------|-----|-----------|
| **Jaeger UI** | 16686 | http://localhost:16686 | ✅ **Interface web para visualizar traces** |
| Collector OTLP HTTP | 4318 | http://localhost:4318 | ❌ API endpoint (não acesse no navegador) |
| Collector OTLP gRPC | 4317 | - | ❌ API endpoint (não acesse no navegador) |
| Prometheus Metrics | 8889 | http://localhost:8889/metrics | ✅ Métricas em formato Prometheus |

## 🎯 Próximos Passos

1. **Acesse Jaeger:** http://localhost:16686**
2. Configure o backend para enviar traces (veja `COMO_ACESSAR_OPENTELEMETRY.md`)
3. Faça algumas requisições na aplicação
4. Veja os traces aparecerem no Jaeger!

## ❓ Problemas Comuns

### "404 Not Found" na porta 4318
**Solução:** Isso é normal! A porta 4318 não é uma interface web. Use http://localhost:16686 para ver traces.

### Jaeger não abre
**Solução:**
```bash
# Verificar se está rodando
docker ps | grep jaeger

# Se não estiver, iniciar
docker-compose -f docker-compose-opentelemetry.yml up -d jaeger

# Ver logs
docker logs jaeger
```

### Não aparecem traces no Jaeger
**Solução:**
1. Verifique se o backend está configurado com `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`
2. Verifique se o coletor está recebendo dados: `docker logs otel-collector`
3. Faça algumas requisições na aplicação para gerar traces
