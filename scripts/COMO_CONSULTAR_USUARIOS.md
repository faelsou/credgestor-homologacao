# 📊 Como Consultar Dados dos Usuários no Banco de Dados

Este guia mostra diferentes formas de consultar dados dos usuários no banco de dados CredGestor.

## 🔍 Métodos de Consulta

### 1. Via Supabase SQL Editor (Recomendado)

1. Acesse o Dashboard do Supabase: `https://app.supabase.com`
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole e execute as queries do arquivo `scripts/consultar_usuarios.sql`

### 2. Via Script SQL Completo

Execute o script completo que contém todas as consultas:

```bash
# No Supabase SQL Editor, cole o conteúdo de:
cat scripts/consultar_usuarios.sql
```

### 3. Via psql (Linha de Comando)

```bash
# Configure a variável de ambiente com a connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Execute queries específicas
psql "$DATABASE_URL" -f scripts/consultar_usuarios.sql
```

### 4. Via Script Shell

```bash
# Consultar usuário específico por email
./scripts/consultar_usuario_por_email.sh cleitonmaxcar@hotmail.com
```

## 📋 Consultas Úteis

### Listar Todos os Usuários

```sql
SELECT 
    au.email,
    pu.name as nome,
    tu.role,
    t.name as tenant,
    tu.ativo
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
LEFT JOIN public.tenant_users tu ON tu.email = au.email
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY au.created_at DESC;
```

### Consultar Usuário Específico

```sql
-- Substitua o email
SELECT 
    'AUTH' as tabela,
    id,
    email,
    email_confirmed_at IS NOT NULL as confirmado
FROM auth.users
WHERE email = 'cleitonmaxcar@hotmail.com';

SELECT 
    'PUBLIC.USERS' as tabela,
    id,
    email,
    name,
    role
FROM public.users
WHERE email = 'cleitonmaxcar@hotmail.com';

SELECT 
    'TENANT_USERS' as tabela,
    tu.*,
    t.name as tenant_nome
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE tu.email = 'cleitonmaxcar@hotmail.com';
```

### Contar Usuários por Tenant

```sql
SELECT 
    t.name as tenant,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN tu.ativo = true THEN 1 END) as usuarios_ativos
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON tu.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY total_usuarios DESC;
```

### Usuários com Problemas

```sql
-- Usuários que não estão sincronizados entre as tabelas
SELECT 
    COALESCE(au.email, pu.email, tu.email) as email,
    CASE WHEN au.id IS NULL THEN '❌ Sem auth' ELSE '✅' END as auth,
    CASE WHEN pu.id IS NULL THEN '❌ Sem public' ELSE '✅' END as public,
    CASE WHEN tu.id IS NULL THEN '❌ Sem tenant_user' ELSE '✅' END as tenant_user
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
WHERE au.id IS NULL OR pu.id IS NULL OR tu.id IS NULL
   OR au.id != pu.id OR pu.id != tu.user_id;
```

## 📊 Estrutura das Tabelas

### auth.users (Supabase Auth)
- `id` - UUID do usuário
- `email` - Email do usuário
- `email_confirmed_at` - Data de confirmação do email
- `raw_user_meta_data` - Metadados do usuário (JSONB)
- `raw_app_meta_data` - Metadados da aplicação (JSONB)

### public.users
- `id` - UUID (deve corresponder ao auth.users.id)
- `email` - Email do usuário
- `name` - Nome do usuário
- `role` - Role do usuário (admin, user, gestor)
- `metadata` - Metadados adicionais (JSONB)

### public.tenant_users
- `id` - UUID do vínculo
- `tenant_id` - UUID do tenant
- `user_id` - UUID do usuário (deve corresponder ao auth.users.id)
- `email` - Email do usuário
- `role` - Role no tenant
- `ativo` - Se o usuário está ativo
- `metadata` - Metadados adicionais (JSONB)

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Não exponha senhas ou tokens em logs
- Use apenas em ambientes seguros
- As senhas no Supabase Auth são hasheadas e não podem ser visualizadas

## 📝 Exemplos Práticos

### Verificar se usuário existe

```sql
SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'email@exemplo.com'
) as existe_no_auth;

SELECT EXISTS(
    SELECT 1 FROM public.users WHERE email = 'email@exemplo.com'
) as existe_em_public;
```

### Exportar dados de usuário para JSON

```sql
SELECT json_build_object(
    'email', au.email,
    'nome', pu.name,
    'role', tu.role,
    'tenant', t.name
) as dados_usuario
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
LEFT JOIN public.tenant_users tu ON tu.email = au.email
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE au.email = 'email@exemplo.com';
```

## 🆘 Troubleshooting

### Problema: "relation does not exist"
- Verifique se está conectado ao banco correto
- Verifique se as tabelas foram criadas

### Problema: "permission denied"
- Use a connection string com permissões adequadas
- No Supabase, use o SQL Editor que tem permissões automáticas

### Problema: "column does not exist"
- Verifique se a estrutura das tabelas está atualizada
- Execute o script `create_all_tables_supabase.sql` se necessário
