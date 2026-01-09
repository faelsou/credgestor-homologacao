# 🔧 Troubleshooting Docker Hub

## ❌ Erro: "access token has insufficient scopes"

### Problema
```
ERROR: failed to fetch oauth token: unexpected status from GET request to https://auth.docker.io/token?scope=repository%3Afaelsouz%2Fcredgestor-homologacao-backend%3Apull%2Cpush&service=registry.docker.io: 401 Unauthorized: access token has insufficient scopes
```

### Causa
O Access Token do Docker Hub não tem permissões suficientes para fazer **push** de imagens.

### Solução

1. **Verifique o Token Atual:**
   - Acesse: https://hub.docker.com/settings/security
   - Veja os tokens existentes
   - Verifique as permissões de cada token

2. **Crie um Novo Token com Permissões Corretas:**
   - Clique em **New Access Token**
   - Nome: `github-actions-credgestor-v2`
   - **Permissões: Read, Write & Delete** (ou pelo menos **Read & Write**)
   - ⚠️ **CRÍTICO**: O token DEVE ter permissão de **Write**
   - Clique em **Generate**
   - Copie o token

3. **Atualize o Secret no GitHub:**
   - Acesse: https://github.com/faelsou/credgestor-homologacao/settings/secrets/actions
   - Edite o secret `DOCKERHUB_TOKEN`
   - Cole o novo token
   - Salve

4. **Teste Novamente:**
   - Faça um push na branch `main`
   - Verifique o workflow em Actions

### Verificar Permissões do Token

O token precisa ter pelo menos:
- ✅ **Read** - Para fazer pull de imagens
- ✅ **Write** - Para fazer push de imagens (OBRIGATÓRIO)
- ⚠️ **Delete** - Opcional, mas recomendado

## ⚠️ Warning: "FromAsCasing"

### Problema
```
1 warning found: FromAsCasing: 'as' and 'FROM' keywords' casing do not match (line 2)
```

### Solução
Use `AS` (maiúsculas) ao invés de `as` (minúsculas) no Dockerfile:

```dockerfile
# ❌ Incorreto
FROM python:3.11-slim as builder

# ✅ Correto
FROM python:3.11-slim AS builder
```

## 🔍 Verificar Token no Docker Hub

### Via Docker CLI

```bash
# Testar login
docker login -u faelsouz -p <SEU_TOKEN>
docker push faelsouz/credgestor-homologacao-backend:test

# Se funcionar, o token está correto
```

### Via API Docker Hub

```bash
# Testar autenticação
curl -u faelsouz:<SEU_TOKEN> https://auth.docker.io/token?service=registry.docker.io&scope=repository:faelsouz/credgestor-homologacao-backend:pull,push
```

Se retornar um token, está funcionando. Se retornar 401, o token não tem permissões suficientes.

## 📋 Checklist de Verificação

- [ ] Token criado no Docker Hub
- [ ] Token tem permissão **Write** (obrigatório)
- [ ] Secret `DOCKERHUB_TOKEN` adicionado no GitHub
- [ ] Username correto no workflow: `faelsouz`
- [ ] Workflow executado após configurar o token

## 🔄 Recriar Token

Se o token atual não funcionar:

1. **Revogue o token antigo:**
   - Docker Hub → Settings → Security
   - Clique em **Revoke** no token antigo

2. **Crie um novo token:**
   - Clique em **New Access Token**
   - Permissões: **Read, Write & Delete**
   - Copie o token

3. **Atualize no GitHub:**
   - Settings → Secrets → Actions
   - Edite `DOCKERHUB_TOKEN`
   - Cole o novo token

## 🐛 Outros Erros Comuns

### Erro: "unauthorized: authentication required"
- Token não configurado ou inválido
- Verifique se o secret existe no GitHub

### Erro: "denied: requested access to the resource is denied"
- Token sem permissão de Write
- Username incorreto
- Repositório não existe no Docker Hub

### Erro: "repository does not exist"
- Crie o repositório no Docker Hub primeiro
- Ou o workflow criará automaticamente no primeiro push

## 📚 Links Úteis

- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Buildx Cache](https://docs.docker.com/build/cache/)

---

**Última atualização**: Janeiro 2025
