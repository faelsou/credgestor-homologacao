-- ============================================================================
-- CREDGESTOR - Criar Tenant Faltante e Corrigir Registros
-- ============================================================================
-- O tenant_id 00000000-0000-0000-0000-000000000004 está sendo usado
-- mas não existe na tabela tenants. Vamos criar e corrigir os registros.
-- ============================================================================

-- ============================================================================
-- PARTE 1: VERIFICAR SITUAÇÃO ATUAL
-- ============================================================================

-- 1.1. Verificar se o tenant existe (pode estar inativo)
SELECT 
    'VERIFICAÇÃO - Tenant 00000000-0000-0000-0000-000000000004' as info,
    t.id,
    t.name,
    t.email,
    t.ativo,
    t.created_at
FROM public.tenants t
WHERE t.id = '00000000-0000-0000-0000-000000000004'::uuid;

-- 1.2. Verificar quantos registros usam esse tenant_id
SELECT 
    'REGISTROS USANDO TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    'clients' as tabela,
    COUNT(*) as quantidade
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'REGISTROS USANDO TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    'loans' as tabela,
    COUNT(*) as quantidade
FROM public.loans
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'REGISTROS USANDO TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    'installments' as tabela,
    COUNT(*) as quantidade
FROM public.installments
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'REGISTROS USANDO TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    'tenant_users' as tabela,
    COUNT(*) as quantidade
FROM public.tenant_users
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid;

-- 1.3. Ver detalhes dos registros que usam esse tenant
SELECT 
    'CLIENTES COM TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    c.id,
    c.nome,
    c.cpf_cnpj,
    c.created_at
FROM public.clients c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY c.created_at DESC;

SELECT 
    'USUÁRIOS COM TENANT_ID: 00000000-0000-0000-0000-000000000004' as info,
    tu.id,
    tu.email,
    tu.role,
    tu.ativo,
    tu.created_at
FROM public.tenant_users tu
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY tu.created_at DESC;

-- 1.4. Verificar padrão dos outros tenants para seguir o mesmo formato
SELECT 
    'PADRÃO DOS OUTROS TENANTS' as info,
    t.id,
    t.name,
    t.email,
    t.slug,
    t.ativo,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    t.created_at
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
LEFT JOIN public.clients c ON t.id = c.tenant_id AND c.ativo = true
WHERE t.ativo = true
GROUP BY t.id, t.name, t.email, t.slug, t.ativo, t.created_at
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- PARTE 2: CRIAR TENANT FALTANTE
-- ============================================================================

-- 2.1. Verificar se há informações na auditoria sobre esse tenant
SELECT 
    'AUDITORIA - Tentar identificar nome/email do tenant' as info,
    a.tabela,
    a.acao,
    a.dados_novos,
    a.data_hora
FROM public.auditoria a
WHERE a.dados_novos::text LIKE '%00000000-0000-0000-0000-000000000004%'
   OR a.dados_anteriores::text LIKE '%00000000-0000-0000-0000-000000000004%'
ORDER BY a.data_hora DESC
LIMIT 20;

-- 2.2. Verificar se há usuários associados que podem dar pistas sobre o nome
SELECT 
    'USUÁRIOS ASSOCIADOS - Para identificar nome do tenant' as info,
    tu.email,
    u.name as usuario_nome,
    tu.role,
    tu.created_at
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
ORDER BY tu.created_at;

-- 2.3. Criar o tenant (AJUSTE O NOME E EMAIL CONFORME NECESSÁRIO)
-- ⚠️ IMPORTANTE: Ajuste o nome, email e slug antes de executar!

/*
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
    'Nome do Tenant',  -- ⚠️ AJUSTE AQUI - Use o nome apropriado
    'slug-do-tenant',  -- ⚠️ AJUSTE AQUI - Use um slug único
    'email@tenant.com',  -- ⚠️ AJUSTE AQUI - Use o email apropriado
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
*/

-- 2.4. Alternativa: Se o tenant existir mas estiver inativo, apenas ativar
/*
UPDATE public.tenants
SET ativo = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000004'::uuid;
*/

-- ============================================================================
-- PARTE 3: VERIFICAÇÃO PÓS-CRIAÇÃO
-- ============================================================================

-- 3.1. Verificar se o tenant foi criado corretamente
SELECT 
    'VERIFICAÇÃO - Tenant criado' as info,
    t.id,
    t.name,
    t.email,
    t.slug,
    t.ativo,
    t.created_at
FROM public.tenants t
WHERE t.id = '00000000-0000-0000-0000-000000000004'::uuid;

-- 3.2. Verificar se os registros órfãos foram resolvidos
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

-- 3.3. Verificar integridade dos dados
SELECT 
    'VERIFICAÇÃO FINAL - Clientes com tenant válido' as info,
    c.id,
    c.nome,
    c.tenant_id,
    t.name as tenant_nome,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id) 
        THEN '✅ Válido' 
        ELSE '❌ Inválido' 
    END as status
FROM public.clients c
LEFT JOIN public.tenants t ON c.tenant_id = t.id
WHERE c.id IN (
    '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
    '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
);

-- ============================================================================
-- PARTE 4: SCRIPT COMPLETO DE CRIAÇÃO E CORREÇÃO
-- ============================================================================

-- ⚠️ EXECUTE ESTE SCRIPT APÓS AJUSTAR O NOME, EMAIL E SLUG DO TENANT!

/*
DO $$
DECLARE
    tenant_name text := 'Nome do Tenant';  -- ⚠️ AJUSTE AQUI
    tenant_slug text := 'slug-do-tenant';   -- ⚠️ AJUSTE AQUI
    tenant_email text := 'email@tenant.com'; -- ⚠️ AJUSTE AQUI
    tenant_id uuid := '00000000-0000-0000-0000-000000000004'::uuid;
BEGIN
    -- Criar ou atualizar o tenant
    INSERT INTO public.tenants (
        id,
        name,
        slug,
        email,
        ativo,
        created_at,
        updated_at
    ) VALUES (
        tenant_id,
        tenant_name,
        tenant_slug,
        tenant_email,
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
    
    RAISE NOTICE '✅ Tenant % criado/atualizado com sucesso!', tenant_id;
    
    -- Verificar se os registros agora estão válidos
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id) THEN
        RAISE NOTICE '✅ Tenant existe na tabela tenants';
        
        -- Contar registros corrigidos
        DECLARE
            clientes_count int;
            usuarios_count int;
        BEGIN
            SELECT COUNT(*) INTO clientes_count
            FROM public.clients
            WHERE tenant_id = tenant_id
              AND EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id);
            
            SELECT COUNT(*) INTO usuarios_count
            FROM public.tenant_users
            WHERE tenant_id = tenant_id
              AND EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id);
            
            RAISE NOTICE '✅ % clientes agora têm tenant válido', clientes_count;
            RAISE NOTICE '✅ % usuários agora têm tenant válido', usuarios_count;
        END;
    ELSE
        RAISE EXCEPTION '❌ Erro: Tenant não foi criado corretamente!';
    END IF;
END $$;
*/

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
