# 🔐 Configurar Docker Hub no GitHub

## ⚠️ IMPORTANTE: Segurança

**NUNCA commite credenciais no código!** Use sempre GitHub Secrets.

## 📋 Passo a Passo

### 1. Criar Access Token no Docker Hub

1. Acesse: https://hub.docker.com/settings/security
2. Faça login com sua conta: `faelsouz`
3. Vá em **Account Settings** → **Security**
4. Clique em **New Access Token**
5. Dê um nome: `github-actions-credgestor`
6. Permissões: **Read & Write**
7. Clique em **Generate**
8. **COPIE O TOKEN** (você só verá ele uma vez!)

### 2. Adicionar Secret no GitHub

1. Acesse: https://github.com/faelsou/credgestor-homologacao/settings/secrets/actions
2. Clique em **New repository secret**
3. Nome: `DOCKERHUB_TOKEN`
4. Valor: Cole o **Access Token** do Docker Hub (NÃO a senha!)
5. Clique em **Add secret**

### 3. Verificar Configuração

O workflow já está configurado para usar:
- Username: `faelsouz` (hardcoded no workflow)
- Token: `${{ secrets.DOCKERHUB_TOKEN }}` (do GitHub Secrets)

## 🔄 Após Configurar

Após adicionar o secret, o próximo push na branch `main` irá:
1. ✅ Fazer login no Docker Hub automaticamente
2. ✅ Build das imagens Docker
3. ✅ Push para `faelsouz/credgestor-homologacao-backend:latest`
4. ✅ Push para `faelsouz/credgestor-homologacao-frontend:latest`

## 🧪 Testar

Após configurar, faça um push de teste:

```bash
git checkout main
git merge feat/devops-ci-cd-dockerhub
git push origin main
```

Verifique em:
- **GitHub Actions**: https://github.com/faelsou/credgestor-homologacao/actions
- **Docker Hub**: https://hub.docker.com/r/faelsouz/credgestor-homologacao-backend

## ⚠️ Nota sobre Senha

**NÃO use a senha diretamente!** Use sempre um Access Token:
- Mais seguro
- Pode ser revogado facilmente
- Não expõe sua senha principal
- Permite controle de permissões

## 🔒 Segurança

- ✅ Token armazenado como GitHub Secret (criptografado)
- ✅ Nunca exposto em logs
- ✅ Pode ser revogado a qualquer momento
- ✅ Permissões limitadas (Read & Write apenas)

---

**Status**: Aguardando configuração do secret `DOCKERHUB_TOKEN` no GitHub
