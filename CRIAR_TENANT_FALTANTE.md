# 🏢 Criar Tenant Faltante - Guia Rápido

## 📋 Situação

O `tenant_id` `00000000-0000-0000-0000-000000000004` está sendo usado por:
- 2 clientes (Sandra Rodrigues e Aranha amigo)
- Possivelmente outros registros

Mas esse tenant **não existe** na tabela `tenants`. Precisamos criá-lo.

## 🚀 Solução Rápida

### **PASSO 1: Verificar Informações do Tenant**

Execute para ver se há pistas sobre o nome/email do tenant:

```sql
-- Ver usuários associados (podem dar pistas sobre o nome)
SELECT 
    tu.email,
    u.name as usuario_nome,
    tu.role,
    tu.created_at
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY tu.created_at;
```

### **PASSO 2: Ver Padrão dos Outros Tenants**

Execute para ver o formato usado nos outros tenants:

```sql
SELECT 
    t.id,
    t.name,
    t.email,
    t.slug,
    t.ativo,
    t.created_at
FROM public.tenants t
WHERE t.ativo = true
ORDER BY t.created_at DESC
LIMIT 5;
```

### **PASSO 3: Criar o Tenant**

**Opção A: Se você souber o nome/email do tenant:**

```sql
INSERT INTO public.tenants (
    id,
    name,
    slug,
    email,
    ativo,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Nome do Tenant',        -- ⚠️ SUBSTITUA pelo nome real
    'slug-do-tenant',        -- ⚠️ SUBSTITUA por um slug único (ex: nome-tenant)
    'email@tenant.com',     -- ⚠️ SUBSTITUA pelo email real
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    email = EXCLUDED.email,
    ativo = true,
    updated_at = NOW();
```

**Opção B: Criar com nome genérico (você pode ajustar depois):**

```sql
INSERT INTO public.tenants (
    id,
    name,
    slug,
    email,
    ativo,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Tenant 00000000-0000-0000-0000-000000000004',
    'tenant-00000000-0000-0000-0000-000000000004',
    NULL,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    ativo = true,
    updated_at = NOW();
```

### **PASSO 4: Verificar Correção**

Execute para confirmar que tudo está correto:

```sql
-- Verificar se o tenant foi criado
SELECT 
    t.id,
    t.name,
    t.email,
    t.ativo
FROM public.tenants t
WHERE t.id = '00000000-0000-0000-0000-000000000004'::uuid;

-- Verificar se os registros órfãos foram resolvidos
SELECT 
    'Clientes sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)

UNION ALL

SELECT 
    'Usuários sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.tenant_users tu
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id);
```

**Resultado esperado:** Ambas as quantidades devem ser **0**.

## 📝 Exemplo Prático

Se você descobrir que o tenant se chama "Rodrigo Conecta Loja" (baseado no email `rodrigoconecteloja@gmail.com`):

```sql
INSERT INTO public.tenants (
    id,
    name,
    slug,
    email,
    ativo,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Rodrigo Conecta Loja',
    'rodrigo-conecta-loja',
    'rodrigoconecteloja@gmail.com',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    email = EXCLUDED.email,
    ativo = true,
    updated_at = NOW();
```

## ⚠️ Importante

1. O `slug` deve ser **único** - não pode repetir o de outros tenants
2. O `email` é opcional, mas recomendado
3. Use `ON CONFLICT` para evitar erro se o tenant já existir (mas estiver inativo)
4. Após criar, os registros órfãos serão automaticamente resolvidos (não precisa fazer UPDATE nos clientes)

## ✅ Checklist

- [ ] Verifiquei os usuários associados para identificar o nome
- [ ] Verifiquei o padrão dos outros tenants
- [ ] Criei o tenant com nome/slug/email apropriados
- [ ] Verifiquei que não há mais registros órfãos

## 🔄 Se o Tenant Já Existir (mas estiver inativo)

Se a query do PASSO 1 retornar um tenant inativo, apenas ative:

```sql
UPDATE public.tenants
SET ativo = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000004'::uuid;
```
