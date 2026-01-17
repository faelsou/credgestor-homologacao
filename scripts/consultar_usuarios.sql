-- ============================================================================
-- CREDGESTOR - Consultar Dados dos Usuários no Banco de Dados
-- ============================================================================
-- Este script fornece várias consultas para visualizar dados dos usuários
-- Execute no Supabase SQL Editor ou via psql
-- ============================================================================

-- ============================================================================
-- 1. LISTAR TODOS OS USUÁRIOS (VISÃO COMPLETA)
-- ============================================================================

SELECT 
    'VISÃO COMPLETA DE USUÁRIOS' as info,
    au.id as auth_user_id,
    au.email as email,
    au.email_confirmed_at IS NOT NULL as email_confirmado,
    au.created_at as auth_criado_em,
    pu.id as public_user_id,
    pu.name as nome,
    pu.role as role_public,
    tu.id as tenant_user_id,
    tu.tenant_id,
    tu.role as role_tenant,
    tu.ativo as ativo,
    t.name as tenant_nome,
    t.slug as tenant_slug,
    -- Metadados do Auth
    au.raw_user_meta_data->>'tenant_id' as tenant_id_user_metadata,
    au.raw_user_meta_data->>'name' as name_user_metadata,
    au.raw_app_meta_data->>'tenant_id' as tenant_id_app_metadata,
    au.raw_app_meta_data->>'role' as role_app_metadata,
    -- Status de sincronização
    CASE 
        WHEN au.id = pu.id AND pu.id = tu.user_id THEN '✅ Sincronizado'
        ELSE '⚠️ Não sincronizado'
    END as status_sincronizacao
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY au.created_at DESC NULLS LAST, pu.created_at DESC NULLS LAST;

-- ============================================================================
-- 2. LISTAR USUÁRIOS DO SUPABASE AUTH
-- ============================================================================

SELECT 
    'USUÁRIOS NO SUPABASE AUTH' as info,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmado,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data->>'name' as nome_metadata,
    raw_user_meta_data->>'tenant_id' as tenant_id_metadata,
    raw_app_meta_data->>'role' as role_metadata,
    raw_app_meta_data->>'tenant_id' as tenant_id_app_metadata
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- 3. LISTAR USUÁRIOS EM PUBLIC.USERS
-- ============================================================================

SELECT 
    'USUÁRIOS EM PUBLIC.USERS' as info,
    id,
    email,
    name as nome,
    role,
    metadata,
    created_at,
    updated_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================================================
-- 4. LISTAR VÍNCULOS USUÁRIO-TENANT
-- ============================================================================

SELECT 
    'VÍNCULOS USUÁRIO-TENANT' as info,
    tu.id,
    tu.tenant_id,
    tu.user_id,
    tu.email,
    tu.role,
    tu.ativo,
    tu.metadata,
    t.name as tenant_nome,
    t.slug as tenant_slug,
    t.email as tenant_email,
    tu.created_at,
    tu.updated_at
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY tu.created_at DESC;

-- ============================================================================
-- 5. CONSULTAR USUÁRIO ESPECÍFICO POR EMAIL
-- ============================================================================

-- Substitua 'cleitonmaxcar@hotmail.com' pelo email desejado
DO $$
DECLARE
    v_email text := 'cleitonmaxcar@hotmail.com';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 DADOS DO USUÁRIO: %', v_email;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- Dados no Auth
SELECT 
    'AUTH.USERS' as tabela,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmado,
    email_confirmed_at,
    created_at,
    raw_user_meta_data,
    raw_app_meta_data
FROM auth.users
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Dados em public.users
SELECT 
    'PUBLIC.USERS' as tabela,
    id,
    email,
    name,
    role,
    metadata,
    created_at,
    updated_at
FROM public.users
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Dados em public.tenant_users
SELECT 
    'PUBLIC.TENANT_USERS' as tabela,
    tu.id,
    tu.tenant_id,
    tu.user_id,
    tu.email,
    tu.role,
    tu.ativo,
    tu.metadata,
    t.name as tenant_nome,
    t.slug as tenant_slug,
    tu.created_at,
    tu.updated_at
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE tu.email = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 6. CONTAR USUÁRIOS POR TENANT
-- ============================================================================

SELECT 
    'USUÁRIOS POR TENANT' as info,
    t.id as tenant_id,
    t.name as tenant_nome,
    t.slug as tenant_slug,
    COUNT(DISTINCT tu.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN tu.ativo = true THEN tu.id END) as usuarios_ativos,
    COUNT(DISTINCT CASE WHEN tu.role = 'admin' THEN tu.id END) as admins,
    COUNT(DISTINCT CASE WHEN tu.role = 'user' THEN tu.id END) as usuarios,
    COUNT(DISTINCT CASE WHEN tu.role = 'gestor' THEN tu.id END) as gestores
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON tu.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY total_usuarios DESC;

-- ============================================================================
-- 7. USUÁRIOS COM PROBLEMAS DE SINCRONIZAÇÃO
-- ============================================================================

SELECT 
    'USUÁRIOS COM PROBLEMAS DE SINCRONIZAÇÃO' as info,
    COALESCE(au.email, pu.email, tu.email) as email,
    CASE 
        WHEN au.id IS NULL THEN '❌ Não existe em auth.users'
        ELSE '✅ Existe em auth.users'
    END as status_auth,
    CASE 
        WHEN pu.id IS NULL THEN '❌ Não existe em public.users'
        ELSE '✅ Existe em public.users'
    END as status_public,
    CASE 
        WHEN tu.id IS NULL THEN '❌ Não existe em public.tenant_users'
        ELSE '✅ Existe em public.tenant_users'
    END as status_tenant_user,
    CASE 
        WHEN au.id != pu.id OR pu.id != tu.user_id THEN '⚠️ IDs não sincronizados'
        ELSE '✅ IDs sincronizados'
    END as status_ids,
    au.id as auth_id,
    pu.id as public_id,
    tu.user_id as tenant_user_id
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
WHERE 
    au.id IS NULL 
    OR pu.id IS NULL 
    OR tu.id IS NULL
    OR au.id != pu.id 
    OR pu.id != tu.user_id
ORDER BY email;

-- ============================================================================
-- 8. USUÁRIOS POR ROLE
-- ============================================================================

SELECT 
    'USUÁRIOS POR ROLE' as info,
    COALESCE(tu.role, pu.role, au.raw_app_meta_data->>'role', 'sem_role') as role,
    COUNT(DISTINCT COALESCE(au.email, pu.email, tu.email)) as total,
    COUNT(DISTINCT CASE WHEN tu.ativo = true THEN tu.email END) as ativos
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
GROUP BY COALESCE(tu.role, pu.role, au.raw_app_meta_data->>'role', 'sem_role')
ORDER BY total DESC;

-- ============================================================================
-- 9. ÚLTIMOS USUÁRIOS CRIADOS
-- ============================================================================

SELECT 
    'ÚLTIMOS USUÁRIOS CRIADOS' as info,
    COALESCE(au.email, pu.email, tu.email) as email,
    COALESCE(pu.name, au.raw_user_meta_data->>'name', 'Sem nome') as nome,
    COALESCE(tu.role, pu.role, 'sem_role') as role,
    t.name as tenant_nome,
    GREATEST(
        COALESCE(au.created_at, '1970-01-01'::timestamptz),
        COALESCE(pu.created_at, '1970-01-01'::timestamptz),
        COALESCE(tu.created_at, '1970-01-01'::timestamptz)
    ) as data_criacao
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY data_criacao DESC
LIMIT 20;

-- ============================================================================
-- 10. RESUMO GERAL DE USUÁRIOS
-- ============================================================================

SELECT 
    'RESUMO GERAL' as info,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM public.users) as total_public_users,
    (SELECT COUNT(*) FROM public.tenant_users) as total_tenant_users,
    (SELECT COUNT(*) FROM public.tenant_users WHERE ativo = true) as usuarios_ativos,
    (SELECT COUNT(DISTINCT tenant_id) FROM public.tenant_users) as total_tenants_com_usuarios,
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) as emails_confirmados;

-- ============================================================================
-- 11. EXPORTAR DADOS DE USUÁRIO PARA JSON (Útil para backup)
-- ============================================================================

SELECT 
    json_build_object(
        'auth_user', (
            SELECT row_to_json(au.*)
            FROM auth.users au
            WHERE au.email = 'cleitonmaxcar@hotmail.com'
        ),
        'public_user', (
            SELECT row_to_json(pu.*)
            FROM public.users pu
            WHERE pu.email = 'cleitonmaxcar@hotmail.com'
        ),
        'tenant_users', (
            SELECT json_agg(row_to_json(tu.*))
            FROM public.tenant_users tu
            WHERE tu.email = 'cleitonmaxcar@hotmail.com'
        )
    ) as dados_usuario_json;

-- ============================================================================
-- 12. VERIFICAR PERMISSÕES E ACESSOS
-- ============================================================================

SELECT 
    'PERMISSÕES E ACESSOS' as info,
    tu.email,
    tu.role,
    tu.ativo,
    t.name as tenant_nome,
    t.ativo as tenant_ativo,
    CASE 
        WHEN tu.ativo = true AND t.ativo = true THEN '✅ Acesso permitido'
        ELSE '❌ Acesso negado'
    END as status_acesso
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY tu.email;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
