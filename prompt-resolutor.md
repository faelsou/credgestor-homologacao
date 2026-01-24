# 🔧 Prompt Resolutor - CredGestor

## 📋 Visão Geral

Este documento contém todos os comandos já executados e que podem ser utilizados futuramente para resolver problemas da aplicação CredGestor, organizados por área de especialização.

**Aplicação**: CredGestor - Sistema de Gestão de Crédito Multi-Tenancy  
**VPS**: 167.235.76.26  
**Stack**: Docker Swarm, Traefik, FastAPI, React, Supabase

---

## 🐳 Especialista em Containers

### Comandos Docker Swarm - Diagnóstico

#### Verificar Status de Serviços
```bash
# Listar todos os serviços
docker service ls

# Ver detalhes de um serviço específico
docker service ps credgestor_api --no-trunc

# Ver status de todos os serviços do stack
docker stack services credgestor

# Ver informações detalhadas de um serviço
docker service inspect credgestor_api
```

#### Verificar Logs
```bash
# Logs do backend (últimas 100 linhas)
docker service logs credgestor_api --tail 100

# Logs do frontend
docker service logs credgestor_site --tail 100

# Logs em tempo real (follow)
docker service logs credgestor_api -f

# Logs com filtro de erro
docker service logs credgestor_api --tail 500 | grep -i "error\|exception\|traceback"

# Logs de um período específico
docker service logs credgestor_api --since 1h
```

#### Verificar Recursos
```bash
# Uso de recursos em tempo real
docker stats

# Uso de recursos de um serviço específico
docker stats $(docker ps -q -f name=credgestor_api)

# Verificar uso de disco
docker system df
docker system df -v
```

### Comandos Docker Swarm - Resolução

#### Reiniciar Serviços
```bash
# Reiniciar serviço API
docker service update --force credgestor_api

# Reiniciar serviço Frontend
docker service update --force credgestor_site

# Reiniciar todos os serviços do stack
docker service update --force credgestor_api credgestor_site
```

#### Escalar Serviços
```bash
# Escalar serviço para 2 réplicas
docker service scale credgestor_api=2

# Escalar serviço para 3 réplicas
docker service scale credgestor_api=3

# Reduzir para 1 réplica
docker service scale credgestor_api=1
```

#### Rollback de Serviços
```bash
# Fazer rollback do serviço
docker service rollback credgestor_api

# Ver histórico de updates
docker service ps credgestor_api --no-trunc

# Ver versão atual
docker service inspect credgestor_api --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

#### Atualizar Serviços
```bash
# Atualizar imagem de um serviço
docker service update --image faelsouz/credgestor-homologacao-backend:latest credgestor_api

# Atualizar variáveis de ambiente
docker service update --env-add NEW_VAR=value credgestor_api

# Atualizar recursos (CPU/Memória)
docker service update --limit-cpu 1 --limit-memory 512M credgestor_api
```

### Comandos Docker Swarm - Stack Management

#### Gerenciar Stack
```bash
# Deploy do stack
cd /var/www/credgestor-homologacao
source .env
docker stack deploy -c docker-compose.yml credgestor

# Remover stack
docker stack rm credgestor

# Ver serviços do stack
docker stack services credgestor

# Ver logs do stack
docker stack ps credgestor
```

#### Verificar Rede Docker
```bash
# Listar redes
docker network ls

# Ver detalhes da rede
docker network inspect network_public

# Verificar se serviço está na rede
docker service inspect credgestor_api --format '{{.Spec.TaskTemplate.Networks}}'
```

### Comandos SSH para VPS

#### Conectar na VPS
```bash
# Conectar via SSH
ssh root@167.235.76.26

# Conectar com porta específica (se necessário)
ssh -p 22 root@167.235.76.26
```

#### Executar Comandos Remotamente
```bash
# Executar comando único
ssh root@167.235.76.26 'docker service ls'

# Executar múltiplos comandos
ssh root@167.235.76.26 'cd /var/www/credgestor-homologacao && docker service ls'

# Executar script
ssh root@167.235.76.26 'bash -s' < script.sh
```

---

## 🖥️ Especialista em Infraestrutura

### Comandos Linux - Sistema

#### Verificar Recursos do Sistema
```bash
# CPU e memória (interativo)
top
htop

# CPU e memória (uma vez)
uptime
free -h
cat /proc/cpuinfo | grep processor | wc -l

# Disco
df -h
du -sh /var/www/*
du -sh /var/log/*

# I/O
iostat -x 1
iotop
```

#### Verificar Processos
```bash
# Processos por CPU
ps aux --sort=-%cpu | head -20

# Processos por memória
ps aux --sort=-%mem | head -20

# Processos do Docker
ps aux | grep docker

# Processos de um usuário
ps aux | grep root
```

#### Verificar Rede
```bash
# Portas abertas
netstat -tulpn
ss -tulpn

# Conexões ativas
netstat -an | grep ESTABLISHED
ss -s

# Testar conectividade
ping 8.8.8.8
curl -I https://credgestor.app.br
```

### Comandos Traefik

#### Verificar Traefik
```bash
# Status do serviço Traefik
docker service ls | grep traefik
docker service ps traefik

# Logs do Traefik
docker service logs traefik --tail 100
docker service logs traefik -f

# Verificar configuração
docker service inspect traefik --format '{{.Spec.TaskTemplate.ContainerSpec.Config}}'
```

#### Verificar SSL/Certificados
```bash
# Verificar certificado SSL
curl -vI https://credgestor.app.br 2>&1 | grep -i certificate

# Verificar expiração do certificado
echo | openssl s_client -servername credgestor.app.br -connect credgestor.app.br:443 2>/dev/null | openssl x509 -noout -dates

# Ver logs de certificado no Traefik
docker service logs traefik --tail 200 | grep -i "certificate\|acme\|ssl"
```

#### Verificar DNS
```bash
# Resolver DNS
nslookup credgestor.app.br
dig credgestor.app.br

# Verificar configuração DNS
cat /etc/resolv.conf
```

### Comandos Firewall

#### Gerenciar Firewall (UFW)
```bash
# Ver status
ufw status
ufw status verbose

# Habilitar/desabilitar
ufw enable
ufw disable

# Permitir portas
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Ver regras
ufw show added
```

#### Gerenciar Firewall (iptables)
```bash
# Ver regras
iptables -L -n
iptables -L -n -v

# Ver regras de NAT
iptables -t nat -L -n
```

### Comandos de Logs do Sistema

#### Logs do Sistema
```bash
# Logs do systemd
journalctl -xe
journalctl -u docker -f
journalctl -u traefik -f

# Logs do sistema
tail -f /var/log/syslog
tail -f /var/log/auth.log

# Limpar logs antigos
journalctl --vacuum-time=7d
journalctl --vacuum-size=500M
```

---

## 🗄️ Especialista em Banco de Dados

### Comandos SQL - Diagnóstico

#### Verificar Conexões
```sql
-- Total de conexões
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'postgres';

-- Conexões por aplicação
SELECT 
  application_name, 
  COUNT(*) as connections,
  COUNT(*) FILTER (WHERE state = 'active') as active
FROM pg_stat_activity 
WHERE datname = 'postgres'
GROUP BY application_name
ORDER BY connections DESC;

-- Ver todas as conexões ativas
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE datname = 'postgres'
ORDER BY query_start;
```

#### Verificar Performance de Queries
```sql
-- Queries mais lentas
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time,
  (total_exec_time / calls) as avg_time_per_call
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Queries mais executadas
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- Queries com maior tempo total
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

#### Verificar Locks
```sql
-- Locks ativos
SELECT 
  l.locktype,
  l.relation::regclass as table_name,
  l.mode,
  l.granted,
  a.query,
  a.pid,
  a.state,
  a.query_start
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY a.query_start;

-- Verificar deadlocks
SELECT * FROM pg_stat_database_conflicts;

-- Verificar locks em tabelas específicas
SELECT 
  l.locktype,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.pid,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text = 'tenants';
```

#### Verificar Tamanhos
```sql
-- Tamanho de tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Tamanho total do banco
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Tamanho de índices
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Comandos SQL - Resolução

#### Gerenciar Conexões
```sql
-- Matar conexões idle in transaction
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND datname = 'postgres'
AND pid <> pg_backend_pid();

-- Matar conexão específica
SELECT pg_terminate_backend(<PID>);

-- Matar todas as conexões de uma aplicação
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'nome_da_aplicacao'
AND datname = 'postgres';
```

#### Criar Índices
```sql
-- Índices estratégicos para multi-tenancy
CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON tenants(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_created ON clients(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_loans_tenant_status ON loans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date) WHERE status != 'paid';
CREATE INDEX IF NOT EXISTS idx_login_audit_tenant_created ON login_audit(tenant_id, created_at);

-- Índices compostos
CREATE INDEX IF NOT EXISTS idx_loans_tenant_status_created ON loans(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_installments_loan_status ON installments(loan_id, status);
```

#### Verificar e Otimizar Índices
```sql
-- Ver uso de índices
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Índices não utilizados (candidatos para remoção)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### Verificar Integridade Multi-Tenant
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
WHERE t.id IS NULL

UNION ALL

SELECT 
  'installments' as tabela,
  COUNT(*) as registros_orfaos
FROM installments i
LEFT JOIN loans l ON i.loan_id = l.id
LEFT JOIN tenants t ON l.tenant_id = t.id
WHERE t.id IS NULL;
```

### Comandos psql - Conexão

#### Conectar no Banco
```bash
# Via Supabase (se configurado)
psql postgresql://postgres:****@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres

# Via container (se houver)
docker exec -it <postgres_container> psql -U postgres -d postgres
```

#### Executar Queries
```bash
# Query única
psql -h host -U user -d database -c "SELECT COUNT(*) FROM tenants;"

# Executar arquivo SQL
psql -h host -U user -d database -f script.sql

# Executar com output formatado
psql -h host -U user -d database -c "SELECT * FROM tenants;" -x
```

---

## 💻 Especialista Fullstack

### Comandos Backend (FastAPI)

#### Verificar API
```bash
# Health check
curl https://credgestor.app.br/api/health
curl http://167.235.76.26:8000/health

# Métricas
curl https://credgestor.app.br/api/metrics

# Documentação
curl https://credgestor.app.br/api/docs
```

#### Testar Endpoints
```bash
# Login
curl -X POST https://credgestor.app.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente-alpha.com",
    "senha": "senhaFort3!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'

# Refresh token
curl -X POST https://credgestor.app.br/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "token_aqui"}'

# Listar tenants
curl -X GET https://credgestor.app.br/api/tenants \
  -H "Authorization: Bearer token_aqui"
```

#### Verificar Variáveis de Ambiente
```bash
# Ver variáveis do serviço
docker service inspect credgestor_api --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{.}}{{"\n"}}{{end}}'

# Ver variáveis dentro do container
docker exec -it $(docker ps -q -f name=credgestor_api) env | grep SUPABASE
```

### Comandos Frontend (React)

#### Verificar Build
```bash
# Verificar imagem
docker images | grep credgestor-homologacao-frontend

# Verificar arquivos no container
docker exec -it $(docker ps -q -f name=credgestor_site) ls -lh /usr/share/nginx/html/

# Verificar variáveis de ambiente
docker service inspect credgestor_site --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{.}}{{"\n"}}{{end}}' | grep VITE
```

#### Testar Frontend
```bash
# Verificar se está servindo HTML
curl -I https://credgestor.app.br

# Verificar se assets estão sendo servidos
curl -I https://credgestor.app.br/assets/index.js
curl -I https://credgestor.app.br/assets/index.css
```

### Comandos de Deploy

#### Build e Push de Imagens
```bash
# Build backend
cd /var/www/credgestor-homologacao
docker build -f Dockerfile.backend -t faelsouz/credgestor-homologacao-backend:latest .
docker push faelsouz/credgestor-homologacao-backend:latest

# Build frontend
docker build -f Dockerfile.frontend -t faelsouz/credgestor-homologacao-frontend:v1.0.3 .
docker push faelsouz/credgestor-homologacao-frontend:v1.0.3
```

#### Deploy Completo
```bash
# 1. Remover stack antigo
docker stack rm credgestor
sleep 10

# 2. Carregar variáveis de ambiente
cd /var/www/credgestor-homologacao
source .env

# 3. Deploy novo stack
docker stack deploy -c docker-compose.yml credgestor

# 4. Verificar status
docker service ls
docker stack services credgestor

# 5. Verificar logs
docker service logs credgestor_api --tail 50
docker service logs credgestor_site --tail 50
```

### Comandos de Debug

#### Verificar Código no Container
```bash
# Ver arquivo específico
docker exec -it $(docker ps -q -f name=credgestor_api) cat backend/main.py

# Ver estrutura de diretórios
docker exec -it $(docker ps -q -f name=credgestor_api) ls -la /app

# Verificar Python packages
docker exec -it $(docker ps -q -f name=credgestor_api) pip list
```

#### Verificar Logs Específicos
```bash
# Erros 5xx
docker service logs credgestor_api --tail 2000 | grep -A 15 "500\|Internal Server Error"

# Erros de autenticação
docker service logs credgestor_api --tail 1000 | grep -i "auth\|token\|401\|unauthorized"

# Erros de banco
docker service logs credgestor_api --tail 1000 | grep -i "database\|connection\|timeout\|pool"

# Stack traces
docker service logs credgestor_api --tail 5000 | grep -B 5 -A 20 "Traceback"
```

---

## 🔄 Scripts Úteis

### Script de Health Check Completo
```bash
#!/bin/bash
# health-check.sh

echo "=== Health Check CredGestor ==="
echo ""

echo "1. Verificando serviços Docker..."
docker service ls

echo ""
echo "2. Verificando API Health..."
curl -s https://credgestor.app.br/api/health | jq .

echo ""
echo "3. Verificando recursos..."
docker stats --no-stream

echo ""
echo "4. Verificando logs recentes..."
docker service logs credgestor_api --tail 10
```

### Script de Limpeza
```bash
#!/bin/bash
# cleanup.sh

echo "=== Limpeza do Sistema ==="

# Limpar containers parados
docker container prune -f

# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar sistema completo
docker system prune -a --volumes -f

echo "Limpeza concluída!"
```

### Script de Backup
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/credgestor"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de configurações
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /var/www/credgestor-homologacao/.env /var/www/credgestor-homologacao/docker-compose.yml

# Backup de logs
docker service logs credgestor_api --tail 10000 > $BACKUP_DIR/logs_api_$DATE.log
docker service logs credgestor_site --tail 10000 > $BACKUP_DIR/logs_site_$DATE.log

echo "Backup criado em $BACKUP_DIR"
```

---

## 📚 Referências Rápidas

### Comandos Mais Usados

```bash
# Status geral
docker service ls
curl https://credgestor.app.br/api/health

# Logs
docker service logs credgestor_api --tail 100 -f

# Reiniciar
docker service update --force credgestor_api

# Recursos
docker stats
df -h
free -h

# Deploy
cd /var/www/credgestor-homologacao && source .env && docker stack deploy -c docker-compose.yml credgestor
```

### URLs Importantes

- **Frontend**: https://credgestor.app.br
- **API**: https://credgestor.app.br/api
- **API Docs**: https://credgestor.app.br/api/docs
- **Health**: https://credgestor.app.br/api/health
- **Métricas**: https://credgestor.app.br/api/metrics

### Informações da VPS

- **Host**: 167.235.76.26
- **User**: root
- **Diretório**: /var/www/credgestor-homologacao
- **Rede Docker**: network_public

---

**Última atualização**: 2024-12-20  
**Versão**: 1.0
