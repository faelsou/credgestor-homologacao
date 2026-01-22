-- ============================================================================
-- CREDGESTOR - Criar Tenant 00000000-0000-0000-0000-000000000004
-- ============================================================================
-- Query simples para criar o tenant faltante
-- Ajuste o nome, slug e email conforme necessário
-- ============================================================================

-- PASSO 1: Verificar usuários associados (para identificar nome do tenant)
SELECT 
    tu.email,
    u.name as usuario_nome,
    tu.role,
    tu.created_at
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY tu.created_at;

-- PASSO 2: Criar o tenant (AJUSTE nome, slug e email antes de executar!)
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
    'Tenant 00000000-0000-0000-0000-000000000004',  -- ⚠️ AJUSTE: Use o nome real do tenant
    'tenant-00000000-0000-0000-0000-000000000004',  -- ⚠️ AJUSTE: Use um slug único
    NULL,  -- ⚠️ AJUSTE: Use o email real ou deixe NULL
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    name = COALESCE(EXCLUDED.name, tenants.name),
    slug = COALESCE(EXCLUDED.slug, tenants.slug),
    email = COALESCE(EXCLUDED.email, tenants.email),
    ativo = true,
    updated_at = NOW();

-- PASSO 3: Verificar se foi criado corretamente
SELECT 
    '✅ Tenant criado' as status,
    t.id,
    t.name,
    t.email,
    t.slug,
    t.ativo
FROM public.tenants t
WHERE t.id = '00000000-0000-0000-0000-000000000004'::uuid;

-- PASSO 4: Verificar se os registros órfãos foram resolvidos
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
