# 🔍 SQL para Verificar Usuários e Login no Supabase

## 📋 Consultas SQL para Verificar Usuários

### 1. Listar Todos os Usuários do Supabase Auth

```sql
-- Ver todos os usuários cadastrados no Supabase Auth
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users
ORDER BY created_at DESC;
```

### 2. Verificar Usuário Específico por Email

```sql
-- Verificar se um usuário existe e seus dados
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'tenant_id' as tenant_id,
  raw_app_meta_data->>'role' as role
FROM auth.users
WHERE email = 'admin@alpha.com';
```

### 3. Verificar Usuários Vinculados a Tenants

```sql
-- Ver usuários vinculados a tenants na tabela tenant_users
SELECT 
  tu.id,
  tu.tenant_id,
  tu.email,
  t.name as tenant_name,
  tu.created_at
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY tu.created_at DESC;
```

### 4. Verificar Login e Senha (Via Supabase Auth)

**⚠️ IMPORTANTE:** No Supabase, as senhas são armazenadas com hash e **não podem ser verificadas diretamente via SQL**. A autenticação deve ser feita através da API do Supabase Auth.

Para verificar se um usuário pode fazer login, você precisa:

#### Opção 1: Via Backend (Recomendado)
```python
# O backend já faz isso automaticamente em backend/main.py
# Função: _authenticate_user()
supabase.auth.sign_in_with_password({
    "email": "admin@alpha.com",
    "password": "senha123"
})
```

#### Opção 2: Via SQL (Apenas verificar se usuário existe)
```sql
-- Verificar se o usuário existe (não valida senha)
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  raw_user_meta_data->>'tenant_id' as tenant_id_metadata,
  raw_app_meta_data->>'role' as role_metadata
FROM auth.users
WHERE email = 'admin@alpha.com';
```

### 5. Verificar Tenant ID do Usuário

```sql
-- Verificar tenant_id de um usuário (múltiplas fontes)
SELECT 
  u.id as user_id,
  u.email,
  -- Tenant ID do metadata
  u.raw_user_meta_data->>'tenant_id' as tenant_id_metadata,
  u.raw_app_meta_data->>'tenant_id' as tenant_id_app_metadata,
  -- Tenant ID da tabela tenant_users
  tu.tenant_id as tenant_id_table,
  t.name as tenant_name
FROM auth.users u
LEFT JOIN public.tenant_users tu ON tu.email = u.email
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE u.email = 'admin@alpha.com';
```

### 6. Criar Usuário para Teste (Via SQL - Apenas estrutura)

**⚠️ ATENÇÃO:** Para criar usuários no Supabase, use o Dashboard ou a API. O SQL abaixo apenas cria o registro na tabela `tenant_users`, mas **não cria o usuário no Supabase Auth**.

```sql
-- Criar registro na tabela tenant_users (requer usuário já existir no Supabase Auth)
INSERT INTO public.tenant_users (tenant_id, email)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@alpha.com')
ON CONFLICT (tenant_id, email) DO NOTHING;
```

### 7. Verificar Sessões Ativas

```sql
-- Ver sessões de usuários armazenadas
SELECT 
  us.id,
  us.user_id,
  us.tenant_id,
  us.refresh_token,
  us.expires_at,
  us.created_at,
  u.email
FROM public.user_sessions us
JOIN auth.users u ON u.id = us.user_id
WHERE us.expires_at > NOW()
ORDER BY us.created_at DESC;
```

## 🔐 Como Criar Usuário para Login

### Via Supabase Dashboard (Recomendado)

1. Acesse: `https://app.supabase.com`
2. Selecione seu projeto
3. Vá em **Authentication** > **Users**
4. Clique em **Add User** > **Create new user**
5. Preencha:
   - **Email**: `admin@alpha.com`
   - **Password**: `AdminAlpha123!`
   - **Auto Confirm User**: ✅ (marca para não precisar confirmar email)
6. Clique em **Create User**

### Via SQL Editor (Apenas metadata)

```sql
-- Atualizar metadata do usuário para incluir tenant_id
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_build_object(
    'tenant_id', '00000000-0000-0000-0000-000000000001'
  ),
  raw_app_meta_data = jsonb_build_object(
    'role', 'admin'
  )
WHERE email = 'admin@alpha.com';
```

### Vincular Usuário a Tenant

```sql
-- Vincular usuário existente a um tenant
INSERT INTO public.tenant_users (tenant_id, email)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@alpha.com'
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@alpha.com'
)
ON CONFLICT (tenant_id, email) DO NOTHING;
```

## 🧪 Testar Login

### Via cURL

```bash
curl -X POST https://credgestor.app.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alpha.com",
    "senha": "AdminAlpha123!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

### Via Python

```python
from supabase import create_client

supabase = create_client(
    "https://aclyrcuahiujgtjuimoh.supabase.co",
    "SUA_ANON_KEY"
)

response = supabase.auth.sign_in_with_password({
    "email": "admin@alpha.com",
    "password": "AdminAlpha123!"
})

print(response)
```

## 📝 Notas Importantes

1. **Senhas não podem ser verificadas via SQL** - O Supabase usa hash bcrypt
2. **Use a API do Supabase Auth** para autenticação
3. **Tenant ID pode vir de 3 lugares:**
   - `user_metadata.tenant_id` (metadata do usuário)
   - `app_metadata.tenant_id` (metadata da aplicação)
   - Tabela `tenant_users` (vinculação explícita)
4. **O backend resolve o tenant_id automaticamente** na ordem acima
