# 👥 Instruções para Criar Usuários de Teste - Multi-Tenancy

## 📋 Resumo

Este guia explica como criar 3 usuários de teste para validar o sistema multi-tenancy do CredGestor.

## 🚀 Passo 1: Executar Script SQL

Execute o script `scripts/create_test_users.sql` no Supabase:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - Clique em **SQL Editor** > **New Query**

3. **Execute o Script**
   - Cole o conteúdo de `scripts/create_test_users.sql`
   - Clique em **Run**

Este script irá:
- ✅ Criar 3 tenants (Empresa Alpha, Beta, Gamma)
- ✅ Preparar registros na tabela `tenant_users`
- ✅ Preparar registros na tabela `users`

## 👤 Passo 2: Criar Usuários no Supabase Auth

Após executar o script SQL, você precisa criar os usuários no Supabase Auth Dashboard:

### Usuário 1: Admin da Empresa Alpha

1. Vá em **Authentication** > **Users** > **Add User** > **Create new user**
2. Preencha:
   - **Email**: `admin@alpha.com`
   - **Password**: `AdminAlpha123!`
   - **Auto Confirm User**: ✅ (marcar)
3. Em **User Metadata**, adicione:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000001",
     "name": "Administrador Alpha",
     "role": "admin"
   }
   ```
4. Clique em **Create User**

### Usuário 2: Usuário da Empresa Beta

1. Vá em **Authentication** > **Users** > **Add User** > **Create new user**
2. Preencha:
   - **Email**: `user@beta.com`
   - **Password**: `UserBeta123!`
   - **Auto Confirm User**: ✅ (marcar)
3. Em **User Metadata**, adicione:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000002",
     "name": "Usuário Beta",
     "role": "user"
   }
   ```
4. Clique em **Create User**

### Usuário 3: Gestor da Empresa Gamma

1. Vá em **Authentication** > **Users** > **Add User** > **Create new user**
2. Preencha:
   - **Email**: `gestor@gamma.com`
   - **Password**: `GestorGamma123!`
   - **Auto Confirm User**: ✅ (marcar)
3. Em **User Metadata**, adicione:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000003",
     "name": "Gestor Gamma",
     "role": "gestor"
   }
   ```
4. Clique em **Create User**

## 🔄 Passo 3: Atualizar IDs (Opcional)

Após criar os usuários no Auth, execute este SQL para sincronizar os IDs:

```sql
-- Atualizar IDs na tabela tenant_users
UPDATE public.tenant_users tu
SET user_id = au.id,
    updated_at = now()
FROM auth.users au
WHERE tu.email = au.email
    AND tu.email IN ('admin@alpha.com', 'user@beta.com', 'gestor@gamma.com')
    AND tu.user_id != au.id;

-- Atualizar IDs na tabela users
UPDATE public.users u
SET id = au.id,
    updated_at = now()
FROM auth.users au
WHERE u.email = au.email
    AND u.email IN ('admin@alpha.com', 'user@beta.com', 'gestor@gamma.com')
    AND u.id != au.id;
```

## ✅ Passo 4: Verificar

Verifique se tudo está correto:

```sql
-- Verificar tenants
SELECT id, name, slug, ativo 
FROM public.tenants 
WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
)
ORDER BY name;

-- Verificar usuários e vínculos
SELECT 
    t.name as tenant_name,
    tu.email,
    tu.role,
    tu.ativo,
    u.name as user_name,
    au.id as auth_user_id
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
LEFT JOIN auth.users au ON au.email = tu.email
WHERE tu.email IN (
    'admin@alpha.com',
    'user@beta.com',
    'gestor@gamma.com'
)
ORDER BY t.name, tu.email;
```

## 🧪 Passo 5: Testar Login

Teste o login de cada usuário:

### Via API (curl)

```bash
# Usuário 1: Admin Alpha
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alpha.com",
    "senha": "AdminAlpha123!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'

# Usuário 2: User Beta
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@beta.com",
    "senha": "UserBeta123!",
    "tenant_id": "00000000-0000-0000-0000-000000000002"
  }'

# Usuário 3: Gestor Gamma
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gestor@gamma.com",
    "senha": "GestorGamma123!",
    "tenant_id": "00000000-0000-0000-0000-000000000003"
  }'
```

### Via Frontend

1. Acesse: http://localhost:3000
2. Faça login com um dos usuários acima
3. Verifique se os dados são isolados por tenant

## 📊 Resumo dos Usuários

| Email | Senha | Tenant | Role | Tenant ID |
|-------|-------|--------|------|-----------|
| admin@alpha.com | AdminAlpha123! | Empresa Alpha | admin | 00000000-0000-0000-0000-000000000001 |
| user@beta.com | UserBeta123! | Empresa Beta | user | 00000000-0000-0000-0000-000000000002 |
| gestor@gamma.com | GestorGamma123! | Empresa Gamma | gestor | 00000000-0000-0000-0000-000000000003 |

## 🔒 Segurança

⚠️ **IMPORTANTE**: Estes são usuários de teste. Em produção:

- Use senhas fortes e únicas
- Não compartilhe credenciais
- Remova usuários de teste antes de ir para produção
- Configure políticas RLS adequadas

## 🛠️ Troubleshooting

### Erro: "Usuário não encontrado"
- Verifique se o usuário foi criado no Supabase Auth
- Verifique se o email está correto

### Erro: "Tenant não encontrado"
- Execute o script SQL novamente
- Verifique se os tenants foram criados

### Erro: "Falha ao autenticar"
- Verifique se a senha está correta
- Verifique se o usuário está confirmado no Auth
- Verifique se o `tenant_id` está correto no metadata

### Usuário não consegue ver dados
- Verifique se o RLS está habilitado
- Verifique se as políticas RLS estão corretas
- Verifique se o `tenant_id` está correto

## 📚 Documentação Relacionada

- [Conexão e Usuários](../CONEXAO_BANCO_E_USUARIOS.md)
- [Criar Tabelas](./INSTRUCOES_CRIAR_TABELAS.md)
- [Habilitar RLS](./enable_rls_all_tables.sql)
