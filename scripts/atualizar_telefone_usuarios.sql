-- ============================================================================
-- CREDGESTOR - Atualizar Telefone de Usuários
-- ============================================================================
-- Este script atualiza o telefone de usuários no banco de dados
-- ============================================================================

-- ============================================================================
-- DADOS PARA ATUALIZAÇÃO
-- ============================================================================

-- Usuário 1: AiAgent Automate
-- Email: aiagenteautomate@gmail.com
-- Telefone: 1195231-3944

-- Usuário 2: Cleiton Max Car
-- Email: cleitonmaxcar@hotmail.com
-- Telefone: 1194789-7969

-- ============================================================================
-- 1. ATUALIZAR TELEFONE EM PUBLIC.USERS (campo metadata)
-- ============================================================================

-- Atualizar telefone do AiAgent Automate
UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1195231-3944'),
    updated_at = now()
WHERE email = 'aiagenteautomate@gmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE email = 'aiagenteautomate@gmail.com' 
        AND metadata->>'telefone' = '1195231-3944'
    ) INTO v_updated;
    
    IF v_updated THEN
        RAISE NOTICE '✅ Telefone atualizado para AiAgent Automate em public.users';
    ELSE
        RAISE NOTICE '⚠️  Telefone não foi atualizado para AiAgent Automate em public.users';
    END IF;
END $$;

-- Atualizar telefone do Cleiton Max Car
UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE email = 'cleitonmaxcar@hotmail.com' 
        AND metadata->>'telefone' = '1194789-7969'
    ) INTO v_updated;
    
    IF v_updated THEN
        RAISE NOTICE '✅ Telefone atualizado para Cleiton Max Car em public.users';
    ELSE
        RAISE NOTICE '⚠️  Telefone não foi atualizado para Cleiton Max Car em public.users';
    END IF;
END $$;

-- ============================================================================
-- 2. ATUALIZAR TELEFONE EM PUBLIC.TENANT_USERS (campo metadata)
-- ============================================================================

-- Atualizar telefone do AiAgent Automate
UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1195231-3944'),
    updated_at = now()
WHERE email = 'aiagenteautomate@gmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.tenant_users 
        WHERE email = 'aiagenteautomate@gmail.com' 
        AND metadata->>'telefone' = '1195231-3944'
    ) INTO v_updated;
    
    IF v_updated THEN
        RAISE NOTICE '✅ Telefone atualizado para AiAgent Automate em public.tenant_users';
    ELSE
        RAISE NOTICE '⚠️  Telefone não foi atualizado para AiAgent Automate em public.tenant_users';
    END IF;
END $$;

-- Atualizar telefone do Cleiton Max Car
UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.tenant_users 
        WHERE email = 'cleitonmaxcar@hotmail.com' 
        AND metadata->>'telefone' = '1194789-7969'
    ) INTO v_updated;
    
    IF v_updated THEN
        RAISE NOTICE '✅ Telefone atualizado para Cleiton Max Car em public.tenant_users';
    ELSE
        RAISE NOTICE '⚠️  Telefone não foi atualizado para Cleiton Max Car em public.tenant_users';
    END IF;
END $$;

-- ============================================================================
-- 3. ATUALIZAR TELEFONE NO SUPABASE AUTH (user_metadata)
-- ============================================================================

-- Atualizar telefone do AiAgent Automate no Auth
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('telefone', '1195231-3944'),
    updated_at = now()
WHERE email = 'aiagenteautomate@gmail.com';

-- Atualizar telefone do Cleiton Max Car no Auth
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

-- ============================================================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar telefones atualizados
SELECT 
    'VERIFICAÇÃO DE TELEFONES' as info,
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
WHERE au.email IN ('aiagenteautomate@gmail.com', 'cleitonmaxcar@hotmail.com')
ORDER BY au.email;

-- ============================================================================
-- 5. RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ATUALIZAÇÃO DE TELEFONES CONCLUÍDA!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 1: AiAgent Automate';
    RAISE NOTICE '  Email: aiagenteautomate@gmail.com';
    RAISE NOTICE '  Telefone: 1195231-3944';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 2: Cleiton Max Car';
    RAISE NOTICE '  Email: cleitonmaxcar@hotmail.com';
    RAISE NOTICE '  Telefone: 1194789-7969';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
