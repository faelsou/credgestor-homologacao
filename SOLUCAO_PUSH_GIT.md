# 🚀 Solução para Push no Git - Erro 403

## ❌ Problema Atual

O push está falhando com erro 403 porque o token não tem permissão de **ESCRITA**.

```
remote: Permission to faelsou/credgestor-homologacao.git denied to faelsou.
fatal: unable to access 'https://github.com/faelsou/credgestor-homologacao.git/': The requested URL returned error: 403
```

## ✅ Solução Definitiva: Criar Novo Token com Permissão Completa

### Passo 1: Criar Token no GitHub

1. Acesse: **https://github.com/settings/tokens**
2. Clique em **"Generate new token"** > **"Generate new token (classic)"**
3. Configure:
   - **Note**: `VPS Deploy - Escrita Completa`
   - **Expiration**: Escolha um prazo (ex: 90 dias ou "No expiration")
   - **Permissões**: Marque **"repo"** (TODAS as opções dentro de repo)
     - ✅ **repo:status**
     - ✅ **repo_deployment**
     - ✅ **public_repo** (ou **repo** se for repositório privado)
     - ✅ **repo:invite**
     - ✅ **security_events**
4. Clique em **"Generate token"**
5. **COPIE O TOKEN** (você só verá uma vez!)

### Passo 2: Configurar Git com Novo Token

```bash
cd /var/www/credgestor-homologacao

# Substitua NOVO_TOKEN pelo token que você copiou
git remote set-url origin https://NOVO_TOKEN@github.com/faelsou/credgestor-homologacao.git

# Verificar
git remote -v
```

### Passo 3: Fazer Push

```bash
# Push para main (já fizemos merge)
git push origin main

# Ou se quiser manter o branch deploy-url-secrets
git checkout deploy-url-secrets
git push origin deploy-url-secrets
```

## 🔄 Alternativa: Usar SSH (Mais Seguro)

Se preferir usar SSH em vez de token:

### 1. Gerar Chave SSH

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
# Pressione Enter para aceitar o local padrão
# Opcional: adicione uma senha para a chave
```

### 2. Copiar Chave Pública

```bash
cat ~/.ssh/id_ed25519.pub
# Copie toda a saída
```

### 3. Adicionar no GitHub

1. Acesse: **https://github.com/settings/keys**
2. Clique em **"New SSH key"**
3. Cole a chave pública
4. Dê um título (ex: "VPS Manager01")
5. Clique em **"Add SSH key"**

### 4. Configurar Git para Usar SSH

```bash
cd /var/www/credgestor-homologacao
git remote set-url origin git@github.com:faelsou/credgestor-homologacao.git
git push origin main
```

## 📋 Status Atual

- ✅ **Merge concluído**: `deploy-url-secrets` → `main`
- ✅ **Commits prontos**: 15 commits com todas as correções
- ❌ **Push pendente**: Aguardando token com permissão de escrita

## 🎯 Correções Incluídas nos Commits

1. ✅ Erro "body is not defined" corrigido
2. ✅ `DEFAULT_TENANT_ID` com valor padrão
3. ✅ Arquivo `SQL_VERIFICAR_USUARIOS.md` adicionado
4. ✅ Melhorias no tratamento de erros no login

## ⚠️ Importante

- **NUNCA** compartilhe seu token ou chave SSH
- **NUNCA** faça commit do token no código
- Use tokens com permissões mínimas necessárias
- Revogue tokens antigos que não usa mais

## 🚀 Após o Push

Quando o push for bem-sucedido:

1. O **GitHub Actions** vai detectar o push
2. Vai fazer **rebuild automático** do frontend
3. Vai fazer **push da nova imagem** para Docker Hub
4. Você pode fazer **deploy** na VPS:
   ```bash
   cd /var/www/credgestor-homologacao
   docker pull faelsouz/credgestor-homologacao-frontend:latest
   docker stack deploy -c docker-compose.yml credgestor
   ```
