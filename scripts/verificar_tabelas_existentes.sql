-- ============================================================================
-- CREDGESTOR - Verificar Tabelas Existentes
-- ============================================================================
-- Este script verifica quais tabelas existem no banco de dados
-- Execute este script primeiro para verificar se as tabelas foram criadas
-- ============================================================================

-- ============================================================================
-- 1. LISTAR TODAS AS TABELAS NO SCHEMA PUBLIC
-- ============================================================================

SELECT 
    'TABELAS EXISTENTES' as info,
    table_name as nome_tabela,
    CASE 
        WHEN table_name IN ('tenants', 'users', 'tenant_users', 'clients', 'loans', 'installments') 
        THEN '✅ Tabela Principal'
        ELSE '📋 Outra Tabela'
    END as tipo
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name IN ('tenants', 'users', 'tenant_users') THEN 1
        WHEN table_name IN ('clients', 'loans', 'installments') THEN 2
        ELSE 3
    END,
    table_name;

-- ============================================================================
-- 2. VERIFICAR TABELAS PRINCIPAIS ESPECÍFICAS
-- ============================================================================

SELECT 
    'VERIFICAÇÃO DE TABELAS PRINCIPAIS' as info,
    'tenants' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'tenants'
        ) THEN '✅ Existe'
        ELSE '❌ Não Existe'
    END as status
UNION ALL
SELECT 
    'VERIFICAÇÃO DE TABELAS PRINCIPAIS' as info,
    'users' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN '✅ Existe'
        ELSE '❌ Não Existe'
    END as status
UNION ALL
SELECT 
    'VERIFICAÇÃO DE TABELAS PRINCIPAIS' as info,
    'tenant_users' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'tenant_users'
        ) THEN '✅ Existe'
        ELSE '❌ Não Existe'
    END as status
UNION ALL
SELECT 
    'VERIFICAÇÃO DE TABELAS PRINCIPAIS' as info,
    'clients' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'clients'
        ) THEN '✅ Existe'
        ELSE '❌ Não Existe'
    END as status;

-- ============================================================================
-- 3. CONTAR REGISTROS NAS TABELAS PRINCIPAIS (se existirem)
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    -- Contar tenants
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tenants'
    ) THEN
        SELECT COUNT(*) INTO v_count FROM public.tenants;
        RAISE NOTICE '📊 Total de tenants: %', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela tenants não existe';
    END IF;
    
    -- Contar users
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        SELECT COUNT(*) INTO v_count FROM public.users;
        RAISE NOTICE '📊 Total de users: %', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela users não existe';
    END IF;
    
    -- Contar tenant_users
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tenant_users'
    ) THEN
        SELECT COUNT(*) INTO v_count FROM public.tenant_users;
        RAISE NOTICE '📊 Total de tenant_users: %', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela tenant_users não existe';
    END IF;
END $$;

-- ============================================================================
-- 4. INSTRUÇÕES
-- ============================================================================

SELECT 
    'INSTRUÇÕES' as info,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'tenants'
        ) THEN '❌ Execute: scripts/create_all_tables_supabase.sql para criar as tabelas'
        ELSE '✅ Tabelas principais existem. Pode executar scripts de verificação.'
    END as mensagem;
