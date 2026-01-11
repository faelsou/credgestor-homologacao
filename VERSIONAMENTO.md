# 📦 Sistema de Versionamento de Imagens Docker

## Visão Geral

O projeto agora usa tags de versão específicas (ex: `v1.0.5`) em vez de `latest` para melhor controle de versões e rollback.

## Arquivos

- **`VERSION`**: Arquivo que contém a versão atual (formato: `1.0.5`)
- **`docker-compose.yml`**: Usa variável `DOCKER_VERSION` com fallback para versão do arquivo VERSION
- **`scripts/increment-version.sh`**: Script para incrementar versão automaticamente
- **`scripts/update-docker-compose-version.sh`**: Script para atualizar docker-compose.yml

## Como Usar

### 1. Incrementar Versão Automaticamente

```bash
# Incrementar patch (1.0.5 → 1.0.6)
./scripts/increment-version.sh patch

# Incrementar minor (1.0.5 → 1.1.0)
./scripts/increment-version.sh minor

# Incrementar major (1.0.5 → 2.0.0)
./scripts/increment-version.sh major
```

O script irá:
- ✅ Atualizar o arquivo `VERSION`
- ✅ Atualizar o `docker-compose.yml`
- ✅ Mostrar instruções para commit e tag

### 2. Atualizar Versão Manualmente

```bash
# Atualizar para versão específica
./scripts/update-docker-compose-version.sh 1.0.6
```

Ou edite manualmente:
```bash
# Editar VERSION
echo "1.0.6" > VERSION

# Atualizar docker-compose.yml
./scripts/update-docker-compose-version.sh
```

### 3. Workflow Completo de Deploy

```bash
# 1. Fazer alterações no código
# ... editar arquivos ...

# 2. Incrementar versão
./scripts/increment-version.sh patch

# 3. Commit e push
git add .
git commit -m "feat: Nova funcionalidade

- Descrição das mudanças
- Versão: v1.0.6"
git push origin main

# 4. Criar tag (opcional, mas recomendado)
git tag v1.0.6
git push origin main --tags

# 5. Deploy na VPS
source .env
export DOCKER_VERSION=v1.0.6
docker stack deploy -c docker-compose.yml credgestor
```

## Variáveis de Ambiente

O `docker-compose.yml` usa a variável `DOCKER_VERSION`:

```yaml
image: faelsouz/credgestor-homologacao-backend:${DOCKER_VERSION:-v1.0.5}
```

- Se `DOCKER_VERSION` estiver definida, usa essa versão
- Caso contrário, usa o fallback `v1.0.5` (atualizar manualmente no docker-compose.yml)

## GitHub Actions

O workflow `.github/workflows/deploy.yaml` já está configurado para criar tags de versão quando você criar uma tag git:

```bash
git tag v1.0.6
git push origin main --tags
```

O GitHub Actions criará automaticamente:
- `faelsouz/credgestor-homologacao-backend:v1.0.6`
- `faelsouz/credgestor-homologacao-frontend:v1.0.6`
- `faelsouz/credgestor-homologacao-backend:latest` (também)
- `faelsouz/credgestor-homologacao-frontend:latest` (também)

## Deploy com Versão Específica

### Na VPS:

```bash
cd /var/www/credgestor-homologacao

# Opção 1: Usar variável de ambiente
source .env
export DOCKER_VERSION=v1.0.6
docker stack deploy -c docker-compose.yml credgestor

# Opção 2: Atualizar docker-compose.yml diretamente
# (já vem com a versão mais recente após increment-version.sh)
source .env
docker stack deploy -c docker-compose.yml credgestor
```

## Rollback

Para voltar para uma versão anterior:

```bash
export DOCKER_VERSION=v1.0.4
docker stack deploy -c docker-compose.yml credgestor
```

## Verificar Versão Atual

```bash
# Ver versão no arquivo
cat VERSION

# Ver versão no docker-compose.yml
grep DOCKER_VERSION docker-compose.yml

# Ver versão das imagens em execução
docker service ps credgestor_api --format "{{.Image}}"
docker service ps credgestor_site --format "{{.Image}}"
```

## Convenções de Versionamento

Seguindo [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

### Exemplos:

- `1.0.5 → 1.0.6`: Correção de bug
- `1.0.5 → 1.1.0`: Nova funcionalidade
- `1.0.5 → 2.0.0`: Mudança quebra compatibilidade

## Checklist para Nova Versão

- [ ] Fazer alterações no código
- [ ] Executar `./scripts/increment-version.sh patch` (ou minor/major)
- [ ] Testar localmente (se possível)
- [ ] Commit: `git add . && git commit -m "feat: Descrição - v1.0.6"`
- [ ] Push: `git push origin main`
- [ ] Tag: `git tag v1.0.6 && git push origin main --tags`
- [ ] Aguardar GitHub Actions criar imagens
- [ ] Deploy na VPS com versão específica
