# 🔧 Solução para Problema de Login

## ❌ Problema

Após cadastrar o usuário no banco de dados, não é possível fazer login na aplicação com a mensagem:
**"Credenciais inválidas ou problema ao conectar ao backend."**

## 🔍 Causa do Problema

O sistema CredGestor usa **Supabase Auth** para autenticação. Isso significa que:

1. **O usuário DEVE existir na tabela `auth.users`** (tabela do Supabase Auth)
2. O usuário também precisa estar em `public.users` e `public.tenant_users`
3. A senha é validada pelo Supabase Auth, não diretamente pelo banco

**O problema comum é:** O usuário foi criado apenas nas tabelas `public.users` e `public.tenant_users`, mas **NÃO foi criado na tabela `auth.users`** do Supabase Auth.

## ✅ Solução

### Opção 1: Usar Script Python (Recomendado) 🚀

Execute o script que diagnostica e corrige automaticamente:

```bash
cd /var/www/credgestor-homologacao
python3 scripts/fix_user_login.py
```

Este script irá:
1. ✅ Verificar se o usuário existe no `auth.users`
2. ✅ Criar o usuário no Supabase Auth se não existir
3. ✅ Atualizar metadados com `tenant_id` e `role`
4. ✅ Criar/atualizar em `public.users`
5. ✅ Criar/atualizar vínculo em `public.tenant_users`
6. ✅ Testar o login

### Opção 2: Criar Manualmente no Supabase Dashboard

1. Acesse o Dashboard do Supabase:
   - URL: `https://app.supabase.com/project/[SEU-PROJECT]/auth/users`
   - Ou: `https://app.supabase.com` → Selecione seu projeto → Authentication → Users

2. Clique em **"Add User"** > **"Create new user"**

3. Preencha:
   - **Email**: `cleitonmaxcar@hotmail.com`
   - **Password**: `CleitonM@xCar2026`
   - **Auto Confirm User**: ✅ **MARCAR ESTA OPÇÃO** (muito importante!)
   - **User Metadata**:
     ```json
     {
       "tenant_id": "[TENANT_ID]",
       "name": "Cleiton Max Car",
       "role": "admin"
     }
     ```
   - **App Metadata**:
     ```json
     {
       "provider": "email",
       "providers": ["email"],
       "role": "admin",
       "tenant_id": "[TENANT_ID]"
     }
     ```

4. Após criar, execute o script para sincronizar os IDs:
   ```bash
   python3 scripts/fix_user_login.py
   ```

### Opção 3: Usar Script SQL (Apenas se tiver acesso direto ao banco)

Execute o script SQL:

```bash
# No Supabase SQL Editor ou psql
psql -h [HOST] -U [USER] -d [DATABASE] -f scripts/create_admin_user.sql
```

**⚠️ IMPORTANTE:** O script SQL pode não conseguir criar o usuário no `auth.users` se não tiver permissões especiais. Nesse caso, você ainda precisará criar manualmente no Dashboard ou usar a Opção 1.

## 🔍 Verificar Status do Usuário

Para verificar se o usuário está configurado corretamente:

### Via SQL:
```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f scripts/verificar_usuario_login.sql
```

### Via Python:
```bash
python3 scripts/fix_user_login.py
```

## 📋 Checklist de Verificação

O usuário está configurado corretamente quando:

- [ ] ✅ Existe em `auth.users` (Supabase Auth)
- [ ] ✅ Email está confirmado (`email_confirmed_at IS NOT NULL`)
- [ ] ✅ Existe em `public.users`
- [ ] ✅ Existe em `public.tenant_users` com `ativo = true`
- [ ] ✅ Os IDs estão sincronizados entre as tabelas
- [ ] ✅ `tenant_id` está nos metadados do usuário no Auth
- [ ] ✅ `role` está configurado como `admin`

## 🎯 Dados do Usuário

- **Email**: `cleitonmaxcar@hotmail.com`
- **Senha**: `CleitonM@xCar2026`
- **Nome**: `Cleiton Max Car`
- **Role**: `admin`

## 📝 Notas Importantes

1. **Auto Confirm é essencial**: Sem marcar "Auto Confirm User" no Supabase Dashboard, o usuário precisará confirmar o email antes de fazer login.

2. **Senha no Supabase Auth**: A senha deve ser criada no Supabase Auth, não apenas nas tabelas públicas. O Supabase usa hash bcrypt para armazenar senhas.

3. **Sincronização de IDs**: O `user_id` deve ser o mesmo em todas as tabelas:
   - `auth.users.id` = `public.users.id` = `public.tenant_users.user_id`

4. **Tenant ID nos Metadados**: O `tenant_id` deve estar em `user_metadata` ou `app_metadata` do usuário no Supabase Auth para que o sistema identifique automaticamente o tenant.

## 🚨 Erros Comuns

### Erro: "Credenciais inválidas"
- **Causa**: Usuário não existe no `auth.users` ou senha incorreta
- **Solução**: Criar usuário no Supabase Auth com a senha correta

### Erro: "tenant_id não informado"
- **Causa**: `tenant_id` não está nos metadados do usuário ou não existe vínculo em `tenant_users`
- **Solução**: Adicionar `tenant_id` nos metadados e criar vínculo em `tenant_users`

### Erro: "Email não confirmado"
- **Causa**: `email_confirmed_at` é NULL no `auth.users`
- **Solução**: Marcar "Auto Confirm User" ao criar ou confirmar manualmente no Dashboard

## 📞 Suporte

Se o problema persistir após seguir estas instruções:

1. Execute o script de diagnóstico: `python3 scripts/fix_user_login.py`
2. Verifique os logs do backend para mais detalhes
3. Verifique se as variáveis de ambiente estão configuradas:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
