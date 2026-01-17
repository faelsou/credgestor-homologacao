-- ============================================================================
-- CREDGESTOR - Verificar Tenants Compartilhados
-- ============================================================================
-- Este script identifica tenants que são compartilhados por múltiplos usuários
-- REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente
-- ============================================================================

-- ============================================================================
-- 0. VERIFICAR SE AS TABELAS EXISTEM
-- ============================================================================

DO $$
BEGIN
    -- Verificar se a tabela tenants existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) THEN
        RAISE NOTICE '⚠️  ATENÇÃO: A tabela public.tenants não existe!';
        RAISE NOTICE '   Execute primeiro o script: scripts/criar_tabela_tenants.sql';
        RAISE NOTICE '   Ou veja: CRIAR_TABELA_TENANTS.md';
        RAISE NOTICE '';
    END IF;
    
    -- Verificar se a tabela tenant_users existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenant_users'
    ) THEN
        RAISE NOTICE '⚠️  ATENÇÃO: A tabela public.tenant_users não existe!';
        RAISE NOTICE '   Execute primeiro o script: scripts/create_all_tables_supabase.sql';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================================================
-- 1. LISTAR TENANTS COMPARTILHADOS (Múltiplos usuários no mesmo tenant)
-- ============================================================================

-- Verificar se as tabelas existem antes de executar
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenant_users'
    ) THEN
        -- Tabelas existem, pode executar a query
        NULL; -- Query será executada abaixo
    ELSE
        RAISE EXCEPTION 'Tabelas não existem. Execute scripts/create_all_tables_supabase.sql primeiro.';
    END IF;
END $$;

SELECT 
    'TENANTS COMPARTILHADOS' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.email as tenant_email,
    COUNT(tu.user_id) as total_usuarios,
    STRING_AGG(tu.email, ', ' ORDER BY tu.email) as usuarios_emails,
    STRING_AGG(COALESCE(u.name, tu.email), ', ' ORDER BY tu.email) as usuarios_nomes
FROM public.tenants t
INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.ativo = true
GROUP BY t.id, t.name, t.slug, t.email
HAVING COUNT(tu.user_id) > 1
ORDER BY total_usuarios DESC, t.name;

-- ============================================================================
-- 2. DETALHES DOS USUÁRIOS EM TENANTS COMPARTILHADOS
-- ============================================================================

SELECT 
    'DETALHES - TENANTS COMPARTILHADOS' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    tu.email as usuario_email,
    u.name as usuario_nome,
    tu.role as role,
    tu.ativo as ativo,
    tu.created_at as vinculado_em,
    -- Verificar se tem tenant_id no metadata do Auth
    (SELECT raw_user_meta_data->>'tenant_id' 
     FROM auth.users 
     WHERE email = tu.email 
     LIMIT 1) as tenant_id_auth_metadata
FROM public.tenants t
INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.ativo = true
AND t.id IN (
    SELECT tenant_id
    FROM public.tenant_users
    WHERE ativo = true
    GROUP BY tenant_id
    HAVING COUNT(user_id) > 1
)
ORDER BY t.name, tu.email;

-- ============================================================================
-- 3. RESUMO GERAL: USUÁRIOS POR TENANT
-- ============================================================================

SELECT 
    'RESUMO GERAL' as info,
    CASE 
        WHEN COUNT(tu.user_id) = 1 THEN '✅ Tenant Único'
        ELSE '⚠️ Tenant Compartilhado'
    END as status,
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tu.user_id) as total_usuarios,
    STRING_AGG(tu.email, ', ' ORDER BY tu.email) as usuarios
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
GROUP BY t.id, t.name
ORDER BY total_usuarios DESC, t.name;

-- ============================================================================
-- 4. VERIFICAR SINCRONIZAÇÃO: tenant_id no Auth vs tenant_users
-- ============================================================================

SELECT 
    'VERIFICAÇÃO DE SINCRONIZAÇÃO' as info,
    tu.email,
    tu.tenant_id as tenant_id_tenant_users,
    (SELECT raw_user_meta_data->>'tenant_id' 
     FROM auth.users 
     WHERE email = tu.email 
     LIMIT 1) as tenant_id_auth_user_metadata,
    (SELECT raw_app_meta_data->>'tenant_id' 
     FROM auth.users 
     WHERE email = tu.email 
     LIMIT 1) as tenant_id_auth_app_metadata,
    CASE 
        WHEN tu.tenant_id::text = (SELECT raw_user_meta_data->>'tenant_id' 
                                    FROM auth.users 
                                    WHERE email = tu.email 
                                    LIMIT 1) 
        THEN '✅ Sincronizado'
        ELSE '⚠️ Não sincronizado'
    END as status_sincronizacao
FROM public.tenant_users tu
WHERE tu.ativo = true
ORDER BY tu.email;

-- ============================================================================
-- 5. CONTAR TOTAL DE TENANTS E USUÁRIOS
-- ============================================================================

SELECT 
    'ESTATÍSTICAS GERAIS' as info,
    COUNT(DISTINCT t.id) as total_tenants,
    COUNT(DISTINCT tu.user_id) as total_usuarios_ativos,
    COUNT(DISTINCT CASE WHEN tu.ativo = true THEN tu.user_id END) as usuarios_ativos,
    COUNT(DISTINCT CASE 
        WHEN t.id IN (
            SELECT tenant_id
            FROM public.tenant_users
            WHERE ativo = true
            GROUP BY tenant_id
            HAVING COUNT(user_id) > 1
        ) THEN t.id
    END) as tenants_compartilhados,
    COUNT(DISTINCT CASE 
        WHEN t.id IN (
            SELECT tenant_id
            FROM public.tenant_users
            WHERE ativo = true
            GROUP BY tenant_id
            HAVING COUNT(user_id) = 1
        ) THEN t.id
    END) as tenants_unicos
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id;
