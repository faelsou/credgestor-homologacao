-- ============================================================================
-- CREDGESTOR - Sincronizar Name no Metadata com o Campo Name
-- ============================================================================
-- Este script atualiza o campo "name" dentro do metadata (JSONB) 
-- para ser igual ao campo "name" da tabela public.users
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR NAME NO METADATA DE PUBLIC.USERS
-- ============================================================================

UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('name', name),
    updated_at = now()
WHERE name IS NOT NULL
  AND (
    metadata->>'name' IS NULL 
    OR metadata->>'name' != name
  );

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ public.users: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- 2. ATUALIZAR NAME NO METADATA DE PUBLIC.TENANT_USERS
-- ============================================================================

-- Primeiro, vamos obter o name da tabela users através do email
UPDATE public.tenant_users tu
SET 
    metadata = COALESCE(tu.metadata, '{}'::jsonb) || jsonb_build_object('name', u.name),
    updated_at = now()
FROM public.users u
WHERE tu.email = u.email
  AND u.name IS NOT NULL
  AND (
    tu.metadata->>'name' IS NULL 
    OR tu.metadata->>'name' != u.name
  );

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ public.tenant_users: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- 3. ATUALIZAR NAME NO METADATA DE AUTH.USERS
-- ============================================================================

UPDATE auth.users au
SET 
    raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', u.name),
    updated_at = now()
FROM public.users u
WHERE au.email = u.email
  AND u.name IS NOT NULL
  AND (
    au.raw_user_meta_data->>'name' IS NULL 
    OR au.raw_user_meta_data->>'name' != u.name
  );

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ auth.users: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se os names estão sincronizados
SELECT 
    'VERIFICAÇÃO DE SINCRONIZAÇÃO' as info,
    u.email,
    u.name as name_tabela,
    u.metadata->>'name' as name_metadata_users,
    tu.metadata->>'name' as name_metadata_tenant_users,
    au.raw_user_meta_data->>'name' as name_metadata_auth,
    CASE 
        WHEN u.name = u.metadata->>'name' 
         AND u.name = tu.metadata->>'name'
         AND u.name = au.raw_user_meta_data->>'name'
        THEN '✅ Sincronizado'
        ELSE '⚠️ Não sincronizado'
    END as status
FROM public.users u
LEFT JOIN public.tenant_users tu ON tu.email = u.email
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.name IS NOT NULL
ORDER BY u.email;

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SINCRONIZAÇÃO DE NAME NO METADATA CONCLUÍDA!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabelas atualizadas:';
    RAISE NOTICE '  - public.users (metadata->name)';
    RAISE NOTICE '  - public.tenant_users (metadata->name)';
    RAISE NOTICE '  - auth.users (raw_user_meta_data->name)';
    RAISE NOTICE '';
    RAISE NOTICE 'O campo "name" no metadata agora está sincronizado com o campo "name" da tabela.';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
