# 🚀 Guia de Deploy em Produção - CredGestor

Este documento contém todas as informações necessárias para fazer deploy em produção na VPS.

## 📋 Pré-requisitos

- VPS com Docker e Docker Swarm configurado
- Acesso SSH à VPS (167.235.76.26)
- Traefik configurado e rodando
- Rede Docker `network_public` criada
- Domínio `credgestor.app.br` apontando para a VPS

## 🔧 Configuração Inicial na VPS

### 1. Conectar na VPS

```bash
ssh usuario@167.235.76.26
```

### 2. Criar diretório do projeto

```bash
mkdir -p /var/www/credgestor-homologacao
cd /var/www/credgestor-homologacao
```

### 3. Criar arquivo .env

```bash
nano .env
```

Adicione as seguintes variáveis (substitua pelos valores reais):

```bash
# Supabase
SUPABASE_URL=https://aclyrcuahiujgtjuimoh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-anon-key

# Database (opcional - apenas para código legacy)
DATABASE_URL=postgresql://postgres:DzAq9DveJ81Mf0oI@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres

# API
API_HOST=0.0.0.0
API_PORT=8000
```

Salve o arquivo (Ctrl+X, Y, Enter).

### 4. Verificar Docker Swarm

```bash
# Verificar se o Swarm está inicializado
docker info | grep Swarm

# Se não estiver, inicializar:
docker swarm init
```

### 5. Criar rede Docker (se não existir)

```bash
docker network ls | grep network_public

# Se não existir, criar:
docker network create --driver overlay network_public
```

## 🚀 Deploy

### Deploy Automático (via GitHub Actions)

O deploy é feito automaticamente quando você faz push para a branch `main`:

1. O GitHub Actions constrói as imagens Docker
2. Faz push para o Docker Hub
3. Conecta na VPS via SSH
4. Copia o `docker-compose.yml`
5. Executa `docker stack deploy`

### Deploy Manual

Se precisar fazer deploy manualmente:

```bash
# 1. Conectar na VPS
ssh usuario@167.235.76.26

# 2. Ir para o diretório do projeto
cd /var/www/credgestor-homologacao

# 3. Fazer pull das imagens mais recentes
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# 4. Fazer deploy do stack
docker stack deploy -c docker-compose.yml credgestor

# 5. Verificar status
docker stack services credgestor
docker stack ps credgestor
```

## 🔍 Verificação Pós-Deploy

### 1. Verificar serviços

```bash
docker stack services credgestor
```

Deve mostrar:
- `credgestor_api`: 1/1 replicas
- `credgestor_site`: 1/1 replicas

### 2. Verificar logs

```bash
# Logs do backend
docker service logs --tail 50 credgestor_api

# Logs do frontend
docker service logs --tail 50 credgestor_site
```

### 3. Testar endpoints

```bash
# Health check da API
curl https://credgestor.app.br/api/health

# Ou diretamente
curl http://167.235.76.26:8000/health
```

### 4. Testar frontend

Acesse no navegador:
- Frontend: https://credgestor.app.br
- API Docs: https://credgestor.app.br/api/docs

## 🔧 Configuração do Traefik

O Traefik deve estar configurado com:

- Entrypoints: `web` (porta 80) e `websecure` (porta 443)
- Cert resolver: `letsencryptresolver` para SSL automático
- Rede: `network_public`

### Roteamento Configurado

- **Frontend**: `credgestor.app.br` → serviço `credgestor_site` (porta 80)
- **API**: `credgestor.app.br/api/*` → serviço `credgestor_api` (porta 8000)

## 🔐 Secrets do GitHub Actions

Configure os seguintes secrets no GitHub (Settings → Secrets and variables → Actions):

### Obrigatórios para Deploy:
- `VPS_USER` - Usuário SSH (ex: `root`, `ubuntu`)
- `VPS_SSH_KEY` - Chave privada SSH completa

### Opcionais:
- `VPS_HOST` - IP da VPS (padrão: `167.235.76.26`)
- `VPS_PORT` - Porta SSH (padrão: `22`)

### Para Build das Imagens:
- `DOCKERHUB_TOKEN` - Token do Docker Hub
- `VITE_SUPABASE_URL` - URL do Supabase (para build do frontend)
- `VITE_SUPABASE_ANON_KEY` - Anon Key do Supabase (para build do frontend)

## 🐛 Troubleshooting

### Serviço não inicia

```bash
# Ver logs detalhados
docker service logs --tail 200 credgestor_api
docker service ps credgestor_api --no-trunc

# Recriar serviço
docker service update --force credgestor_api
```

### Login não funciona

1. Verificar se a API está acessível:
   ```bash
   curl https://credgestor.app.br/api/health
   ```

2. Verificar logs do backend:
   ```bash
   docker service logs --tail 100 credgestor_api
   ```

3. Verificar console do navegador (F12) para erros

4. Verificar se o usuário existe no Supabase Auth

### Frontend não carrega

1. Verificar logs:
   ```bash
   docker service logs --tail 100 credgestor_site
   ```

2. Verificar se a imagem foi construída corretamente:
   ```bash
   docker images | grep credgestor-homologacao-frontend
   ```

3. Verificar healthcheck:
   ```bash
   docker service ps credgestor_site
   ```

## 📊 Monitoramento

### URLs de Produção

- **Frontend**: https://credgestor.app.br
- **API**: https://credgestor.app.br/api
- **API Docs**: https://credgestor.app.br/api/docs
- **Health Check**: https://credgestor.app.br/api/health

### Comandos Úteis

```bash
# Ver status dos serviços
docker stack services credgestor

# Ver logs em tempo real
docker service logs -f credgestor_api
docker service logs -f credgestor_site

# Reiniciar um serviço
docker service update --force credgestor_api

# Remover e recriar o stack
docker stack rm credgestor
sleep 10
docker stack deploy -c docker-compose.yml credgestor
```

## 🔄 Atualização

Para atualizar a aplicação:

1. Faça push para a branch `main` no GitHub
2. O GitHub Actions fará o deploy automaticamente
3. Ou faça deploy manual seguindo os passos acima

## 📝 Checklist de Deploy

- [ ] Arquivo `.env` criado na VPS com todas as variáveis
- [ ] Docker Swarm inicializado
- [ ] Rede `network_public` criada
- [ ] Traefik configurado e rodando
- [ ] Secrets do GitHub Actions configurados
- [ ] Imagens Docker construídas e enviadas para Docker Hub
- [ ] Stack deployado com sucesso
- [ ] Serviços rodando (1/1 replicas)
- [ ] Health check da API funcionando
- [ ] Frontend acessível
- [ ] Login funcionando

---

**Última atualização**: 2026-01-10
**Versão**: 1.0.0
