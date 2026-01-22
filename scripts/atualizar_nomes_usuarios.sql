-- ============================================================================
-- CREDGESTOR - Atualizar Nomes de Usuários no Banco de Dados
-- ============================================================================
-- Este script atualiza os nomes dos usuários nas tabelas:
--   - public.users (campo name)
--   - auth.users (campo raw_user_meta_data->>'name')
-- ============================================================================

-- ============================================================================
-- DADOS PARA ATUALIZAÇÃO
-- ============================================================================

-- Usuário 1: Ancore Cosmeticos -> Cleiton Araújo Dias
-- Email: ancorecosmeticos@hotmail.com
-- Nome antigo: Ancore Cosmeticos
-- Nome novo: Cleiton Araújo Dias

-- Usuário 2: Cleiton Max Car -> Cleiton Araújo Dias
-- Email: cleitonmaxcar@hotmail.com
-- Nome antigo: Cleiton Max Car
-- Nome novo: Cleiton Araújo Dias

-- Usuário 3: Rodrigo Conecte Loja -> Rodrigo Assunção
-- Email: rodrigoconecteloja@gmail.com
-- Nome antigo: Rodrigo Conecte Loja
-- Nome novo: Rodrigo Assunção

-- ============================================================================
-- 1. ATUALIZAR NOME EM PUBLIC.USERS
-- ============================================================================

-- Atualizar nome do usuário Ancore Cosmeticos
UPDATE public.users
SET 
    name = 'Cleiton Araújo Dias',
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
            AND name = 'Cleiton Araújo Dias'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Cleiton Araújo Dias (Ancore Cosmeticos) em public.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Ancore Cosmeticos em public.users';
        END IF;
    END IF;
END $$;

-- Atualizar nome do usuário Cleiton Max Car
UPDATE public.users
SET 
    name = 'Cleiton Araújo Dias',
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.users 
    WHERE email = 'cleitonmaxcar@hotmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em public.users com email: cleitonmaxcar@hotmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.users 
            WHERE email = 'cleitonmaxcar@hotmail.com' 
            AND name = 'Cleiton Araújo Dias'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Cleiton Araújo Dias (Cleiton Max Car) em public.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Cleiton Max Car em public.users';
        END IF;
    END IF;
END $$;

-- Atualizar nome do usuário Rodrigo Conecte Loja
UPDATE public.users
SET 
    name = 'Rodrigo Assunção',
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.users 
    WHERE email = 'rodrigoconecteloja@gmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em public.users com email: rodrigoconecteloja@gmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.users 
            WHERE email = 'rodrigoconecteloja@gmail.com' 
            AND name = 'Rodrigo Assunção'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Rodrigo Assunção (Rodrigo Conecte Loja) em public.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Rodrigo Conecte Loja em public.users';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. ATUALIZAR NOME NO SUPABASE AUTH (raw_user_meta_data)
-- ============================================================================

-- Atualizar nome do usuário Ancore Cosmeticos no Auth
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Cleiton Araújo Dias'),
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
            AND raw_user_meta_data->>'name' = 'Cleiton Araújo Dias'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Cleiton Araújo Dias (Ancore Cosmeticos) em auth.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Ancore Cosmeticos em auth.users';
        END IF;
    END IF;
END $$;

-- Atualizar nome do usuário Cleiton Max Car no Auth
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Cleiton Araújo Dias'),
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM auth.users 
    WHERE email = 'cleitonmaxcar@hotmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em auth.users com email: cleitonmaxcar@hotmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM auth.users 
            WHERE email = 'cleitonmaxcar@hotmail.com' 
            AND raw_user_meta_data->>'name' = 'Cleiton Araújo Dias'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Cleiton Araújo Dias (Cleiton Max Car) em auth.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Cleiton Max Car em auth.users';
        END IF;
    END IF;
END $$;

-- Atualizar nome do usuário Rodrigo Conecte Loja no Auth
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Rodrigo Assunção'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated boolean;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM auth.users 
    WHERE email = 'rodrigoconecteloja@gmail.com';
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️  Usuário não encontrado em auth.users com email: rodrigoconecteloja@gmail.com';
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM auth.users 
            WHERE email = 'rodrigoconecteloja@gmail.com' 
            AND raw_user_meta_data->>'name' = 'Rodrigo Assunção'
        ) INTO v_updated;
        
        IF v_updated THEN
            RAISE NOTICE '✅ Nome atualizado para Rodrigo Assunção (Rodrigo Conecte Loja) em auth.users';
        ELSE
            RAISE NOTICE '⚠️  Nome não foi atualizado para Rodrigo Conecte Loja em auth.users';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 3. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar nomes atualizados
SELECT 
    'VERIFICAÇÃO DE NOMES' as info,
    au.email,
    pu.name as nome_public_users,
    au.raw_user_meta_data->>'name' as nome_auth_users,
    CASE 
        WHEN pu.name = au.raw_user_meta_data->>'name' THEN '✅ Nomes sincronizados'
        WHEN pu.name IS NOT NULL AND au.raw_user_meta_data->>'name' IS NOT NULL THEN '⚠️ Nomes diferentes'
        WHEN pu.name IS NOT NULL OR au.raw_user_meta_data->>'name' IS NOT NULL THEN '⚠️ Nome em apenas uma tabela'
        ELSE '❌ Nome não encontrado'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE au.email IN (
    'ancorecosmeticos@hotmail.com',
    'cleitonmaxcar@hotmail.com',
    'rodrigoconecteloja@gmail.com'
)
ORDER BY au.email;

-- ============================================================================
-- 4. RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ATUALIZAÇÃO DE NOMES CONCLUÍDA!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 1: Ancore Cosmeticos';
    RAISE NOTICE '  Email: ancorecosmeticos@hotmail.com';
    RAISE NOTICE '  Nome antigo: Ancore Cosmeticos';
    RAISE NOTICE '  Nome novo: Cleiton Araújo Dias';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 2: Cleiton Max Car';
    RAISE NOTICE '  Email: cleitonmaxcar@hotmail.com';
    RAISE NOTICE '  Nome antigo: Cleiton Max Car';
    RAISE NOTICE '  Nome novo: Cleiton Araújo Dias';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 3: Rodrigo Conecte Loja';
    RAISE NOTICE '  Email: rodrigoconecteloja@gmail.com';
    RAISE NOTICE '  Nome antigo: Rodrigo Conecte Loja';
    RAISE NOTICE '  Nome novo: Rodrigo Assunção';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
