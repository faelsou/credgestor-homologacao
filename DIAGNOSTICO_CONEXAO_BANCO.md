# Diagnóstico de Conexão com Banco de Dados

## Problema Identificado

Os logs do serviço `credgestor_api` não mostram informações sobre:
- Conexões com banco de dados
- Pool de conexões
- Timeouts
- Erros de conexão

Isso dificulta o diagnóstico de problemas de performance e conectividade.

## Análise Atual

### Arquitetura
- A aplicação usa **Supabase** como banco de dados
- O cliente Supabase Python gerencia conexões internamente
- Não há logging explícito de conexões/desconexões
- Não há métricas de pool de conexões

### Comando Executado
```bash
docker service logs credgestor_api --tail 1000 | grep -i "database\|connection\|timeout\|pool"
```

**Resultado**: Nenhum log encontrado relacionado a database, connection, timeout ou pool.

## Recomendações

### 1. Adicionar Logging de Conexões

Adicionar logging no arquivo `backend/supabase_client.py` para rastrear:
- Criação de clientes Supabase
- Tentativas de conexão
- Erros de conexão
- Timeouts

### 2. Adicionar Métricas Prometheus

Criar métricas customizadas para:
- `db_connection_pool_size` - Tamanho do pool de conexões
- `db_connection_errors_total` - Total de erros de conexão
- `db_query_duration_seconds` - Duração de queries
- `db_connection_timeouts_total` - Total de timeouts

### 3. Adicionar Health Check de Banco

Melhorar o endpoint `/health` para verificar:
- Conectividade com Supabase
- Tempo de resposta
- Status do pool de conexões

### 4. Configurar Timeouts Explícitos

Definir timeouts explícitos nas requisições ao Supabase:
- Connection timeout
- Read timeout
- Retry logic

## Scripts de Diagnóstico

### Verificar Conectividade
```bash
# Testar conexão com Supabase via API
curl -X GET "https://<SUPABASE_URL>/rest/v1/" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
```

### Monitorar Logs em Tempo Real
```bash
# Monitorar logs com foco em erros
docker service logs -f credgestor_api | grep -i "error\|exception\|timeout\|failed"

# Monitorar todas as requisições ao banco
docker service logs -f credgestor_api | grep -i "supabase\|query\|select\|insert\|update\|delete"
```

### Verificar Métricas Prometheus
```bash
# Verificar métricas de HTTP (que podem indicar problemas de DB)
curl http://localhost:8000/metrics | grep -i "http_request_duration\|http_requests_total"
```

## Próximos Passos

1. **Adicionar logging estruturado** no `supabase_client.py`
2. **Criar métricas customizadas** para conexões de banco
3. **Melhorar health check** para incluir status do banco
4. **Configurar alertas** no Prometheus/Grafana para problemas de conexão

## Observações

- O Supabase gerencia conexões internamente via HTTP/REST API
- Não há pool de conexões tradicional (como em psycopg2)
- Cada requisição ao Supabase é uma chamada HTTP
- Timeouts podem ocorrer na camada HTTP, não na camada de conexão

## Referências

- [Supabase Python Client](https://github.com/supabase/supabase-py)
- [FastAPI Logging](https://fastapi.tiangolo.com/advanced/logging/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
