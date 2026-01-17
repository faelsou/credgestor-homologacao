-- ============================================================================
-- CREDGESTOR - Verificar Status do Usuário para Login
-- ============================================================================
-- Este script verifica se o usuário está configurado corretamente
-- para fazer login na aplicação
-- Email: cleitonmaxcar@hotmail.com
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR USUÁRIO NO SUPABASE AUTH
-- ============================================================================

-- Verificar se o usuário existe no auth.users (tabela do Supabase Auth)
-- Esta é a tabela mais importante - o login depende dela!
SELECT 
    'auth.users' as tabela,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmado,
    created_at,
    updated_at,
    raw_user_meta_data->>'tenant_id' as tenant_id_metadata,
    raw_user_meta_data->>'name' as name_metadata,
    raw_app_meta_data->>'role' as role_metadata,
    raw_app_meta_data->>'tenant_id' as tenant_id_app_metadata
FROM auth.users
WHERE email = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 2. VERIFICAR USUÁRIO EM PUBLIC.USERS
-- ============================================================================

SELECT 
    'public.users' as tabela,
    id,
    email,
    name,
    role,
    metadata,
    created_at,
    updated_at
FROM public.users
WHERE email = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 3. VERIFICAR VÍNCULO EM PUBLIC.TENANT_USERS
-- ============================================================================

SELECT 
    'public.tenant_users' as tabela,
    tu.id,
    tu.tenant_id,
    tu.user_id,
    tu.email,
    tu.role,
    tu.ativo,
    tu.metadata,
    t.name as tenant_name,
    t.slug as tenant_slug,
    tu.created_at,
    tu.updated_at
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE tu.email = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 4. VERIFICAR TENANT
-- ============================================================================

SELECT 
    'public.tenants' as tabela,
    id,
    name,
    slug,
    email,
    telefone,
    ativo,
    created_at,
    updated_at
FROM public.tenants
WHERE id IN (
    SELECT tenant_id 
    FROM public.tenant_users 
    WHERE email = 'cleitonmaxcar@hotmail.com'
);

-- ============================================================================
-- 5. VERIFICAÇÃO COMPLETA (JOIN DE TODAS AS TABELAS)
-- ============================================================================

SELECT 
    'VERIFICAÇÃO COMPLETA' as info,
    au.id as auth_user_id,
    au.email as auth_email,
    au.email_confirmed_at IS NOT NULL as auth_email_confirmado,
    pu.id as public_user_id,
    pu.name as public_user_name,
    pu.role as public_user_role,
    tu.id as tenant_user_id,
    tu.tenant_id,
    tu.role as tenant_user_role,
    tu.ativo as tenant_user_ativo,
    t.name as tenant_name,
    -- Verificar se os IDs estão sincronizados
    CASE 
        WHEN au.id = pu.id AND pu.id = tu.user_id THEN '✅ IDs sincronizados'
        ELSE '❌ IDs NÃO sincronizados'
    END as status_ids,
    -- Verificar se tenant_id está nos metadados
    CASE 
        WHEN au.raw_user_meta_data->>'tenant_id' = tu.tenant_id::text 
             OR au.raw_app_meta_data->>'tenant_id' = tu.tenant_id::text 
        THEN '✅ tenant_id nos metadados'
        ELSE '⚠️ tenant_id NÃO nos metadados'
    END as status_metadata
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
FULL OUTER JOIN public.tenant_users tu ON tu.email = COALESCE(au.email, pu.email)
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE COALESCE(au.email, pu.email, tu.email) = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 6. DIAGNÓSTICO DE PROBLEMAS COMUNS
-- ============================================================================

DO $$
DECLARE
    v_auth_exists boolean := false;
    v_public_user_exists boolean := false;
    v_tenant_user_exists boolean := false;
    v_email_confirmed boolean := false;
    v_ids_sync boolean := false;
    v_tenant_id uuid;
    v_user_id uuid;
BEGIN
    -- Verificar auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'cleitonmaxcar@hotmail.com'
    ) INTO v_auth_exists;
    
    -- Verificar public.users
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE email = 'cleitonmaxcar@hotmail.com'
    ) INTO v_public_user_exists;
    
    -- Verificar public.tenant_users
    SELECT EXISTS(
        SELECT 1 FROM public.tenant_users WHERE email = 'cleitonmaxcar@hotmail.com'
    ) INTO v_tenant_user_exists;
    
    -- Verificar email confirmado
    SELECT email_confirmed_at IS NOT NULL INTO v_email_confirmed
    FROM auth.users
    WHERE email = 'cleitonmaxcar@hotmail.com';
    
    -- Verificar sincronização de IDs
    SELECT 
        au.id = pu.id AND pu.id = tu.user_id INTO v_ids_sync
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.email = au.email
    LEFT JOIN public.tenant_users tu ON tu.email = au.email
    WHERE au.email = 'cleitonmaxcar@hotmail.com';
    
    -- Obter tenant_id
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_users
    WHERE email = 'cleitonmaxcar@hotmail.com'
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 DIAGNÓSTICO DO USUÁRIO';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    IF v_auth_exists THEN
        RAISE NOTICE '✅ Usuário existe em auth.users';
    ELSE
        RAISE NOTICE '❌ PROBLEMA: Usuário NÃO existe em auth.users';
        RAISE NOTICE '   → SOLUÇÃO: Criar usuário no Supabase Auth Dashboard ou via API';
    END IF;
    
    IF v_email_confirmed THEN
        RAISE NOTICE '✅ Email confirmado';
    ELSE
        RAISE NOTICE '⚠️  PROBLEMA: Email NÃO confirmado';
        RAISE NOTICE '   → SOLUÇÃO: Confirmar email no Supabase Auth Dashboard';
    END IF;
    
    IF v_public_user_exists THEN
        RAISE NOTICE '✅ Usuário existe em public.users';
    ELSE
        RAISE NOTICE '⚠️  Usuário NÃO existe em public.users';
        RAISE NOTICE '   → SOLUÇÃO: Criar registro em public.users';
    END IF;
    
    IF v_tenant_user_exists THEN
        RAISE NOTICE '✅ Vínculo existe em public.tenant_users';
        IF v_tenant_id IS NOT NULL THEN
            RAISE NOTICE '   Tenant ID: %', v_tenant_id;
        END IF;
    ELSE
        RAISE NOTICE '❌ PROBLEMA: Vínculo NÃO existe em public.tenant_users';
        RAISE NOTICE '   → SOLUÇÃO: Criar vínculo em public.tenant_users';
    END IF;
    
    IF v_ids_sync THEN
        RAISE NOTICE '✅ IDs estão sincronizados entre as tabelas';
    ELSE
        RAISE NOTICE '⚠️  PROBLEMA: IDs NÃO estão sincronizados';
        RAISE NOTICE '   → SOLUÇÃO: Atualizar IDs nas tabelas para corresponder ao auth.users';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Resumo final
    IF v_auth_exists AND v_email_confirmed AND v_tenant_user_exists AND v_ids_sync THEN
        RAISE NOTICE '✅ USUÁRIO CONFIGURADO CORRETAMENTE!';
        RAISE NOTICE '   O login deve funcionar.';
    ELSE
        RAISE NOTICE '❌ USUÁRIO COM PROBLEMAS DE CONFIGURAÇÃO';
        RAISE NOTICE '   Execute o script fix_user_login.py para corrigir.';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
