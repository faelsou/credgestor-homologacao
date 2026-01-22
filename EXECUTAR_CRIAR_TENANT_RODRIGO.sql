-- ============================================================================
-- CREDGESTOR - Criar Tenant para Rodrigo Conecta Loja
-- ============================================================================
-- Query pronta para executar - Cria o tenant 00000000-0000-0000-0000-000000000004
-- Baseado no usuário: rodrigoconecteloja@gmail.com (Rodrigo Assunção - admin)
-- ============================================================================

-- Criar o tenant
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
    name = COALESCE(EXCLUDED.name, tenants.name),
    slug = COALESCE(EXCLUDED.slug, tenants.slug),
    email = COALESCE(EXCLUDED.email, tenants.email),
    ativo = true,
    updated_at = NOW();

-- Verificar se foi criado corretamente
SELECT 
    '✅ Tenant criado com sucesso!' as status,
    t.id,
    t.name,
    t.email,
    t.slug,
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

-- Verificar os clientes que agora têm tenant válido
SELECT 
    '✅ Clientes corrigidos' as status,
    c.id,
    c.nome,
    c.cpf_cnpj,
    t.name as tenant_nome,
    c.created_at
FROM public.clients c
JOIN public.tenants t ON c.tenant_id = t.id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY c.created_at DESC;
