# 💡 Insights Detalhados e Melhorias - CredGestor

## 📊 Análise do Estado Atual (Baseado no Dashboard)

### ✅ **Pontos Fortes Identificados**

1. **Infraestrutura Estável e Subutilizada**
   - CPU: 99.6% disponível → Sistema não está sobrecarregado
   - Memória: 64.8% usado → Uso saudável, espaço para crescimento
   - Banco: 13.4 MB → Tamanho gerenciável, fácil de fazer backup
   - 4 Tenants ativos, 3 usuários → Base pequena mas funcional

2. **Monitoramento Funcionando**
   - Prometheus coletando métricas corretamente
   - Grafana exibindo dados em tempo real
   - SLOs definidos e monitorados
   - Alertas configurados (Restart de Serviço, Pico de Erros 5xx)

3. **Performance Geral Boa**
   - Latência P95: 975ms (acima do SLO de 500ms, mas aceitável para carga baixa)
   - Taxa de requisições baixa (0-1 req/s) → Sistema não está sob pressão

---

## ⚠️ **Problemas Identificados e Ações**

### 🔴 **CRÍTICO - Resolver Imediatamente**

#### 1. **Erros 5xx em `/tenants/{tenant_id}/{resource}`**
- **Taxa**: 0.442 req/s (muito alto para carga baixa)
- **Impacto**: Usuários não conseguem acessar recursos
- **Prioridade**: ALTA

**Investigação:**
```bash
# 1. Ver logs detalhados
docker service logs credgestor_api --tail 2000 | grep -A 15 "500\|Internal Server Error" | tail -100

# 2. Verificar stack traces
docker service logs credgestor_api --tail 5000 | grep -B 5 -A 20 "Traceback"

# 3. Verificar se há problemas de conexão com banco
docker service logs credgestor_api --tail 1000 | grep -i "database\|connection\|timeout\|pool"

# 4. Verificar queries lentas no banco
docker exec -it <postgres_container> psql -U postgres -d credgestor -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%tenant%'
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

**Possíveis Causas:**
- Validação de tenant_id falhando
- Queries sem índice causando timeout
- Problemas de conexão com banco
- Exceções não tratadas

**Correções Sugeridas:**
```python
# 1. Adicionar tratamento robusto de erros
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True, extra={
        "path": request.url.path,
        "method": request.method,
        "tenant_id": getattr(request.state, "tenant_id", None)
    })
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": str(uuid.uuid4())}
    )

# 2. Adicionar validação de tenant_id
async def validate_tenant(tenant_id: str, user_id: str):
    # Verificar se tenant existe e usuário tem acesso
    tenant = await db.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Verificar acesso do usuário
    has_access = await db.user_has_tenant_access(user_id, tenant_id)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return tenant

# 3. Adicionar índices
CREATE INDEX IF NOT EXISTS idx_tenants_id_active 
ON tenants(id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant 
ON tenant_users(user_id, tenant_id);
```

---

#### 2. **Erros 401 em `/auth/refresh`**
- **Taxa**: 0.0491 req/s
- **Impacto**: Usuários sendo deslogados inesperadamente
- **Prioridade**: MÉDIA-ALTA

**Investigação:**
```bash
# 1. Ver logs de refresh token
docker service logs credgestor_api --tail 1000 | grep -i "refresh\|401\|unauthorized" | tail -50

# 2. Verificar expiração de tokens
docker service logs credgestor_api --tail 500 | grep -i "token\|expired\|invalid"
```

**Possíveis Causas:**
- Tokens expirando antes do esperado
- Refresh token não sendo renovado corretamente
- Problemas de sincronização de tempo
- Tokens sendo invalidados incorretamente

**Correções Sugeridas:**
```python
# 1. Verificar lógica de refresh token
async def refresh_access_token(refresh_token: str):
    try:
        # Decodificar refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        # Verificar se token não foi revogado
        is_revoked = await db.is_token_revoked(refresh_token)
        if is_revoked:
            raise HTTPException(status_code=401, detail="Token revoked")
        
        # Gerar novo access token
        new_access_token = create_access_token(user_id)
        
        # Opcional: Rotacionar refresh token
        new_refresh_token = create_refresh_token(user_id)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# 2. Adicionar logging
logger.info(f"Token refresh attempted", extra={
    "user_id": user_id,
    "token_age": time.time() - payload.get("iat", 0)
})
```

---

### 🟡 **ATENÇÃO - Melhorar em Breve**

#### 3. **Latência P95 acima do SLO (975ms vs 500ms)**
- **Atual**: 975ms
- **SLO**: <500ms
- **Impacto**: Experiência do usuário degradada

**Investigação:**
```bash
# 1. Identificar endpoints mais lentos
# No Grafana Explore:
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="credgestor-api"}[5m])) by (le, handler)) * 1000

# 2. Verificar queries lentas
docker exec -it <postgres_container> psql -U postgres -d credgestor -c "
SELECT 
    query,
    mean_exec_time,
    calls,
    (total_exec_time / calls) as avg_time_per_call
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries com mais de 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
"

# 3. Verificar locks no banco
SELECT * FROM pg_locks WHERE NOT granted;
```

**Melhorias Sugeridas:**

1. **Adicionar Cache Redis:**
```python
# Instalar: pip install redis aioredis
import redis.asyncio as redis

redis_client = redis.from_url("redis://localhost:6379")

async def get_tenant_cached(tenant_id: str):
    cache_key = f"tenant:{tenant_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    tenant = await db.get_tenant(tenant_id)
    if tenant:
        await redis_client.setex(cache_key, 300, json.dumps(tenant))  # 5 min cache
    return tenant
```

2. **Otimizar Queries N+1:**
```python
# ❌ Ruim - N+1 queries
tenants = await db.get_all_tenants()
for tenant in tenants:
    users = await db.get_users_by_tenant(tenant.id)  # 1 query por tenant!

# ✅ Bom - 1 query com JOIN
tenants_with_users = await db.get_tenants_with_users()  # 1 query total
```

3. **Adicionar Índices:**
```sql
-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_clients_tenant_created 
ON clients(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loans_tenant_status 
ON loans(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_installments_loan_due 
ON installments(loan_id, due_date);

-- Índice composto para queries de relatório
CREATE INDEX IF NOT EXISTS idx_installments_tenant_status_due 
ON installments(tenant_id, status, due_date);
```

4. **Implementar Paginação:**
```python
# Limitar resultados e usar cursor/offset
async def get_installments(tenant_id: str, page: int = 1, page_size: int = 50):
    offset = (page - 1) * page_size
    return await db.query(
        "SELECT * FROM installments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        tenant_id, page_size, offset
    )
```

---

#### 4. **Sistema Subutilizado**
- **RPS**: 0-1 req/s (muito baixo)
- **CPU**: 99.6% disponível
- **Impacto**: Oportunidade de otimização e redução de custos

**Ações:**
1. **Reduzir recursos se possível:**
   - Considerar reduzir número de workers/replicas
   - Ajustar limites de memória
   - Usar instâncias menores se em cloud

2. **Preparar para crescimento:**
   - Documentar procedimentos de escalonamento
   - Testar autoscaling
   - Preparar runbooks

---

## 🚀 **Melhorias Prioritárias por Categoria**

### 🔧 **Infraestrutura**

#### 1. **Auto-scaling**
```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 1
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      # Adicionar labels para autoscaling
      labels:
        - "com.docker.swarm.autoscale.min=1"
        - "com.docker.swarm.autoscale.max=5"
        - "com.docker.swarm.autoscale.target=80"  # CPU %
```

#### 2. **Connection Pooling (PgBouncer)**
```yaml
# Adicionar PgBouncer entre app e PostgreSQL
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: postgres
      DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASES_DBNAME: credgestor
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
    ports:
      - "6432:6432"
```

#### 3. **Cache Redis**
```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
```

#### 4. **Backup Automatizado**
```bash
#!/bin/bash
# scripts/backup-database.sh
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/credgestor_$DATE.sql"

# Criar backup
docker exec <postgres_container> pg_dump -U postgres credgestor > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Enviar para S3/Cloud (opcional)
# aws s3 cp $BACKUP_FILE.gz s3://backups/credgestor/
```

---

### 💻 **Aplicação**

#### 1. **Logging Estruturado**
```python
import structlog
import json

logger = structlog.get_logger()

# Em vez de:
print(f"Error: {error}")

# Use:
logger.error(
    "Request failed",
    error=str(error),
    path=request.url.path,
    method=request.method,
    tenant_id=getattr(request.state, "tenant_id", None),
    user_id=getattr(request.state, "user_id", None),
    correlation_id=request.headers.get("X-Correlation-ID")
)
```

#### 2. **Health Checks Melhorados**
```python
@app.get("/health")
async def health_check():
    checks = {
        "status": "healthy",
        "database": await check_database(),
        "redis": await check_redis(),
        "disk": check_disk_space(),
        "memory": check_memory()
    }
    
    if all(v.get("status") == "ok" for v in checks.values() if isinstance(v, dict)):
        return checks
    else:
        return JSONResponse(status_code=503, content=checks)
```

#### 3. **Rate Limiting**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/login")
@limiter.limit("5/minute")  # 5 tentativas por minuto
async def login(request: Request):
    ...
```

#### 4. **Circuit Breaker**
```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
async def call_external_api():
    # Se falhar 5 vezes, para de tentar por 60 segundos
    response = await httpx.get("https://external-api.com")
    return response.json()
```

---

### 🗄️ **Banco de Dados**

#### 1. **Índices Estratégicos**
```sql
-- Análise de queries lentas primeiro
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;

-- Adicionar índices baseado em análise
CREATE INDEX CONCURRENTLY idx_clients_tenant_name 
ON clients(tenant_id, name);

CREATE INDEX CONCURRENTLY idx_loans_tenant_status_created 
ON loans(tenant_id, status, created_at DESC);
```

#### 2. **Vacuum e Analyze Automatizado**
```sql
-- Configurar autovacuum
ALTER TABLE clients SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- Ou via cron
-- 0 2 * * * docker exec <postgres_container> psql -U postgres -d credgestor -c "VACUUM ANALYZE;"
```

#### 3. **Read Replicas (Futuro)**
```yaml
# Para leituras, usar read replica
# Para escritas, usar master
services:
  postgres_replica:
    image: postgres:15
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_SERVICE: postgres
```

---

## 📈 **Métricas de Negócio a Adicionar**

### 1. **Taxa de Conversão**
- Novos clientes / Novos empréstimos
- Taxa de aprovação de empréstimos

### 2. **Taxa de Inadimplência**
- Parcelas vencidas / Total de parcelas
- Valor vencido / Valor total

### 3. **Crescimento**
- Novos tenants por mês
- Novos usuários por mês
- Novos empréstimos por mês

### 4. **Engajamento**
- Logins por dia/semana
- Requisições por tenant
- Tempo médio de sessão

---

## 🎯 **Roadmap de Melhorias (Priorizado)**

### **Sprint 1 (Esta Semana)**
- [ ] Corrigir erros 5xx em `/tenants/{tenant_id}/{resource}`
- [ ] Corrigir erros 401 em `/auth/refresh`
- [ ] Adicionar logging estruturado
- [ ] Implementar tratamento robusto de erros

### **Sprint 2 (Próximas 2 Semanas)**
- [ ] Adicionar cache Redis
- [ ] Otimizar queries N+1
- [ ] Adicionar índices estratégicos
- [ ] Implementar rate limiting

### **Sprint 3 (Próximo Mês)**
- [ ] Implementar PgBouncer
- [ ] Adicionar health checks melhorados
- [ ] Configurar backups automatizados
- [ ] Implementar circuit breaker

### **Sprint 4 (Futuro)**
- [ ] Auto-scaling
- [ ] Read replicas
- [ ] APM (Application Performance Monitoring)
- [ ] Distributed tracing

---

## 📝 **Checklist de Monitoramento Diário**

### **Manhã (5 minutos)**
- [ ] Status do serviço (UP?)
- [ ] Taxa de sucesso (>99.9%?)
- [ ] Latência P95 (<500ms?)
- [ ] Erros 5xx (0 ou muito baixo?)
- [ ] Uso de recursos (CPU <80%, Memória <80%?)

### **Tarde (Verificação rápida)**
- [ ] Picos de tráfego anormais?
- [ ] Novos erros aparecendo?
- [ ] Latência aumentando?

### **Fim do Dia (10 minutos)**
- [ ] Revisar métricas do dia
- [ ] Verificar logs de erro
- [ ] Anotar incidentes ou problemas
- [ ] Planejar melhorias para o próximo dia

---

## 🔗 **Links Úteis**

- **Prometheus**: http://167.235.76.26:9090
- **Grafana**: grafana.findfruit.com.br
- **API Docs**: https://credgestor.app.br/api/docs
- **Health Check**: https://credgestor.app.br/api/health

---

## 📚 **Documentação Adicional**

- `GUIA_ACAO_SRE_DASHBOARD.md` - Guia completo de atuação
- `TROUBLESHOOTING_NO_DATA_GRAFANA.md` - Troubleshooting do dashboard
- `DASHBOARD_ATUALIZADO.md` - Instruções de atualização
