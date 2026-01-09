## 🚀 Implementa CI/CD Completo com Docker Hub e Build Automático

### 📋 Resumo

Este PR implementa um pipeline completo de CI/CD com GitHub Actions, integração com Docker Hub e build automático de imagens Docker.

### ✨ Principais Alterações

#### 1. GitHub Actions Workflow
- ✅ Pipeline completo de CI/CD (`.github/workflows/deploy.yaml`)
- ✅ Lint e formatação automática
- ✅ Testes backend e frontend
- ✅ Build automático de imagens Docker
- ✅ Push para Docker Hub (`faelsouz/credgestor-homologacao`)
- ✅ Security scanning (Trivy + TruffleHog)
- ✅ Deploy automático para staging/production

#### 2. Docker Hub Integration
- ✅ Build automático a cada push na branch `main`
- ✅ Múltiplas tags por imagem (latest, timestamp, SHA)
- ✅ Metadata de build nas imagens
- ✅ Multi-platform support (amd64, arm64)

#### 3. Dockerfiles Otimizados
- ✅ `Dockerfile.backend`: Multi-stage build, usuário não-root
- ✅ `Dockerfile.frontend`: Build otimizado com Nginx
- ✅ Health checks configurados
- ✅ Labels com metadata de build

#### 4. Segurança
- ✅ Remoção de credenciais hardcoded
- ✅ Uso de variáveis de ambiente
- ✅ `.env.example` criado
- ✅ `.env` adicionado ao `.gitignore`
- ✅ Tratamento robusto de erros

#### 5. Documentação
- ✅ `DEPLOY.md`: Guia completo de deploy
- ✅ `DOCKERHUB.md`: Guia do Docker Hub
- ✅ `AUTOMATIC_BUILD.md`: Documentação do build automático
- ✅ `DOCKERHUB_SETUP.md`: Guia de configuração
- ✅ Scripts de setup local

### 🎯 Funcionalidades

#### Build Automático
- **Trigger**: Push na branch `main`
- **Ações**: Lint → Testes → Build → Push Docker Hub
- **Tags Criadas**:
  - `latest` (sempre atualizada)
  - `{component}-latest`
  - `{component}-{YYYYMMDD-HHMMSS}` (timestamp único)
  - `{component}-{YYYYMMDD-HHMMSS}-{sha7}`

#### Imagens Docker Hub
- `faelsouz/credgestor-homologacao-backend:latest`
- `faelsouz/credgestor-homologacao-frontend:latest`

### ⚙️ Configuração Necessária

Após merge, configure:

1. **Docker Hub Token** no GitHub Secrets:
   - Nome: `DOCKERHUB_TOKEN`
   - Valor: Access Token do Docker Hub

2. **Outros Secrets** (opcional):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### 🧪 Como Testar

```bash
# 1. Fazer merge do PR
# 2. Fazer push na main
git checkout main
git merge feat/devops-ci-cd-dockerhub
git push origin main

# 3. Verificar GitHub Actions
# Vá em: Actions → Deploy CredGestor

# 4. Verificar Docker Hub
# https://hub.docker.com/r/faelsouz/credgestor-homologacao-backend
```

### ✅ Checklist

- [x] Pipeline CI/CD implementado
- [x] Dockerfiles criados e otimizados
- [x] Integração com Docker Hub configurada
- [x] Build automático na branch main
- [x] Segurança implementada (sem credenciais hardcoded)
- [x] Documentação completa
- [x] Scripts de setup local
- [x] Health checks configurados
- [x] Metadata de build nas imagens
