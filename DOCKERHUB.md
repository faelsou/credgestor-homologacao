# 🐳 Docker Hub - CredGestor

Este documento descreve como as imagens Docker são criadas e publicadas no Docker Hub.

## 📦 Repositório

**Docker Hub**: `faelsouz/credgestor-homologacao`

**Imagens disponíveis:**
- `faelsouz/credgestor-homologacao-backend:latest` - Backend FastAPI
- `faelsouz/credgestor-homologacao-frontend:latest` - Frontend React + Vite

## 🚀 Build Automático

As imagens são construídas e publicadas automaticamente via GitHub Actions quando:

- ✅ Push para branch `main` → Tag `latest`
- ✅ Push para branch `develop` → Tag `develop`
- ✅ Pull Request → Build sem push (apenas validação)

## 🔐 Configuração

### 1. Criar Access Token no Docker Hub

1. Acesse [Docker Hub](https://hub.docker.com/)
2. Vá em **Account Settings** → **Security**
3. Clique em **New Access Token**
4. Dê um nome (ex: `github-actions`)
5. Copie o token gerado

### 2. Adicionar Secret no GitHub

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Nome: `DOCKERHUB_TOKEN`
4. Valor: Cole o token do Docker Hub
5. Clique em **Add secret**

## 📋 Tags Disponíveis

As imagens são taggeadas automaticamente com:

- `latest` - Última versão na branch main
- `develop` - Última versão na branch develop
- `{branch}-{sha}` - SHA do commit por branch
- `backend-latest` - Última versão do backend
- `frontend-latest` - Última versão do frontend

## 🏗️ Build Manual

### Backend

```bash
docker build -f Dockerfile.backend \
  -t faelsouz/credgestor-homologacao-backend:latest .

# Push para Docker Hub
docker login
docker push faelsouz/credgestor-homologacao-backend:latest
```

### Frontend

```bash
docker build -f Dockerfile.frontend \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t faelsouz/credgestor-homologacao-frontend:latest .

# Push para Docker Hub
docker login
docker push faelsouz/credgestor-homologacao-frontend:latest
```

## 📥 Uso das Imagens

### Docker Compose

O `docker-compose.yml` já está configurado para usar as imagens do Docker Hub:

```yaml
services:
  api:
    image: faelsouz/credgestor-homologacao-backend:latest
    
  frontend:
    image: faelsouz/credgestor-homologacao-frontend:latest
```

### Docker Run

```bash
# Backend
docker run -d \
  --name credgestor-backend \
  -p 8000:8000 \
  --env-file .env \
  faelsouz/credgestor-homologacao-backend:latest

# Frontend
docker run -d \
  --name credgestor-frontend \
  -p 3000:80 \
  faelsouz/credgestor-homologacao-frontend:latest
```

## 🔍 Verificar Imagens

```bash
# Listar imagens locais
docker images | grep credgestor-homologacao

# Ver detalhes de uma imagem
docker inspect faelsouz/credgestor-homologacao-backend:latest

# Ver logs do build
docker history faelsouz/credgestor-homologacao-backend:latest
```

## 🧪 Testar Imagens Localmente

```bash
# Pull das imagens
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Testar backend
docker run --rm -p 8000:8000 \
  --env-file .env \
  faelsouz/credgestor-homologacao-backend:latest

# Testar frontend
docker run --rm -p 3000:80 \
  faelsouz/credgestor-homologacao-frontend:latest
```

## 🔄 Atualizar Imagens

As imagens são atualizadas automaticamente via CI/CD. Para forçar atualização:

```bash
# Pull da versão mais recente
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Recriar containers
docker-compose up -d --force-recreate
```

## 📊 Status das Builds

Você pode verificar o status das builds em:

- **GitHub Actions**: `.github/workflows/deploy.yaml`
- **Docker Hub**: [faelsouz/credgestor-homologacao](https://hub.docker.com/r/faelsouz/credgestor-homologacao)

## 🐛 Troubleshooting

### Erro: "unauthorized: authentication required"

**Solução:**
```bash
docker login
# Use seu username e password do Docker Hub
```

### Erro: "denied: requested access to the resource is denied"

**Solução:**
- Verifique se o token do Docker Hub está correto no GitHub Secrets
- Verifique se você tem permissão para push no repositório

### Imagem não atualiza

**Solução:**
```bash
# Forçar pull sem cache
docker pull --no-cache faelsouz/credgestor-homologacao-backend:latest

# Remover imagem antiga
docker rmi faelsouz/credgestor-homologacao-backend:latest

# Pull novamente
docker pull faelsouz/credgestor-homologacao-backend:latest
```

## 📚 Links Úteis

- [Docker Hub](https://hub.docker.com/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions - Docker](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)

---

**Última atualização**: $(date)
**Repositório**: faelsouz/credgestor-homologacao
