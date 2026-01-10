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
| `DATABASE_URL` | ⚠️ Opcional | Connection string PostgreSQL do Supabase (para código legacy). Formato: `postgresql://postgres:password@db.project.supabase.co:5432/postgres` |

### Frontend (Vite)

⚠️ **IMPORTANTE**: As variáveis do Vite devem ser configuradas durante o BUILD da imagem Docker (build-time), não em runtime!

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_API_BASE_URL` | ⚠️ Opcional | URL base da API (padrão: `http://localhost:8000`). Em produção: `https://credgestor.app.br/api` (configurado automaticamente no GitHub Actions se não fornecido) |
| `VITE_API_LOGIN_URL` | ⚠️ Opcional | URL específica para login (sobrescreve `VITE_API_BASE_URL/auth/login`) |
| `VITE_SUPABASE_URL` | ✅ **Recomendado** | URL do Supabase para frontend (ex: `https://aclyrcuahiujgtjuimoh.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | ✅ **Recomendado** | Anon Key do Supabase para frontend |
| `VITE_N8N_BASE_URL` | ⚠️ Opcional | URL do backend N8N |
| `VITE_N8N_TENANT_ID` | ⚠️ Opcional | Tenant ID para N8N |

**Nota para Produção:**
- Em produção, `VITE_API_BASE_URL` é configurado automaticamente como `https://credgestor.app.br/api` no GitHub Actions
- Você pode sobrescrever configurando o secret `VITE_API_BASE_URL` no GitHub
- O frontend está disponível em: `https://credgestor.app.br`
- A API está disponível em: `https://credgestor.app.br/api` (via Traefik) ou `http://167.235.76.26:8000` (acesso direto)
- O Traefik está configurado para rotear `/api/*` para o backend automaticamente

**⚠️ Como configurar variáveis do Vite:**
1. As variáveis devem ser passadas como `build-args` durante o build da imagem Docker
2. Configure os secrets no GitHub: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. O workflow do GitHub Actions já está configurado para passar essas variáveis automaticamente
4. Se a imagem foi construída sem essas variáveis, será necessário reconstruir a imagem

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

**Nota:** Este erro só ocorre se você estiver tentando usar o código legacy. Se estiver usando Supabase como banco principal, este erro pode ser ignorado (o código legacy não será usado).

**Solução (se precisar do código legacy):**
1. Obtenha a connection string do Supabase:
   - Acesse o dashboard do Supabase: https://app.supabase.com
   - Vá em **Project Settings** → **Database**
   - Copie a **Connection string** (formato: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`)

2. Adicione ao arquivo `.env` na VPS:
```bash
# Verifique se o arquivo .env existe
ls -la .env

   # Se não existir, crie um novo
   nano .env
   
   # Adicione a DATABASE_URL:
   DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
   ```

**Exemplo de `.env` completo:**
```bash
SUPABASE_URL=https://aclyrcuahiujgtjuimoh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-anon-key
DATABASE_URL=postgresql://postgres:password@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres
```

### Erro: Login não funciona / "Credenciais inválidas"

**Possíveis causas e soluções:**

1. **Verificar se a API está acessível:**
   ```bash
   # Testar health check da API
   curl https://credgestor.app.br/api/health
   # ou
   curl http://167.235.76.26:8000/health
   ```

2. **Verificar logs do backend:**
   ```bash
   # Ver logs do serviço da API
   docker service logs --tail 100 credgestor_api
   ```

3. **Verificar variáveis de ambiente do backend:**
   - Certifique-se de que `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` estão configuradas no `.env` da VPS

4. **Verificar se o usuário existe no Supabase:**
   - Acesse o dashboard do Supabase: https://app.supabase.com
   - Vá em **Authentication** → **Users**
   - Verifique se o email do usuário existe e está ativo

5. **Verificar console do navegador:**
   - Abra o DevTools (F12)
   - Vá na aba **Console** e **Network**
   - Tente fazer login e veja os erros no console
   - Verifique se a requisição para `/api/auth/login` está sendo feita
   - Verifique o status da resposta (200, 401, 500, etc.)

6. **Verificar URL da API:**
   - O frontend tenta detectar automaticamente a URL da API
   - Em produção, deve usar: `https://credgestor.app.br/api`
   - Se não funcionar, configure `VITE_API_BASE_URL=https://credgestor.app.br/api` no build

7. **Testar login diretamente na API:**
   ```bash
   curl -X POST https://credgestor.app.br/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"seu-email@exemplo.com","senha":"sua-senha","tenant_id":null}'
   ```

8. **Verificar CORS:**
   - O backend já está configurado com CORS permitindo todas as origens
   - Se ainda houver problemas, verifique os logs do backend

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
# Backend logs (Docker Compose)
docker-compose logs -f api

# Frontend logs (Docker Compose)
docker-compose logs -f frontend

# Backend logs (Docker Swarm)
docker service logs -f credgestor_api

# Frontend logs (Docker Swarm)
docker service logs -f credgestor_site

# Ver logs das últimas 100 linhas
docker service logs --tail 100 credgestor_site

# Ver status dos serviços
docker service ps credgestor_site

# Ver detalhes de um serviço específico
docker service inspect credgestor_site

# GitHub Actions logs
# Vá em Actions → Selecione o workflow → Veja os logs
```

### Troubleshooting: Serviço com 0 réplicas

Se um serviço mostrar `0 / 1` réplicas (como `credgestor_site`), significa que o container está crashando:

```bash
# 1. Ver logs do serviço para identificar o erro
docker service logs --tail 200 credgestor_site

# 2. Ver status detalhado do serviço
docker service ps credgestor_site --no-trunc

# 3. Verificar se a imagem existe e está atualizada
docker images | grep credgestor-homologacao-frontend

# 4. Fazer pull da imagem mais recente
docker pull faelsouz/credgestor-homologacao-frontend:latest

# 5. Verificar se a rede existe
docker network ls | grep network_public

# 6. Recriar o serviço
docker service update --force credgestor_site

# 7. Se o problema persistir, remover e recriar o stack
docker stack rm credgestor
# Aguarde alguns segundos
docker stack deploy -c docker-compose.yml credgestor
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
