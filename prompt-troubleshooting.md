# 🔍 Prompt Troubleshooting - CredGestor

## 📋 Visão Geral

Este documento contém todos os casos de troubleshooting já resolvidos e que ainda podem ocorrer na aplicação CredGestor, organizados por área de especialização.

**Aplicação**: CredGestor - Sistema de Gestão de Crédito Multi-Tenancy  
**VPS**: 167.235.76.26  
**Stack**: Docker Swarm, Traefik, FastAPI, React, Supabase

---

## 🐳 Especialista em Containers

### ✅ Casos Já Resolvidos

#### 1. Serviço Docker Swarm Não Inicia
**Sintoma**: `docker service ls` mostra serviço com 0/1 replicas  
**Causa**: Imagem não encontrada, configuração incorreta, ou recursos insuficientes  
**Resolução**:
```bash
# Verificar status
docker service ls
docker service ps credgestor_api --no-trunc

# Ver logs de erro
docker service logs credgestor_api --tail 100

# Verificar imagem
docker images | grep credgestor

# Recriar serviço
docker service update --force credgestor_api
```

#### 2. Container Reiniciando Constantemente
**Sintoma**: `docker service ps` mostra múltiplos restarts  
**Causa**: Health check falhando, erro na aplicação, ou falta de recursos  
**Resolução**:
```bash
# Ver logs detalhados
docker service logs credgestor_api --tail 500 | grep -i "error\|exception\|traceback"

# Verificar recursos
docker stats

# Verificar health check
docker service inspect credgestor_api --format '{{.Spec.TaskTemplate.ContainerSpec.Healthcheck}}'

# Reiniciar serviço
docker service update --force credgestor_api
```

#### 3. Traefik Não Roteia `/api` para Backend
**Sintoma**: `curl https://credgestor.app.br/api/health` retorna HTML do frontend  
**Causa**: Labels do Traefik não aplicadas no Docker Swarm  
**Resolução**:
```bash
# Verificar labels
docker service inspect credgestor_api --format '{{range $k, $v := .Spec.TaskTemplate.ContainerSpec.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik

# Recriar stack
docker stack rm credgestor
sleep 10
cd /var/www/credgestor-homologacao
source .env
docker stack deploy -c docker-compose.yml credgestor
```

#### 4. Serviço com Alto Uso de Recursos
**Sintoma**: CPU ou memória acima de 80%  
**Causa**: Vazamento de memória, queries lentas, ou carga alta  
**Resolução**:
```bash
# Verificar recursos em tempo real
docker stats

# Ver logs de performance
docker service logs credgestor_api --tail 1000 | grep -i "slow\|timeout\|memory"

# Escalar serviço
docker service scale credgestor_api=2
```

### ⚠️ Casos que Podem Ocorrer

#### 1. Container Não Consegue Conectar na Rede Docker
**Sintoma**: Erro de conexão entre containers  
**Diagnóstico**:
```bash
# Verificar rede
docker network ls
docker network inspect network_public

# Verificar se serviço está na rede correta
docker service inspect credgestor_api --format '{{.Spec.TaskTemplate.Networks}}'
```

#### 2. Volume Docker Não Montado
**Sintoma**: Erro de acesso a arquivos ou dados não persistem  
**Diagnóstico**:
```bash
# Verificar volumes
docker volume ls
docker service inspect credgestor_api --format '{{.Spec.TaskTemplate.ContainerSpec.Mounts}}'
```

#### 3. Health Check Falhando
**Sintoma**: Container marcado como unhealthy  
**Diagnóstico**:
```bash
# Verificar health check
docker service ps credgestor_api --format "table {{.Name}}\t{{.CurrentState}}\t{{.Error}}"

# Testar health check manualmente
curl http://localhost:8000/health
```

#### 4. Rollback Necessário Após Update
**Sintoma**: Nova versão causou problemas  
**Resolução**:
```bash
# Ver histórico de updates
docker service ps credgestor_api --no-trunc

# Fazer rollback
docker service rollback credgestor_api

# Verificar status
docker service ls
```

---

## 🖥️ Especialista em Infraestrutura

### ✅ Casos Já Resolvidos

#### 1. API Não Acessível Via Traefik
**Sintoma**: `curl https://credgestor.app.br/api/health` retorna erro  
**Causa**: Traefik não configurado ou labels incorretas  
**Resolução**:
```bash
# Verificar Traefik
docker service ls | grep traefik
docker service logs traefik --tail 100

# Verificar configuração
docker service inspect traefik --format '{{.Spec.TaskTemplate.ContainerSpec.Config}}'

# Usar IP direto temporariamente
curl http://167.235.76.26:8000/health
```

#### 2. Certificado SSL Expirado ou Inválido
**Sintoma**: Aviso de certificado inválido no navegador  
**Causa**: Certificado Let's Encrypt expirado ou não renovado  
**Resolução**:
```bash
# Verificar certificado
curl -vI https://credgestor.app.br 2>&1 | grep -i certificate

# Verificar Traefik logs
docker service logs traefik --tail 200 | grep -i "certificate\|acme\|ssl"
```

#### 3. Recursos do Sistema Esgotados
**Sintoma**: Sistema lento, processos travando  
**Causa**: CPU, memória ou disco cheio  
**Resolução**:
```bash
# Verificar recursos
top
htop
df -h
free -h

# Verificar processos
ps aux --sort=-%mem | head -20
ps aux --sort=-%cpu | head -20

# Limpar espaço em disco
docker system prune -a --volumes
```

#### 4. Firewall Bloqueando Conexões
**Sintoma**: Não consegue acessar serviços externamente  
**Causa**: UFW ou iptables bloqueando portas  
**Resolução**:
```bash
# Verificar firewall
ufw status
iptables -L -n

# Verificar portas abertas
netstat -tulpn
ss -tulpn
```

### ⚠️ Casos que Podem Ocorrer

#### 1. DNS Não Resolve
**Sintoma**: `nslookup credgestor.app.br` falha  
**Diagnóstico**:
```bash
# Verificar DNS
nslookup credgestor.app.br
dig credgestor.app.br

# Verificar configuração DNS
cat /etc/resolv.conf
```

#### 2. Rede Docker com Problemas
**Sintoma**: Containers não conseguem se comunicar  
**Diagnóstico**:
```bash
# Verificar rede
docker network ls
docker network inspect network_public

# Verificar conectividade
docker exec -it $(docker ps -q -f name=credgestor_api) ping credgestor_site
```

#### 3. Logs do Sistema Cheios
**Sintoma**: `/var/log` com pouco espaço  
**Diagnóstico**:
```bash
# Verificar tamanho de logs
du -sh /var/log/*
journalctl --disk-usage

# Limpar logs antigos
journalctl --vacuum-time=7d
```

#### 4. Serviços do Sistema Não Iniciam
**Sintoma**: Docker ou outros serviços não iniciam após reboot  
**Diagnóstico**:
```bash
# Verificar status de serviços
systemctl status docker
systemctl status traefik

# Ver logs de sistema
journalctl -xe
journalctl -u docker -f
```

---

## 🗄️ Especialista em Banco de Dados

### ✅ Casos Já Resolvidos

#### 1. Muitas Conexões Ativas
**Sintoma**: Erro "too many connections" ou performance degradada  
**Causa**: Connection pool esgotado ou conexões não fechadas  
**Resolução**:
```sql
-- Verificar conexões
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'postgres';

-- Ver conexões por aplicação
SELECT application_name, COUNT(*) 
FROM pg_stat_activity 
WHERE datname = 'postgres'
GROUP BY application_name;

-- Matar conexões idle in transaction
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND datname = 'postgres';
```

#### 2. Queries Lentas
**Sintoma**: Endpoints demorando muito para responder  
**Causa**: Queries sem índices, N+1 queries, ou tabelas grandes  
**Resolução**:
```sql
-- Ver queries lentas
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verificar índices faltando
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

#### 3. Locks e Deadlocks
**Sintoma**: Queries travando ou timeout  
**Causa**: Transações longas ou locks não liberados  
**Resolução**:
```sql
-- Ver locks ativos
SELECT 
  l.locktype,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.query,
  a.pid
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;

-- Ver deadlocks
SELECT * FROM pg_stat_database_conflicts;

-- Matar processo travado
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = <PID_DO_PROCESSO>;
```

#### 4. Tabelas Sem Índices
**Sintoma**: Queries muito lentas em tabelas específicas  
**Causa**: Falta de índices em colunas frequentemente consultadas  
**Resolução**:
```sql
-- Criar índices estratégicos
CREATE INDEX idx_tenants_ativo ON tenants(ativo) WHERE ativo = true;
CREATE INDEX idx_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_clients_tenant_created ON clients(tenant_id, created_at);
CREATE INDEX idx_loans_tenant_status ON loans(tenant_id, status);
CREATE INDEX idx_installments_due_date ON installments(due_date) WHERE status != 'paid';

-- Verificar uso de índices
SELECT 
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### ⚠️ Casos que Podem Ocorrer

#### 1. Timeout de Conexão com Supabase
**Sintoma**: Erro "connection timeout" ou "connection refused"  
**Diagnóstico**:
```bash
# Testar conectividade
psql -h db.aclyrcuahiujgtjuimoh.supabase.co -U postgres -d postgres -c "SELECT 1;"

# Verificar logs da aplicação
docker service logs credgestor_api --tail 1000 | grep -i "database\|connection\|timeout\|pool"
```

#### 2. Banco de Dados com Pouco Espaço
**Sintoma**: Erro "out of disk space"  
**Diagnóstico**:
```sql
-- Ver tamanho de tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Ver tamanho total do banco
SELECT pg_size_pretty(pg_database_size('postgres'));
```

#### 3. Queries N+1
**Sintoma**: Muitas queries pequenas em vez de uma query grande  
**Diagnóstico**:
```sql
-- Ver queries mais executadas
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

#### 4. Problemas de Isolamento Multi-Tenant
**Sintoma**: Dados de um tenant aparecendo para outro  
**Diagnóstico**:
```sql
-- Verificar registros órfãos
SELECT 
  'clients' as tabela,
  COUNT(*) as registros_orfaos
FROM clients c
LEFT JOIN tenants t ON c.tenant_id = t.id
WHERE t.id IS NULL

UNION ALL

SELECT 
  'loans' as tabela,
  COUNT(*) as registros_orfaos
FROM loans l
LEFT JOIN tenants t ON l.tenant_id = t.id
WHERE t.id IS NULL;
```

---

## 💻 Especialista Fullstack

### ✅ Casos Já Resolvidos

#### 1. Erros 5xx em Endpoints
**Sintoma**: `curl https://credgestor.app.br/api/tenants/{id}/resource` retorna 500  
**Causa**: Exceções não tratadas, validação falhando, ou problemas de banco  
**Resolução**:
```bash
# Ver logs detalhados
docker service logs credgestor_api --tail 2000 | grep -A 15 "500\|Internal Server Error" | tail -100

# Verificar stack traces
docker service logs credgestor_api --tail 5000 | grep -B 5 -A 20 "Traceback"

# Verificar problemas de conexão com banco
docker service logs credgestor_api --tail 1000 | grep -i "database\|connection\|timeout\|pool"
```

#### 2. Erros 401 em `/auth/refresh`
**Sintoma**: Refresh token retornando 401  
**Causa**: Token expirado, inválido, ou problema de autenticação  
**Resolução**:
```bash
# Ver logs de autenticação
docker service logs credgestor_api --tail 1000 | grep -i "auth\|token\|401\|unauthorized"

# Verificar configuração Supabase
docker service inspect credgestor_api --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{.}}{{"\n"}}{{end}}' | grep SUPABASE
```

#### 3. Frontend Não Carrega
**Sintoma**: Página em branco ou erro no console  
**Causa**: Build incorreto, variáveis de ambiente não configuradas, ou erro de JavaScript  
**Resolução**:
```bash
# Ver logs do frontend
docker service logs credgestor_site --tail 100

# Verificar build
docker images | grep credgestor-homologacao-frontend

# Verificar variáveis de ambiente
docker service inspect credgestor_site --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{.}}{{"\n"}}{{end}}' | grep VITE
```

#### 4. CORS Errors
**Sintoma**: Erro "CORS policy" no console do navegador  
**Causa**: CORS middleware não configurado ou origins incorretas  
**Resolução**:
```bash
# Verificar configuração CORS no backend
docker service logs credgestor_api --tail 100 | grep -i "cors"

# Verificar código do backend
docker exec -it $(docker ps -q -f name=credgestor_api) cat backend/main.py | grep -i "cors"
```

### ⚠️ Casos que Podem Ocorrer

#### 1. Problemas de Performance no Frontend
**Sintoma**: Página lenta para carregar ou renderizar  
**Diagnóstico**:
```bash
# Verificar bundle size
docker exec -it $(docker ps -q -f name=credgestor_site) ls -lh /usr/share/nginx/html/assets/

# Verificar console do navegador (F12)
# Verificar Network tab para requests lentos
```

#### 2. Problemas de Integração Frontend-Backend
**Sintoma**: Dados não aparecem ou erros de API  
**Diagnóstico**:
```bash
# Verificar variável VITE_API_BASE_URL
docker service inspect credgestor_site --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{.}}{{"\n"}}{{end}}' | grep VITE_API_BASE_URL

# Testar API diretamente
curl https://credgestor.app.br/api/health
```

#### 3. Problemas de Multi-Tenancy
**Sintoma**: Dados de um tenant aparecendo para outro  
**Diagnóstico**:
```bash
# Verificar logs de tenant_id
docker service logs credgestor_api --tail 1000 | grep -i "tenant_id"

# Verificar código de isolamento
docker exec -it $(docker ps -q -f name=credgestor_api) cat backend/main.py | grep -i "tenant"
```

#### 4. Problemas de Build/Deploy
**Sintoma**: Mudanças não aparecem após deploy  
**Diagnóstico**:
```bash
# Verificar versão da imagem
docker images | grep credgestor

# Verificar se serviço foi atualizado
docker service ps credgestor_api --no-trunc

# Forçar rebuild
docker service update --force credgestor_api
```

---

## 🔄 Workflow de Troubleshooting Recomendado

### 1. Identificar o Problema
```bash
# Verificar status geral
docker service ls
curl https://credgestor.app.br/api/health
```

### 2. Coletar Informações
```bash
# Logs
docker service logs credgestor_api --tail 500
docker service logs credgestor_site --tail 500

# Recursos
docker stats
top
df -h
```

### 3. Diagnosticar Causa Raiz
- Verificar logs de erro
- Verificar recursos do sistema
- Verificar conectividade
- Verificar configurações

### 4. Aplicar Correção
- Seguir resoluções específicas acima
- Testar após correção
- Monitorar resultados

### 5. Documentar
- Registrar problema e solução
- Atualizar este documento
- Compartilhar conhecimento

---

## 📚 Referências

- **VPS**: 167.235.76.26
- **URLs**: 
  - Frontend: https://credgestor.app.br
  - API: https://credgestor.app.br/api
  - API Docs: https://credgestor.app.br/api/docs
- **Documentação**: Ver `INSTRUCOES_CONEXAO_VPS.md` para mais detalhes

---

**Última atualização**: 2024-12-20  
**Versão**: 1.0
