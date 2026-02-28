# 🎯 Guia de Ação SRE - Dashboard CredGestor

## 📊 Como Interpretar e Atuar no Dashboard

### 🟢 **1. Status do Serviço (UP/DOWN)**

**O que monitorar:**
- Status deve estar sempre **UP** (verde)
- Se aparecer **DOWN** (vermelho), o serviço está offline

**Ação imediata:**
```bash
# 1. Verificar logs do container
docker logs <container_api> --tail 100

# 2. Verificar saúde do serviço
curl https://credgestor.app.br/health

# 3. Verificar recursos do sistema
docker stats <container_api>

# 4. Reiniciar se necessário
docker service update --force <service_api>
```

**Alertas recomendados:**
- Alertar se `up{job="credgestor-api"} == 0` por mais de 1 minuto

---

### 📈 **2. Taxa de Requisições (RPS)**

**O que monitorar:**
- **Normal**: 0-10 req/s (baixo tráfego atual)
- **Alto**: >50 req/s (pode indicar pico de uso ou ataque)
- **Muito alto**: >200 req/s (necessita escalar)

**Ação por cenário:**

#### 🟡 RPS > 50 req/s (Pico de tráfego)
```bash
# 1. Verificar quais endpoints estão recebendo mais requisições
# No Grafana Explore:
sum(rate(http_requests_total{job="credgestor-api"}[5m])) by (handler)

# 2. Verificar se há requisições suspeitas
# Verificar logs de acesso
docker logs <container_api> --tail 500 | grep -E "(GET|POST|PUT|DELETE)"

# 3. Considerar habilitar rate limiting se não houver
```

#### 🔴 RPS > 200 req/s (Sobrecarga)
```bash
# 1. Escalar horizontalmente
docker service scale <service_api>=3

# 2. Verificar se há DDoS ou ataque
# Analisar IPs de origem nos logs
docker logs <container_api> --tail 1000 | awk '{print $1}' | sort | uniq -c | sort -rn

# 3. Ativar proteção no Traefik (rate limiting, WAF)
```

**Melhorias:**
- Implementar rate limiting por IP/tenant
- Adicionar cache para endpoints de leitura
- Considerar CDN para assets estáticos

---

### ⚡ **3. Latência P95**

**O que monitorar:**
- **Bom**: <200ms (SLO atual: <500ms)
- **Atenção**: 200-500ms (próximo do limite)
- **Crítico**: >500ms (violação de SLO)

**Ação por cenário:**

#### 🟡 P95 entre 200-500ms
```bash
# 1. Identificar endpoints lentos
# No Grafana Explore:
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="credgestor-api"}[5m])) by (le, handler)) * 1000

# 2. Verificar queries lentas no banco
# Conectar ao PostgreSQL
psql -h <host> -U <user> -d <database>
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# 3. Verificar conexões do banco
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

#### 🔴 P95 > 500ms (Violação de SLO)
```bash
# 1. Verificar CPU e memória
docker stats <container_api>

# 2. Verificar locks no banco
SELECT * FROM pg_locks WHERE NOT granted;

# 3. Verificar queries bloqueadas
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query,
       blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

# 4. Verificar índices faltando
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;
```

**Melhorias:**
- Adicionar índices nas queries mais lentas
- Implementar cache Redis para consultas frequentes
- Otimizar queries N+1
- Considerar paginação em listagens grandes
- Implementar connection pooling adequado

---

### 📊 **4. Taxa de Sucesso (SLO: >99.9%)**

**O que monitorar:**
- **Bom**: >99.9% (dentro do SLO)
- **Atenção**: 99.5-99.9% (próximo do limite)
- **Crítico**: <99.5% (violação de SLO)

**Ação por cenário:**

#### 🟡 Taxa entre 99.5-99.9%
```bash
# 1. Identificar erros por endpoint
# No Grafana Explore:
sum(rate(http_requests_total{job="credgestor-api", status=~"4..|5.."}[5m])) by (handler, status)

# 2. Verificar logs de erro
docker logs <container_api> --tail 500 | grep -i "error\|exception\|traceback"

# 3. Verificar erros no banco
SELECT * FROM pg_stat_database_conflicts;
```

#### 🔴 Taxa < 99.5% (Violação de SLO)
```bash
# 1. Identificar tipo de erro (4xx vs 5xx)
# No Grafana Explore:
sum(rate(http_requests_total{job="credgestor-api", status=~"5.."}[5m])) by (handler)
sum(rate(http_requests_total{job="credgestor-api", status=~"4.."}[5m])) by (handler)

# 2. Para erros 5xx (servidor):
# - Verificar logs de aplicação
docker logs <container_api> --tail 1000 | grep -E "500|502|503|504"

# - Verificar recursos (CPU, memória, disco)
df -h
free -h
top

# - Verificar conexões do banco
SELECT count(*) FROM pg_stat_activity;

# 3. Para erros 4xx (cliente):
# - Verificar validações de entrada
# - Verificar autenticação/autorização
docker logs <container_api> --tail 500 | grep -E "401|403|404|422"
```

**Melhorias:**
- Implementar retry com backoff exponencial
- Adicionar circuit breaker para chamadas externas
- Melhorar tratamento de erros com mensagens claras
- Implementar health checks mais robustos
- Adicionar monitoring de dependências externas

---

### 🚨 **5. Taxa de Erros (4xx e 5xx)**

**O que monitorar:**
- **Erros 5xx**: Devem ser **0** ou muito baixos (<0.1 req/s)
- **Erros 4xx**: Podem ocorrer, mas devem ser monitorados

**Ação por tipo de erro:**

#### 🔴 Erros 5xx (Erros do Servidor)
```bash
# 1. Identificar endpoint com erro
# No Grafana Explore:
sum(rate(http_requests_total{job="credgestor-api", status=~"5.."}[5m])) by (handler, status)

# 2. Verificar logs detalhados
docker logs <container_api> --tail 1000 | grep -A 10 -B 5 "500\|502\|503\|504"

# 3. Verificar recursos
docker stats <container_api>

# 4. Verificar banco de dados
SELECT * FROM pg_stat_activity WHERE state != 'idle';
SELECT * FROM pg_locks WHERE NOT granted;
```

#### 🟡 Erros 4xx (Erros do Cliente)
```bash
# 1. Analisar padrão de erros
# No Grafana Explore:
sum(rate(http_requests_total{job="credgestor-api", status=~"4.."}[5m])) by (handler, status)

# 2. Para 401 (Não autorizado):
# - Verificar tokens expirados
# - Verificar configuração de autenticação

# 3. Para 404 (Não encontrado):
# - Verificar rotas/configuração do Traefik
# - Verificar se recursos foram deletados

# 4. Para 422 (Validação):
# - Verificar logs de validação
docker logs <container_api> --tail 500 | grep -i "validation\|422"
```

**Melhorias:**
- Implementar logging estruturado (JSON)
- Adicionar correlation IDs para rastrear requisições
- Implementar alertas automáticos para erros 5xx
- Melhorar mensagens de erro para 4xx (mais informativas)

---

### 💻 **6. CPU e Memória**

**O que monitorar:**
- **CPU Disponível**: >70% (bom), <30% (atenção)
- **Memória Disponível**: >50% (bom), <20% (crítico)

**Ação por cenário:**

#### 🟡 CPU Disponível < 30%
```bash
# 1. Identificar processos consumindo CPU
docker stats <container_api>

# 2. Verificar threads/workers
# Se usar Gunicorn/Uvicorn, verificar número de workers
docker exec <container_api> ps aux | grep -E "python|uvicorn|gunicorn"

# 3. Considerar escalar horizontalmente
docker service scale <service_api>=2

# 4. Verificar queries lentas no banco (podem causar CPU alto)
```

#### 🔴 Memória Disponível < 20%
```bash
# 1. Verificar uso de memória por container
docker stats

# 2. Verificar vazamentos de memória
# Monitorar crescimento ao longo do tempo
docker stats <container_api> --no-stream

# 3. Verificar conexões do banco (podem consumir memória)
SELECT count(*) FROM pg_stat_activity;

# 4. Limpar cache se necessário
# Reiniciar container (último recurso)
docker service update --force <service_api>

# 5. Aumentar limite de memória do container
# Editar docker-compose.yml
```

**Melhorias:**
- Implementar limites de memória adequados
- Adicionar monitoring de vazamentos de memória
- Otimizar uso de cache
- Implementar garbage collection adequado
- Considerar usar workers assíncronos

---

### 🗄️ **7. Métricas do Banco de Dados**

**O que monitorar:**
- **Conexões Ativas**: <80% do máximo configurado
- **Tamanho do Banco**: Monitorar crescimento
- **Tenants/Usuários**: Monitorar crescimento

**Ação por cenário:**

#### 🟡 Conexões Ativas > 80% do máximo
```bash
# 1. Verificar conexões por aplicação
SELECT application_name, count(*) 
FROM pg_stat_activity 
GROUP BY application_name;

# 2. Verificar conexões idle
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';

# 3. Verificar connection pooling
# Ajustar max_connections no PostgreSQL se necessário
# Ajustar pool_size na aplicação

# 4. Matar conexões idle antigas (cuidado!)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '10 minutes';
```

#### 🔴 Tamanho do Banco crescendo rapidamente
```bash
# 1. Identificar tabelas grandes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

# 2. Verificar se há dados antigos para arquivar
# Implementar política de retenção

# 3. Verificar índices grandes
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 10;

# 4. Considerar particionamento de tabelas grandes
```

**Melhorias:**
- Implementar connection pooling (PgBouncer)
- Adicionar políticas de retenção de dados
- Implementar arquivamento de dados antigos
- Adicionar índices apenas onde necessário
- Considerar read replicas para leituras

---

## 🎯 Playbook de Resposta a Incidentes

### 🔴 **Incidente: Serviço DOWN**

1. **Verificar Status** (1 min)
   ```bash
   curl https://credgestor.app.br/health
   docker service ps <service_api>
   ```

2. **Verificar Logs** (2 min)
   ```bash
   docker logs <container_api> --tail 100
   docker logs <container_traefik> --tail 100
   ```

3. **Verificar Recursos** (1 min)
   ```bash
   docker stats
   df -h
   free -h
   ```

4. **Ação Corretiva**
   - Se OOM: Aumentar memória ou reduzir workers
   - Se crash: Verificar logs e reiniciar
   - Se banco: Verificar conexões e locks

5. **Escalar se necessário**
   ```bash
   docker service scale <service_api>=2
   ```

---

### 🟡 **Incidente: Latência Alta (P95 > 500ms)**

1. **Identificar Endpoint Lento** (2 min)
   ```bash
   # No Grafana Explore
   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="credgestor-api"}[5m])) by (le, handler)) * 1000
   ```

2. **Verificar Banco** (3 min)
   ```bash
   # Queries lentas
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   
   # Locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

3. **Ação Corretiva**
   - Adicionar índice se necessário
   - Otimizar query
   - Matar query bloqueadora se necessário

---

### 🟡 **Incidente: Taxa de Erros Alta (>1%)**

1. **Identificar Tipo de Erro** (1 min)
   ```bash
   # No Grafana Explore
   sum(rate(http_requests_total{job="credgestor-api", status=~"5.."}[5m]))
   sum(rate(http_requests_total{job="credgestor-api", status=~"4.."}[5m]))
   ```

2. **Para 5xx: Verificar Logs** (3 min)
   ```bash
   docker logs <container_api> --tail 500 | grep -E "500|502|503|504"
   ```

3. **Ação Corretiva**
   - Corrigir bug se identificado
   - Reverter deploy se recente
   - Escalar se sobrecarga

---

## 📈 Melhorias Recomendadas

### 🔧 **Infraestrutura**

1. **Auto-scaling**
   - Implementar baseado em CPU/memória
   - Escalar antes de atingir limites

2. **Load Balancing**
   - Distribuir carga entre múltiplas instâncias
   - Health checks adequados

3. **Backup e Disaster Recovery**
   - Backups automáticos do banco
   - Teste de restore regularmente
   - Documentar procedimentos

4. **Monitoring Avançado**
   - APM (Application Performance Monitoring)
   - Distributed tracing
   - Log aggregation (ELK/Loki)

5. **Segurança**
   - WAF no Traefik
   - Rate limiting
   - DDoS protection
   - SSL/TLS adequado

---

### 💻 **Aplicação**

1. **Performance**
   - Cache Redis para consultas frequentes
   - Índices adequados no banco
   - Queries otimizadas (evitar N+1)
   - Paginação em listagens

2. **Resiliência**
   - Retry com backoff exponencial
   - Circuit breaker
   - Timeouts adequados
   - Graceful degradation

3. **Observabilidade**
   - Logging estruturado (JSON)
   - Correlation IDs
   - Métricas customizadas de negócio
   - Tracing distribuído

4. **Qualidade**
   - Testes automatizados
   - Code review
   - Linting e formatação
   - Documentação de APIs

---

### 🗄️ **Banco de Dados**

1. **Performance**
   - Connection pooling (PgBouncer)
   - Read replicas para leituras
   - Particionamento de tabelas grandes
   - Vacuum e analyze regular

2. **Manutenção**
   - Backups automáticos
   - Monitoramento de crescimento
   - Políticas de retenção
   - Índices otimizados

3. **Segurança**
   - Backups criptografados
   - Acesso restrito
   - Auditoria de acesso
   - Rotação de senhas

---

## 🚨 Alertas Recomendados

### Críticos (PagerDuty/On-call)
- `up{job="credgestor-api"} == 0` por >1 min
- Taxa de sucesso < 99% por >5 min
- P95 latência > 1000ms por >5 min
- Erros 5xx > 10/min por >5 min

### Avisos (Email/Slack)
- Taxa de sucesso < 99.5% por >10 min
- P95 latência > 500ms por >10 min
- CPU disponível < 20% por >10 min
- Memória disponível < 20% por >10 min
- Conexões do banco > 80% do máximo

---

## 📝 Checklist Diário

- [ ] Verificar status do serviço (UP/DOWN)
- [ ] Verificar taxa de erros (5xx)
- [ ] Verificar latência P95
- [ ] Verificar uso de recursos (CPU/memória)
- [ ] Verificar conexões do banco
- [ ] Revisar logs de erro
- [ ] Verificar crescimento do banco

## 📝 Checklist Semanal

- [ ] Revisar métricas de SLO
- [ ] Analisar tendências de uso
- [ ] Revisar e otimizar queries lentas
- [ ] Verificar capacidade (escalar se necessário)
- [ ] Revisar e atualizar documentação
- [ ] Teste de backup/restore
