-- ============================================================================
-- CREDGESTOR - Atualizar Telefone de Usuário
-- ============================================================================
-- Este script atualiza o telefone do usuário Ancore Cosmeticos
-- Email: ancorecosmeticos@hotmail.com
-- Telefone: 1194789-7969
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR TELEFONE EM PUBLIC.USERS (campo metadata)
-- ============================================================================

UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.users 
    WHERE email = 'ancorecosmeticos@hotmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em public.users com email: ancorecosmeticos@hotmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.users 
            WHERE email = 'ancorecosmeticos@hotmail.com' 
            AND metadata->>'telefone' = '1194789-7969'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Telefone atualizado para Ancore Cosmeticos em public.users';
        ELSE
            RAISE NOTICE '⚠️  Telefone não foi atualizado para Ancore Cosmeticos em public.users';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. ATUALIZAR TELEFONE EM PUBLIC.TENANT_USERS (campo metadata)
-- ============================================================================

UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.tenant_users 
    WHERE email = 'ancorecosmeticos@hotmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em public.tenant_users com email: ancorecosmeticos@hotmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.tenant_users 
            WHERE email = 'ancorecosmeticos@hotmail.com' 
            AND metadata->>'telefone' = '1194789-7969'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Telefone atualizado para Ancore Cosmeticos em public.tenant_users';
        ELSE
            RAISE NOTICE '⚠️  Telefone não foi atualizado para Ancore Cosmeticos em public.tenant_users';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 3. ATUALIZAR TELEFONE NO SUPABASE AUTH (user_metadata)
-- ============================================================================

UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM auth.users 
    WHERE email = 'ancorecosmeticos@hotmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em auth.users com email: ancorecosmeticos@hotmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM auth.users 
            WHERE email = 'ancorecosmeticos@hotmail.com' 
            AND raw_user_meta_data->>'telefone' = '1194789-7969'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Telefone atualizado para Ancore Cosmeticos em auth.users';
        ELSE
            RAISE NOTICE '⚠️  Telefone não foi atualizado para Ancore Cosmeticos em auth.users';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar telefone atualizado em todas as tabelas
SELECT 
    'VERIFICAÇÃO DE TELEFONE' as info,
    au.email,
    pu.name as nome,
    pu.metadata->>'telefone' as telefone_public_users,
    tu.metadata->>'telefone' as telefone_tenant_users,
    au.raw_user_meta_data->>'telefone' as telefone_auth_users,
    CASE 
        WHEN pu.metadata->>'telefone' IS NOT NULL 
         AND tu.metadata->>'telefone' IS NOT NULL 
         AND au.raw_user_meta_data->>'telefone' IS NOT NULL
        THEN '✅ Telefone em todas as tabelas'
        WHEN pu.metadata->>'telefone' IS NOT NULL 
         OR tu.metadata->>'telefone' IS NOT NULL 
         OR au.raw_user_meta_data->>'telefone' IS NOT NULL
        THEN '⚠️ Telefone em algumas tabelas'
        ELSE '❌ Telefone não encontrado'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
LEFT JOIN public.tenant_users tu ON tu.email = au.email
WHERE au.email = 'ancorecosmeticos@hotmail.com';

-- Verificar dados do usuário
SELECT 
    'DADOS DO USUÁRIO' as info,
    tu.tenant_id,
    t.name as tenant_name,
    tu.email,
    tu.role,
    tu.ativo,
    u.name as user_name,
    u.id as user_id,
    tu.metadata->>'telefone' as telefone,
    tu.created_at,
    tu.updated_at
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.email = 'ancorecosmeticos@hotmail.com'
ORDER BY tu.created_at DESC;

-- ============================================================================
-- 5. RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ATUALIZAÇÃO DE TELEFONE CONCLUÍDA!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário: Ancore Cosmeticos';
    RAISE NOTICE '  Email: ancorecosmeticos@hotmail.com';
    RAISE NOTICE '  Telefone: 1194789-7969';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
