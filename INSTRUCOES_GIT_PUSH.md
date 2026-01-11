# 🔐 Instruções para Fazer Push no Git

## Problema
O Git não aceita mais autenticação por senha. É necessário usar um **Personal Access Token (PAT)**.

## Solução

### Opção 1: Usar Personal Access Token na URL (Recomendado)

1. **Criar um Personal Access Token no GitHub:**
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token" > "Generate new token (classic)"
   - Dê um nome (ex: "VPS Deploy")
   - Selecione as permissões: `repo` (todas as opções)
   - Clique em "Generate token"
   - **COPIE O TOKEN** (você só verá uma vez!)

2. **Configurar o Git remote com o token:**
   ```bash
   cd /var/www/credgestor-homologacao
   
   # Substitua SEU_TOKEN pelo token que você copiou
   git remote set-url origin https://SEU_TOKEN@github.com/faelsou/credgestor-homologacao.git
   
   # Verificar
   git remote -v
   ```

3. **Fazer push:**
   ```bash
   git push origin main
   # ou
   git push origin deploy-url-secrets
   ```

### Opção 2: Usar Git Credential Helper

```bash
# Configurar credential helper
git config --global credential.helper store

# Na primeira vez, o Git vai pedir usuário e senha
# Usuário: seu-username-do-github
# Senha: SEU_PERSONAL_ACCESS_TOKEN (não sua senha do GitHub!)
git push origin main
```

### Opção 3: Usar SSH (Mais Seguro)

1. **Gerar chave SSH (se ainda não tiver):**
   ```bash
   ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
   # Pressione Enter para aceitar o local padrão
   # Opcional: adicione uma senha para a chave
   ```

2. **Copiar a chave pública:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copie toda a saída
   ```

3. **Adicionar no GitHub:**
   - Acesse: https://github.com/settings/keys
   - Clique em "New SSH key"
   - Cole a chave pública
   - Salve

4. **Configurar o Git para usar SSH:**
   ```bash
   git remote set-url origin git@github.com:faelsou/credgestor-homologacao.git
   git push origin main
   ```

## Verificar Status

```bash
# Ver branch atual
git branch

# Ver mudanças não commitadas
git status

# Ver histórico
git log --oneline -5
```

## ⚠️ Importante

- **NUNCA** compartilhe seu Personal Access Token
- **NUNCA** faça commit do token no código
- Use tokens com permissões mínimas necessárias
- Revogue tokens antigos que não usa mais
