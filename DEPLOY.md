# 🚀 Guia de Deploy - CredGestor

Este documento descreve o processo de deploy e as melhores práticas DevOps implementadas no projeto.

## 📋 Índice

- [Arquitetura de Deploy](#arquitetura-de-deploy)
- [Ambientes](#ambientes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Docker](#docker)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Troubleshooting](#troubleshooting)

## 🏗️ Arquitetura de Deploy

O projeto utiliza uma arquitetura moderna com:

- **Frontend**: React + Vite (servido via Nginx)
- **Backend**: FastAPI (Python 3.11)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Containerização**: Docker multi-stage builds
- **CI/CD**: GitHub Actions

## 🌍 Ambientes

### Desenvolvimento Local
- **Objetivo**: Desenvolvimento e testes locais
- **Setup**: Script automatizado `scripts/setup-local.sh`
- **Acesso**: `http://localhost:3000` (frontend) e `http://localhost:8000` (backend)

### Staging
- **Branch**: `develop` ou `staging`
- **Objetivo**: Testes de integração e validação
- **Deploy**: Automático via GitHub Actions
- **URL**: `https://staging.credgestor.com`

### Production
- **Branch**: `main`
- **Objetivo**: Ambiente de produção
- **Deploy**: Automático via GitHub Actions (push para main) ou manual via workflow_dispatch
- **URL**: `https://credgestor.app.br`
- **VPS**: `167.235.76.26`

## 🔄 CI/CD Pipeline

O pipeline está definido em `.github/workflows/deploy.yaml` e inclui:

### 1. Lint & Format Check
- ✅ Lint Python (flake8)
- ✅ Formatação Python (black, isort)
- ✅ Lint TypeScript/React
- ✅ Verificação de imports

### 2. Testes Backend
- ✅ Testes unitários e de integração
- ✅ Coverage report
- ✅ Health check da API
- ✅ Testes com PostgreSQL em container

### 3. Testes Frontend
- ✅ Type checking (TypeScript)
- ✅ Testes unitários
- ✅ Build de produção
- ✅ Upload de artifacts

### 4. Build Docker
- ✅ Build multi-stage otimizado
- ✅ Push para GitHub Container Registry
- ✅ Cache de layers
- ✅ Tags semânticas

### 5. Security Scan
- ✅ Trivy vulnerability scanner
- ✅ TruffleHog (detecção de secrets)
- ✅ Upload para GitHub Security

### 6. Deploy
- ✅ Deploy automático para staging
- ✅ Deploy manual para production
- ✅ Smoke tests pós-deploy
- ✅ Notificações

## 💻 Desenvolvimento Local

### Setup Rápido

```bash
# 1. Clone o repositório
git clone <repo-url>
cd credgestor

# 2. Execute o script de setup
npm run setup:local
# ou
bash scripts/setup-local.sh

# 3. Edite o arquivo .env com suas credenciais
nano .env

# 4. Inicie o backend (terminal 1)
python3 -m uvicorn backend.main:app --reload

# 5. Inicie o frontend (terminal 2)
npm run dev
```

### Verificação Local

```bash
# Testar backend
curl http://localhost:8000/health

# Testar frontend
curl http://localhost:3000

# Executar testes
python3 -m backend.legacy.test_sistema
npm test
```

## 🐳 Docker

### Build Manual

```bash
# Backend
docker build -f Dockerfile.backend \
  -t faelsouz/credgestor-homologacao-backend:latest .

# Push para Docker Hub
docker login
docker push faelsouz/credgestor-homologacao-backend:latest

# Frontend
docker build -f Dockerfile.frontend \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t faelsouz/credgestor-homologacao-frontend:latest .

# Push para Docker Hub
docker push faelsouz/credgestor-homologacao-frontend:latest
```

### Docker Compose

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v
```

### Variáveis de Ambiente no Docker

O `docker-compose.yml` carrega automaticamente o arquivo `.env`:

```yaml
services:
  api:
    env_file:
      - .env  # Carrega variáveis do .env
```

## 🔐 Variáveis de Ambiente

### Backend (FastAPI)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | ✅ Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | Service Role Key (nunca exponha no frontend!) |
| `SUPABASE_ANON_KEY` | ⚠️ Opcional | Anon Key (para autenticação) |
| `DEFAULT_TENANT_ID` | ⚠️ Opcional | Tenant ID padrão |
| `DATABASE_URL` | ⚠️ Opcional | Para código legacy |

### Frontend (Vite)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_API_BASE_URL` | ⚠️ Opcional | URL base da API (padrão: `http://localhost:8000`). Em produção: `https://credgestor.app.br/api` |
| `VITE_API_LOGIN_URL` | ⚠️ Opcional | URL específica para login (sobrescreve `VITE_API_BASE_URL/auth/login`) |
| `VITE_SUPABASE_URL` | ⚠️ Opcional | URL do Supabase para frontend |
| `VITE_SUPABASE_ANON_KEY` | ⚠️ Opcional | Anon Key para frontend |
| `VITE_N8N_BASE_URL` | ⚠️ Opcional | URL do backend N8N |
| `VITE_N8N_TENANT_ID` | ⚠️ Opcional | Tenant ID para N8N |

**Nota para Produção:**
- Em produção, configure `VITE_API_BASE_URL=https://credgestor.app.br/api` ou deixe vazio para usar o mesmo domínio do frontend
- O frontend está disponível em: `https://credgestor.app.br`
- A API está disponível em: `https://credgestor.app.br/api` (via Traefik) ou `http://167.235.76.26:8000` (acesso direto)

### Configuração no GitHub

Adicione os secrets no GitHub:
1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione:
   - `DOCKERHUB_TOKEN` - Token de acesso do Docker Hub (obrigatório para build)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - **Para Deploy em Produção (VPS):**
     - `VPS_HOST` - IP ou hostname da VPS (padrão: 167.235.76.26)
     - `VPS_USER` - Usuário SSH da VPS (ex: root, ubuntu, etc.)
     - `VPS_SSH_KEY` - Chave privada SSH para autenticação na VPS
     - `VPS_PORT` - Porta SSH (opcional, padrão: 22)

**Como criar o Docker Hub Token:**
1. Acesse [Docker Hub](https://hub.docker.com/)
2. Vá em **Account Settings** → **Security**
3. Clique em **New Access Token**
4. Copie o token e adicione como `DOCKERHUB_TOKEN` no GitHub

**Como configurar SSH para Deploy na VPS:**

⚠️ **IMPORTANTE**: Estes secrets são obrigatórios para o deploy funcionar!

1. **Gere uma chave SSH** (se ainda não tiver):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key
   ```
   - Pressione Enter para aceitar o local padrão
   - **NÃO** defina uma senha (deixe vazio) para facilitar o uso no CI/CD

2. **Copie a chave pública para a VPS**:
   ```bash
   ssh-copy-id -i ~/.ssh/vps_deploy_key.pub usuario@167.235.76.26
   ```
   - Substitua `usuario` pelo seu usuário SSH (ex: `root`, `ubuntu`, etc.)
   - Você precisará da senha do usuário SSH na primeira vez

3. **Teste a conexão SSH**:
   ```bash
   ssh -i ~/.ssh/vps_deploy_key usuario@167.235.76.26
   ```
   - Se conectar sem pedir senha, está funcionando corretamente

4. **Configure os Secrets no GitHub**:
   - Vá em: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   
   ⚠️ **IMPORTANTE - Regras de Nomenclatura dos Secrets:**
   - ✅ Use apenas letras (a-z, A-Z), números (0-9) e underscores (_)
   - ✅ Deve começar com letra ou underscore
   - ❌ **NÃO** use espaços, hífens (-) ou outros caracteres especiais
   - ✅ Use o nome **EXATO** como mostrado abaixo (case-sensitive)
   
   Adicione os seguintes secrets com os nomes **EXATOS**:
     
     **VPS_USER** (obrigatório):
     - Name: `VPS_USER` (exatamente assim, sem espaços)
     - Value: seu usuário SSH (ex: `root`, `ubuntu`)
     
     **VPS_SSH_KEY** (obrigatório):
     - Name: `VPS_SSH_KEY` (exatamente assim, sem espaços)
     - Value: copie o conteúdo completo do arquivo `~/.ssh/vps_deploy_key`:
       ```bash
       cat ~/.ssh/vps_deploy_key
       ```
       - Copie **TUDO**, incluindo as linhas `-----BEGIN OPENSSH PRIVATE KEY-----` e `-----END OPENSSH PRIVATE KEY-----`
     
     **VPS_HOST** (opcional, padrão: 167.235.76.26):
     - Name: `VPS_HOST` (exatamente assim, sem espaços)
     - Value: `167.235.76.26` (ou outro IP/hostname se diferente)
     
     **VPS_PORT** (opcional, padrão: 22):
     - Name: `VPS_PORT` (exatamente assim, sem espaços)
     - Value: `22` (ou outra porta se diferente)

5. **Verifique se os secrets estão configurados**:
   - Vá em: **Settings** → **Secrets and variables** → **Actions**
   - Você deve ver: `VPS_USER`, `VPS_SSH_KEY`, e opcionalmente `VPS_HOST` e `VPS_PORT`

**Troubleshooting:**
- Se o deploy falhar com "can't connect without a private SSH key", verifique se:
  - O secret `VPS_SSH_KEY` está configurado e contém a chave privada completa
  - O secret `VPS_USER` está configurado
  - A chave pública foi adicionada corretamente na VPS (`~/.ssh/authorized_keys`)
  - O usuário SSH tem permissões adequadas na VPS

## 🚀 Deploy Manual

### Deploy para Staging

```bash
# Via GitHub Actions UI
1. Vá em Actions → Deploy CredGestor
2. Clique em "Run workflow"
3. Selecione branch: develop
4. Selecione environment: staging
```

### Deploy para Production

O deploy em produção é feito automaticamente na VPS `167.235.76.26` quando há push na branch `main` ou manualmente via workflow_dispatch.

**Processo Automático:**
1. Push para branch `main` → Build das imagens Docker → Deploy automático na VPS
2. O workflow:
   - Copia o `docker-compose.yml` para a VPS
   - Faz pull das imagens mais recentes do Docker Hub
   - Executa `docker stack deploy -c docker-compose.yml credgestor`

**Deploy Manual:**
```bash
# Via GitHub Actions UI
1. Vá em Actions → Deploy CredGestor
2. Clique em "Run workflow"
3. Selecione branch: main
4. Selecione environment: production
```

**Deploy Manual na VPS (SSH direto):**
```bash
# Conecte na VPS
ssh usuario@167.235.76.26

# Navegue até o diretório do projeto
cd /var/www/credgestor-homologacao

# Faça pull das imagens mais recentes
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Execute o deploy
docker stack deploy -c docker-compose.yml credgestor

# Verifique o status
docker stack services credgestor
docker stack ps credgestor

# Acesse a aplicação
# Frontend: https://credgestor.app.br
# API: https://credgestor.app.br/api ou http://167.235.76.26:8000
# API Docs: https://credgestor.app.br/api/docs ou http://167.235.76.26:8000/docs
```

## 🧪 Testes

### Backend

```bash
# Testes completos
python3 -m backend.legacy.test_sistema

# Testes com pytest (se configurado)
pytest backend/ -v --cov=backend

# Health check
curl http://localhost:8000/health
```

### Frontend

```bash
# Type check
npm run type-check

# Testes (quando configurados)
npm test

# Build de produção
npm run build
```

## 🔍 Troubleshooting

### Erro: "DATABASE_URL não está configurada"

**Solução:**
```bash
# Verifique se o arquivo .env existe
ls -la .env

# Se não existir, copie do exemplo
cp .env.example .env

# Edite e adicione suas credenciais
nano .env
```

### Erro: "Cannot connect to database"

**Solução:**
```bash
# Verifique se o banco está rodando
docker-compose ps

# Inicie o banco se necessário
docker-compose up -d postgres

# Teste a conexão
psql $DATABASE_URL -c "SELECT 1"
```

### Erro no CI/CD: "Secrets not found" ou "can't connect without a private SSH key"

**Solução:**
1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Verifique se os seguintes secrets estão configurados com os nomes **EXATOS** (sem espaços, sem hífens):
   - ✅ `VPS_USER` - Usuário SSH (ex: `root`, `ubuntu`)
   - ✅ `VPS_SSH_KEY` - Chave privada SSH completa
   - ⚠️ `VPS_HOST` - (opcional) IP da VPS (padrão: `167.235.76.26`)
   - ⚠️ `VPS_PORT` - (opcional) Porta SSH (padrão: `22`)

### Erro: "Secret names can only contain alphanumeric characters"

**Causa:** O nome do secret contém caracteres inválidos (espaços, hífens, etc.)

**Solução:**
- ✅ Use apenas letras, números e underscores: `VPS_USER`, `VPS_SSH_KEY`
- ❌ **NÃO** use: `VPS-USER`, `VPS USER`, `vps.user`, etc.
- ✅ Os nomes corretos são: `VPS_USER`, `VPS_SSH_KEY`, `VPS_HOST`, `VPS_PORT`
3. Se `VPS_SSH_KEY` não estiver configurado:
   ```bash
   # Gere a chave SSH
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key
   
   # Copie a chave pública para a VPS
   ssh-copy-id -i ~/.ssh/vps_deploy_key.pub usuario@167.235.76.26
   
   # Copie o conteúdo da chave privada
   cat ~/.ssh/vps_deploy_key
   # Cole o conteúdo completo no secret VPS_SSH_KEY no GitHub
   ```
4. Re-execute o workflow após configurar os secrets

### Build do Docker falha

**Solução:**
```bash
# Limpe o cache
docker builder prune

# Rebuild sem cache
docker build --no-cache -f Dockerfile.backend -t credgestor-backend .
```

## 📊 Monitoramento

### URLs de Produção

- **Frontend**: [https://credgestor.app.br](https://credgestor.app.br)
- **API**: [https://credgestor.app.br/api](https://credgestor.app.br/api) (via Traefik)
- **API Direta**: [http://167.235.76.26:8000](http://167.235.76.26:8000)
- **API Docs**: [https://credgestor.app.br/api/docs](https://credgestor.app.br/api/docs) ou [http://167.235.76.26:8000/docs](http://167.235.76.26:8000/docs)
- **Health Check**: [https://credgestor.app.br/api/health](https://credgestor.app.br/api/health) ou [http://167.235.76.26:8000/health](http://167.235.76.26:8000/health)

### Health Checks

- **Backend**: `GET /health`
- **Frontend**: `GET /` (retorna 200 se OK)

### Logs

```bash
# Backend logs (Docker)
docker-compose logs -f api

# Frontend logs (Docker)
docker-compose logs -f frontend

# GitHub Actions logs
# Vá em Actions → Selecione o workflow → Veja os logs
```

## 🔒 Segurança

### Boas Práticas Implementadas

- ✅ Secrets gerenciados via GitHub Secrets
- ✅ Nenhuma credencial hardcoded
- ✅ Security scanning no CI/CD
- ✅ Docker images não-root user
- ✅ Health checks configurados
- ✅ Variáveis de ambiente isoladas

### Checklist de Segurança

- [ ] Todas as credenciais em variáveis de ambiente
- [ ] `.env` no `.gitignore`
- [ ] Secrets configurados no GitHub
- [ ] Docker images escaneadas
- [ ] Dependências atualizadas
- [ ] HTTPS habilitado em produção

## 📚 Recursos Adicionais

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vite Build](https://vitejs.dev/guide/build.html)

---

**Última atualização**: $(date)
**Versão**: 1.0.0
