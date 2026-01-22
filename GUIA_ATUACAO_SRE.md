# 🎯 Guia de Atuação SRE - CredGestor Dashboard

## 📊 Interpretação dos Painéis e Ações

### 1. 🟢 Status do Serviço

**O que monitorar:**
- Status UP/DOWN do serviço `credgestor-api`

**Quando atuar:**
- ⚠️ **DOWN**: Investigar imediatamente
  - Verificar logs: `docker logs <container_api> --tail 100`
  - Verificar saúde do container: `docker ps | grep api`
  - Verificar recursos (CPU/Memória)
  - Verificar conectividade com banco de dados

**Ações:**
```bash
# Verificar status do serviço
docker service ps credgestor_api --no-trunc

# Ver logs recentes
docker service logs credgestor_api --tail 100 --follow

# Verificar saúde
curl https://credgestor.app.br/health
```

---

### 2. 📊 Taxa de Sucesso (SLO)

**O que monitorar:**
- SLO: >99.9% de requisições bem-sucedidas (status 2xx)
- Gauge mostra porcentagem atual

**Quando atuar:**
- 🟡 **99.5% - 99.9%**: Atenção - Investigar causas
- 🔴 **<99.5%**: Crítico - Ação imediata

**Ações:**
```bash
# Verificar erros recentes
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m]))"

# Verificar erros por handler
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m])) by (handler)"

# Ver logs de erros
docker service logs credgestor_api --tail 500 | grep -i error
```

**Melhorias:**
- Implementar retry automático para falhas transitórias
- Adicionar circuit breaker para dependências externas
- Melhorar tratamento de erros com mensagens mais descritivas
- Implementar rate limiting para prevenir abuso

---

### 3. ⚡ Latência P95

**O que monitorar:**
- SLO: P95 < 500ms
- Latência do percentil 95 (95% das requisições são mais rápidas que isso)

**Quando atuar:**
- 🟡 **200-500ms**: Atenção - Otimizar queries/processamento
- 🔴 **>500ms**: Crítico - Investigar gargalos

**Ações:**
```bash
# Ver latência por handler
curl -s "http://167.235.76.26:9090/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"credgestor-api\"}[5m])) by (le, handler)) * 1000"

# Identificar handlers mais lentos
# Verificar queries lentas no banco
docker exec -it <postgres_container> psql -U postgres -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

**Melhorias:**
- **Banco de Dados:**
  - Adicionar índices em colunas frequentemente consultadas
  - Otimizar queries N+1
  - Implementar cache para queries frequentes
  - Usar connection pooling adequado
  - Considerar read replicas para leituras

- **Aplicação:**
  - Implementar cache Redis para dados frequentemente acessados
  - Otimizar serialização JSON (usar orjson ao invés de json padrão)
  - Implementar paginação eficiente
  - Usar async/await corretamente para operações I/O
  - Considerar background jobs para processamento pesado

---

### 4. 📈 Taxa de Requisições (RPS)

**O que monitorar:**
- Requisições por segundo (tráfego)
- Identificar picos e padrões de uso

**Quando atuar:**
- 📈 **Pico súbito**: Verificar se é ataque ou tráfego legítimo
- 📉 **Queda abrupta**: Verificar se há problema de conectividade
- 🔄 **Padrão anormal**: Investigar mudanças de comportamento

**Ações:**
```bash
# Ver tráfego atual
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\"}[5m]))"

# Ver tráfego por handler
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\"}[5m])) by (handler)"

# Verificar se há rate limiting configurado
```

**Melhorias:**
- Implementar rate limiting por IP/tenant
- Configurar autoscaling baseado em RPS
- Implementar CDN para assets estáticos
- Considerar load balancing se RPS > 1000

---

### 5. 🚨 Golden Signal: Taxa de Erros

**O que monitorar:**
- Erros 4xx (client errors) e 5xx (server errors)
- Identificar padrões e handlers problemáticos

**Quando atuar:**
- 🔴 **5xx > 1%**: Crítico - Investigar imediatamente
- 🟡 **4xx > 10%**: Atenção - Verificar validações/autenticação
- 📊 **Padrão crescente**: Investigar causa raiz

**Ações:**
```bash
# Ver erros 5xx por handler
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"5..\"}[5m])) by (handler, status)"

# Ver erros 4xx por handler
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"credgestor-api\", status=~\"4..\"}[5m])) by (handler, status)"

# Ver logs de erros específicos
docker service logs credgestor_api --tail 1000 | grep -E "(ERROR|Exception|Traceback)"
```

**Melhorias:**
- **5xx Errors:**
  - Melhorar tratamento de exceções
  - Adicionar retry com backoff exponencial
  - Implementar circuit breaker
  - Melhorar validação de entrada
  - Adicionar health checks mais robustos

- **4xx Errors:**
  - Melhorar mensagens de erro para clientes
  - Validar entrada mais cedo no pipeline
  - Implementar autenticação mais robusta
  - Adicionar rate limiting para prevenir abuso

---

### 6. 📊 Golden Signal: Saturação

**O que monitorar:**
- Requisições em progresso (concorrência)
- Indica capacidade do sistema

**Quando atuar:**
- 🔴 **>80% da capacidade**: Crítico - Escalar ou otimizar
- 🟡 **>60% da capacidade**: Atenção - Planejar escalonamento

**Ações:**
```bash
# Ver requisições em progresso
curl -s "http://167.235.76.26:9090/api/v1/query?query=sum(http_requests_inprogress{job=\"credgestor-api\"}) by (handler)"

# Verificar workers/threads da aplicação
docker exec -it <api_container> ps aux | grep -i python
```

**Melhorias:**
- Ajustar número de workers/threads da aplicação
- Implementar queue para processamento assíncrono
- Considerar horizontal scaling
- Otimizar processamento síncrono pesado

---

### 7. 💻 CPU Disponível

**O que monitorar:**
- CPU disponível nos containers
- CPU do sistema

**Quando atuar:**
- 🔴 **<10% disponível**: Crítico - Escalar ou otimizar
- 🟡 **<30% disponível**: Atenção - Monitorar de perto

**Ações:**
```bash
# Ver uso de CPU por container
docker stats --no-stream

# Ver processos que mais usam CPU
docker exec -it <api_container> top -b -n 1 | head -20
```

**Melhorias:**
- **Se CPU alto:**
  - Otimizar algoritmos ineficientes
  - Implementar cache para reduzir processamento
  - Mover processamento pesado para background jobs
  - Considerar usar linguagens mais eficientes para partes críticas

- **Se CPU muito baixo (como agora - 99.6% disponível):**
  - Considerar reduzir recursos alocados (economia de custos)
  - Verificar se há gargalos em I/O ao invés de CPU
  - Otimizar para usar mais CPU se necessário (paralelização)

---

### 8. 🧠 Memória Disponível

**O que monitorar:**
- Memória disponível nos containers
- Memória do sistema

**Quando atuar:**
- 🔴 **<10% disponível**: Crítico - Escalar ou otimizar
- 🟡 **<20% disponível**: Atenção - Investigar vazamentos

**Ações:**
```bash
# Ver uso de memória
docker stats --no-stream

# Verificar vazamentos de memória
docker exec -it <api_container> python -c "import gc; print(len(gc.get_objects()))"

# Verificar processos que mais usam memória
docker exec -it <api_container> ps aux --sort=-%mem | head -10
```

**Melhorias:**
- **Se memória alta:**
  - Investigar vazamentos de memória
  - Implementar cache com TTL e limites
  - Limitar tamanho de queries/respostas
  - Usar streaming para dados grandes
  - Considerar garbage collection tuning

- **Se memória muito baixa (como agora - 64.8% usado):**
  - Pode reduzir limites de memória se não necessário
  - Verificar se há cache suficiente configurado
  - Considerar aumentar cache se performance for prioridade

---

### 9. 🗄️ Conexões Ativas no Banco

**O que monitorar:**
- Número de conexões ativas no PostgreSQL
- Comparar com limite máximo de conexões

**Quando atuar:**
- 🔴 **>80% do limite**: Crítico - Otimizar ou aumentar limite
- 🟡 **>60% do limite**: Atenção - Monitorar padrão

**Ações:**
```bash
# Ver conexões ativas
docker exec -it <postgres_container> psql -U postgres -c "
SELECT count(*) as active_connections,
       (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
       round(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as percent_used
FROM pg_stat_activity
WHERE datname = current_database();
"

# Ver conexões por estado
docker exec -it <postgres_container> psql -U postgres -c "
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state;
"
```

**Melhorias:**
- Implementar connection pooling (PgBouncer ou similar)
- Fechar conexões adequadamente (usar context managers)
- Reduzir tempo de queries longas
- Considerar read replicas para leituras
- Implementar retry com backoff para conexões

---

### 10. 💾 Tamanho do Banco de Dados

**O que monitorar:**
- Tamanho total do banco de dados
- Crescimento ao longo do tempo

**Quando atuar:**
- 📈 **Crescimento acelerado**: Investigar se há dados desnecessários
- 💾 **Próximo do limite de disco**: Planejar limpeza ou expansão

**Ações:**
```bash
# Ver tamanho do banco
docker exec -it <postgres_container> psql -U postgres -c "
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();
"

# Ver tamanho por tabela
docker exec -it <postgres_container> psql -U postgres -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Melhorias:**
- Implementar arquivamento de dados antigos
- Adicionar índices apenas onde necessário (índices ocupam espaço)
- Implementar particionamento de tabelas grandes
- Limpar dados temporários regularmente
- Considerar compressão para dados históricos
- Implementar backup e restore eficientes

---

### 11. 🏢 Tenants Ativos / 👥 Usuários Ativos

**O que monitorar:**
- Crescimento de tenants e usuários
- Padrões de uso

**Quando atuar:**
- 📈 **Crescimento rápido**: Planejar escalabilidade
- 📉 **Queda súbita**: Investigar problemas de onboarding

**Melhorias:**
- Implementar analytics de uso por tenant
- Otimizar onboarding de novos tenants
- Implementar limites por tenant (rate limiting, quotas)
- Considerar multi-tenancy eficiente (row-level security)

---

## 🎯 Insights e Melhorias Prioritárias

### 🔴 Crítico (Fazer Agora)

1. **Erros 5xx Presentes:**
   - Dashboard mostra `5xx - 500 /tenants/{tenant_id}/{resource}` com `0.442 req/s`
   - **Ação:** Investigar logs e corrigir erros
   - **Melhoria:** Implementar tratamento de erros mais robusto

2. **Erros 4xx (401) em /auth/refresh:**
   - `4xx - 401 /auth/refresh` com `0.0491 req/s`
   - **Ação:** Verificar lógica de refresh token
   - **Melhoria:** Implementar refresh token mais robusto

### 🟡 Importante (Fazer em Breve)

1. **Otimização de Performance:**
   - Aplicação com carga muito baixa (oportunidade de otimizar)
   - **Melhoria:** Implementar cache Redis
   - **Melhoria:** Otimizar queries do banco de dados
   - **Melhoria:** Adicionar índices onde necessário

2. **Monitoramento Avançado:**
   - **Melhoria:** Adicionar alertas no Grafana
   - **Melhoria:** Implementar tracing distribuído (Jaeger/Zipkin)
   - **Melhoria:** Adicionar logs estruturados (ELK/Loki)

3. **Segurança:**
   - **Melhoria:** Implementar rate limiting
   - **Melhoria:** Adicionar WAF (Web Application Firewall)
   - **Melhoria:** Implementar autenticação 2FA

### 🟢 Melhorias de Longo Prazo

1. **Escalabilidade:**
   - **Melhoria:** Implementar autoscaling horizontal
   - **Melhoria:** Considerar Kubernetes se necessário
   - **Melhoria:** Implementar CDN para assets

2. **Resiliência:**
   - **Melhoria:** Implementar circuit breaker
   - **Melhoria:** Adicionar retry com backoff
   - **Melhoria:** Implementar graceful degradation

3. **Observabilidade:**
   - **Melhoria:** Adicionar APM (Application Performance Monitoring)
   - **Melhoria:** Implementar distributed tracing
   - **Melhoria:** Adicionar business metrics dashboard

---

## 📋 Checklist de Ações Imediatas

- [ ] Investigar e corrigir erros 5xx (500) em `/tenants/{tenant_id}/{resource}`
- [ ] Corrigir erros 401 em `/auth/refresh`
- [ ] Implementar cache Redis para queries frequentes
- [ ] Adicionar índices no banco de dados
- [ ] Configurar alertas no Grafana para SLOs críticos
- [ ] Implementar rate limiting
- [ ] Otimizar queries lentas identificadas
- [ ] Melhorar tratamento de erros com mensagens descritivas
- [ ] Implementar health checks mais robustos
- [ ] Configurar backup automático do banco de dados

---

## 🔧 Comandos Úteis para Diagnóstico

```bash
# Ver status geral dos serviços
docker service ls

# Ver logs em tempo real
docker service logs credgestor_api --follow --tail 100

# Ver métricas do Prometheus
curl -s "http://167.235.76.26:9090/api/v1/query?query=up{job=\"credgestor-api\"}"

# Ver erros recentes
docker service logs credgestor_api --tail 1000 | grep -i error

# Verificar saúde da API
curl https://credgestor.app.br/health

# Ver uso de recursos
docker stats --no-stream

# Verificar conexões do banco
docker exec -it <postgres_container> psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
```

---

## 📊 Métricas de Negócio a Monitorar

Além das métricas técnicas, monitore:

1. **Crescimento:**
   - Novos tenants por mês
   - Novos usuários por mês
   - Novos clientes/empréstimos por dia

2. **Engajamento:**
   - Taxa de login diário
   - Requisições por tenant
   - Tempo médio de sessão

3. **Qualidade:**
   - Taxa de conversão (se aplicável)
   - Taxa de retenção de tenants
   - Satisfação do cliente (NPS)

---

## 🚨 Alertas Recomendados

Configure alertas no Grafana para:

1. **Crítico:**
   - Serviço DOWN
   - Taxa de sucesso < 99.5%
   - Latência P95 > 500ms
   - Erros 5xx > 1% do tráfego
   - CPU disponível < 10%
   - Memória disponível < 10%

2. **Atenção:**
   - Taxa de sucesso < 99.9%
   - Latência P95 > 200ms
   - Erros 4xx > 10% do tráfego
   - Conexões do banco > 60% do limite
   - Crescimento de erros > 50% em 5 minutos
