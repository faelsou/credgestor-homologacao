# 🐳 Configuração Docker Hub - CredGestor

## ✅ Alterações Realizadas

### 1. GitHub Actions Workflow Atualizado

O workflow `.github/workflows/deploy.yaml` foi configurado para:

- ✅ Build automático das imagens Docker
- ✅ Push para Docker Hub: `faelsouz/credgestor-homologacao`
- ✅ Tags automáticas: `latest`, `develop`, `{branch}-{sha}`
- ✅ Multi-platform build: `linux/amd64` e `linux/arm64`

### 2. Imagens Criadas

As seguintes imagens serão criadas automaticamente:

- `faelsouz/credgestor-homologacao-backend:latest`
- `faelsouz/credgestor-homologacao-frontend:latest`

### 3. Docker Compose Atualizado

O `docker-compose.yml` foi atualizado para usar as imagens do Docker Hub:

```yaml
services:
  api:
    image: faelsouz/credgestor-homologacao-backend:latest
    
  frontend:
    image: faelsouz/credgestor-homologacao-frontend:latest
```

## 🔧 Configuração Necessária

### Passo 1: Criar Access Token no Docker Hub

1. Acesse [Docker Hub](https://hub.docker.com/)
2. Faça login com sua conta `faelsouz`
3. Vá em **Account Settings** → **Security**
4. Clique em **New Access Token**
5. Dê um nome: `github-actions-credgestor`
6. Permissões: **Read & Write**
7. Clique em **Generate**
8. **COPIE O TOKEN** (você só verá ele uma vez!)

### Passo 2: Adicionar Secret no GitHub

1. Acesse o repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Nome: `DOCKERHUB_TOKEN`
5. Valor: Cole o token copiado do Docker Hub
6. Clique em **Add secret**

### Passo 3: Verificar Configuração

O workflow está configurado para usar:
- Username: `faelsouz` (hardcoded no workflow)
- Token: `${{ secrets.DOCKERHUB_TOKEN }}` (do GitHub Secrets)

## 🚀 Como Funciona

### Build Automático

Quando você fizer push:

```bash
# Para branch main
git push origin main
# → Cria: faelsouz/credgestor-homologacao-backend:latest
# → Cria: faelsouz/credgestor-homologacao-frontend:latest

# Para branch develop
git push origin develop
# → Cria: faelsouz/credgestor-homologacao-backend:develop
# → Cria: faelsouz/credgestor-homologacao-frontend:develop
```

### Build Manual

Você também pode executar o workflow manualmente:

1. Vá em **Actions** → **Deploy CredGestor**
2. Clique em **Run workflow**
3. Selecione a branch
4. Clique em **Run workflow**

## 📥 Usar as Imagens

### Docker Compose

```bash
# Pull das imagens mais recentes
docker-compose pull

# Iniciar serviços
docker-compose up -d
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

## 🔍 Verificar Status

### GitHub Actions

1. Vá em **Actions** no GitHub
2. Veja o status do workflow `Deploy CredGestor`
3. Clique no job para ver logs detalhados

### Docker Hub

1. Acesse [Docker Hub - faelsouz/credgestor-homologacao](https://hub.docker.com/r/faelsouz/credgestor-homologacao)
2. Veja as tags disponíveis
3. Verifique quando foi a última atualização

## 🧪 Testar Localmente

```bash
# Pull das imagens
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Verificar imagens
docker images | grep credgestor-homologacao

# Testar backend
docker run --rm -p 8000:8000 \
  --env-file .env \
  faelsouz/credgestor-homologacao-backend:latest

# Em outro terminal, testar
curl http://localhost:8000/health
```

## 🐛 Troubleshooting

### Erro: "unauthorized: authentication required"

**Causa**: Token do Docker Hub não configurado ou inválido

**Solução**:
1. Verifique se o secret `DOCKERHUB_TOKEN` existe no GitHub
2. Verifique se o token está correto
3. Gere um novo token se necessário

### Erro: "denied: requested access to the resource is denied"

**Causa**: Token sem permissão de write ou username incorreto

**Solução**:
1. Verifique se o token tem permissão **Read & Write**
2. Verifique se o username no workflow está correto (`faelsouz`)

### Imagens não aparecem no Docker Hub

**Causa**: Build falhou ou não foi executado

**Solução**:
1. Verifique os logs do GitHub Actions
2. Certifique-se de que o workflow foi executado
3. Verifique se não há erros no build

## 📚 Documentação Adicional

- [DOCKERHUB.md](./DOCKERHUB.md) - Guia completo do Docker Hub
- [DEPLOY.md](./DEPLOY.md) - Guia completo de deploy
- [.github/workflows/README.md](./.github/workflows/README.md) - Documentação do workflow

## ✅ Checklist

- [ ] Access Token criado no Docker Hub
- [ ] Secret `DOCKERHUB_TOKEN` adicionado no GitHub
- [ ] Workflow testado (push ou manual)
- [ ] Imagens aparecem no Docker Hub
- [ ] Docker Compose atualizado para usar as imagens
- [ ] Testado pull e execução das imagens localmente

---

**Status**: ✅ Configurado e pronto para uso
**Repositório Docker Hub**: faelsouz/credgestor-homologacao
