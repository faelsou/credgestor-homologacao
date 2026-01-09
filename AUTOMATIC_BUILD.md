# 🚀 Build Automático - Push na Branch Main

## ✅ Configuração Implementada

Toda vez que você fizer **push na branch `main`**, o GitHub Actions automaticamente:

1. ✅ Executa lint e testes
2. ✅ Cria novas imagens Docker
3. ✅ Faz push para Docker Hub
4. ✅ Cria múltiplas tags únicas

## 📋 Como Funciona

### Fluxo Automático

```bash
# 1. Você faz push na main
git checkout main
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# 2. GitHub Actions detecta o push
# 3. Executa pipeline completa
# 4. Cria e publica novas imagens no Docker Hub
```

### Tags Criadas Automaticamente

Para cada push na `main`, são criadas as seguintes tags:

#### Backend
- `faelsouz/credgestor-homologacao-backend:latest` ⭐ (sempre atualizada)
- `faelsouz/credgestor-homologacao-backend:backend-latest`
- `faelsouz/credgestor-homologacao-backend:main-{sha7}` (ex: `main-a1b2c3d`)
- `faelsouz/credgestor-homologacao-backend:backend-20250115-143022` (timestamp)
- `faelsouz/credgestor-homologacao-backend:backend-20250115-143022-a1b2c3d` (timestamp + SHA)

#### Frontend
- `faelsouz/credgestor-homologacao-frontend:latest` ⭐ (sempre atualizada)
- `faelsouz/credgestor-homologacao-frontend:frontend-latest`
- `faelsouz/credgestor-homologacao-frontend:main-{sha7}`
- `faelsouz/credgestor-homologacao-frontend:frontend-20250115-143022` (timestamp)
- `faelsouz/credgestor-homologacao-frontend:frontend-20250115-143022-a1b2c3d`

## 🔍 Verificar Build

### No GitHub Actions

1. Vá em **Actions** no repositório
2. Clique no workflow "🚀 Deploy CredGestor"
3. Veja o status do último push
4. Clique no job "🏗️ Build Docker Images"
5. Veja as tags criadas no final dos logs

### No Docker Hub

1. Acesse [Docker Hub](https://hub.docker.com/r/faelsouz/credgestor-homologacao-backend/tags)
2. Veja todas as tags disponíveis
3. A tag `latest` sempre aponta para o último build da main

## 📊 Metadata nas Imagens

Cada imagem contém informações de build:

```bash
# Ver metadata
docker inspect faelsouz/credgestor-homologacao-backend:latest

# Ver labels específicos
docker inspect faelsouz/credgestor-homologacao-backend:latest \
  --format='{{json .Config.Labels}}' | jq
```

Retorna:
```json
{
  "build.date": "20250115-143022",
  "build.git.sha": "a1b2c3d4e5f6...",
  "build.git.ref": "refs/heads/main",
  "maintainer": "CredGestor Team",
  "version": "1.0.0"
}
```

## 🎯 Garantia de Nova Imagem

Cada push na `main` cria uma **nova imagem única** porque:

1. ✅ Tag com timestamp único (`YYYYMMDD-HHMMSS`)
2. ✅ Tag com SHA do commit
3. ✅ Build args com data e SHA
4. ✅ Labels com metadata de build

Isso garante que mesmo com cache, cada build seja identificável e único.

## 🧪 Testar Localmente

```bash
# Pull da última imagem
docker pull faelsouz/credgestor-homologacao-backend:latest

# Ver quando foi criada
docker inspect faelsouz/credgestor-homologacao-backend:latest \
  --format='{{.Created}}'

# Ver metadata
docker inspect faelsouz/credgestor-homologacao-backend:latest \
  --format='Build Date: {{index .Config.Labels "build.date"}}'
```

## 🔄 Atualizar Imagens

```bash
# Pull da versão mais recente
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Usar no docker-compose
docker-compose pull
docker-compose up -d
```

## ⚙️ Configuração

### Requisitos

- ✅ Secret `DOCKERHUB_TOKEN` configurado no GitHub
- ✅ Workflow habilitado no repositório
- ✅ Permissões de write no Docker Hub

### Verificar Configuração

```bash
# Ver se o workflow está ativo
# Vá em: Settings → Actions → General
# Certifique-se de que "Allow all actions" está habilitado
```

## 📝 Logs de Build

Cada build gera logs detalhados:

```
✅ Imagens criadas com as seguintes tags:
  - faelsouz/credgestor-homologacao-backend:latest
  - faelsouz/credgestor-homologacao-backend:backend-latest
  - faelsouz/credgestor-homologacao-backend:main-a1b2c3d
  - faelsouz/credgestor-homologacao-backend:backend-20250115-143022
  - faelsouz/credgestor-homologacao-backend:backend-20250115-143022-a1b2c3d
```

## 🐛 Troubleshooting

### Build não executa

**Verificar:**
1. Workflow habilitado em Settings → Actions
2. Push foi feito na branch `main`
3. Secret `DOCKERHUB_TOKEN` está configurado

### Imagens não aparecem no Docker Hub

**Verificar:**
1. Logs do GitHub Actions para erros
2. Token do Docker Hub tem permissão de write
3. Username está correto (`faelsouz`)

### Tags não são criadas

**Verificar:**
1. Build foi executado com sucesso
2. Push foi feito (não PR)
3. Ver logs do step "List pushed tags"

## 📚 Documentação Relacionada

- [DEPLOY.md](./DEPLOY.md) - Guia completo de deploy
- [DOCKERHUB.md](./DOCKERHUB.md) - Guia do Docker Hub
- [.github/workflows/README.md](./.github/workflows/README.md) - Documentação do workflow

---

**Status**: ✅ Configurado e funcionando
**Trigger**: Push na branch `main`
**Repositório Docker Hub**: faelsouz/credgestor-homologacao
