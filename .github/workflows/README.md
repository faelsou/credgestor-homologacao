# 🚀 GitHub Actions Workflows

## Deploy Workflow

O workflow `deploy.yaml` automatiza todo o processo de CI/CD:

### Funcionalidades

- ✅ Lint e formatação de código
- ✅ Testes backend e frontend
- ✅ Build de imagens Docker
- ✅ Push para Docker Hub (`faelsouz/credgestor-homologacao`)
- ✅ Security scanning
- ✅ Deploy automático

### ⚡ Trigger Automático na Branch Main

**Toda vez que você fizer push na branch `main`, o workflow:**

1. ✅ Executa lint e testes
2. ✅ Cria novas imagens Docker
3. ✅ Faz push para Docker Hub com múltiplas tags:
   - `latest` - Sempre atualizada
   - `backend-latest` / `frontend-latest` - Por componente
   - `{component}-{YYYYMMDD-HHMMSS}` - Timestamp único
   - `{component}-{YYYYMMDD-HHMMSS}-{sha7}` - Timestamp + SHA

### Configuração Necessária

1. **Docker Hub Token** (obrigatório):
   - Crie um Access Token no Docker Hub
   - Adicione como `DOCKERHUB_TOKEN` no GitHub Secrets

2. **Outros Secrets** (opcionais):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### Imagens Criadas

- `faelsouz/credgestor-homologacao-backend:latest`
- `faelsouz/credgestor-homologacao-frontend:latest`

### Tags Criadas em Push para Main

Cada push na branch `main` cria as seguintes tags:

**Backend:**
- `faelsouz/credgestor-homologacao-backend:latest`
- `faelsouz/credgestor-homologacao-backend:backend-latest`
- `faelsouz/credgestor-homologacao-backend:main-{sha7}`
- `faelsouz/credgestor-homologacao-backend:backend-{YYYYMMDD-HHMMSS}`
- `faelsouz/credgestor-homologacao-backend:backend-{YYYYMMDD-HHMMSS}-{sha7}`

**Frontend:**
- `faelsouz/credgestor-homologacao-frontend:latest`
- `faelsouz/credgestor-homologacao-frontend:frontend-latest`
- `faelsouz/credgestor-homologacao-frontend:main-{sha7}`
- `faelsouz/credgestor-homologacao-frontend:frontend-{YYYYMMDD-HHMMSS}`
- `faelsouz/credgestor-homologacao-frontend:frontend-{YYYYMMDD-HHMMSS}-{sha7}`

### Triggers

- **Push para `main`** → ✅ Build completo + Push com todas as tags
- **Push para `develop`** → Build + Push com tag `develop`
- **Push de tag `v*`** → Build + Push com versão semântica
- **Pull Request** → Build apenas (sem push)
- **Workflow Dispatch** → Deploy manual

### Exemplo de Uso

```bash
# Fazer push na main
git checkout main
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# O workflow automaticamente:
# 1. Roda testes
# 2. Cria novas imagens
# 3. Faz push para Docker Hub
# 4. Cria tags com timestamp único
```

### Verificar Status

1. Vá em **Actions** no GitHub
2. Veja o workflow "Deploy CredGestor"
3. Clique no job "Build Docker Images"
4. Veja as tags criadas no final do log

### Metadata nas Imagens

Cada imagem contém metadata de build:

```bash
docker inspect faelsouz/credgestor-homologacao-backend:latest | grep -A 10 Labels
```

Retorna:
- `build.date`: Data/hora do build
- `build.git.sha`: SHA completo do commit
- `build.git.ref`: Branch/tag do build

---

**Última atualização**: $(date)