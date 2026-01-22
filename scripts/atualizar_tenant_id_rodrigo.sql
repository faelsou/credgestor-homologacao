-- ============================================================================
-- CREDGESTOR - Atualizar Tenant ID do Usuário Rodrigo
-- ============================================================================
-- Este script atualiza o tenant_id do usuário Rodrigo em TODAS as tabelas
-- Email do usuário: rodrigoconecteloja@gmail.com
-- 
-- De: 7b45092c-5f80-4746-b4f2-41fff758fa44
-- Para: 00000000-0000-0000-0000-000000000004
-- ============================================================================

-- ============================================================================
-- CONFIGURAÇÃO
-- ============================================================================

DO $$
DECLARE
    v_email text := 'rodrigoconecteloja@gmail.com';
    v_tenant_id_antigo uuid := '7b45092c-5f80-4746-b4f2-41fff758fa44';
    v_tenant_id_novo uuid := '00000000-0000-0000-0000-000000000004';
    v_user_id uuid;
    v_registros_afetados integer;
BEGIN
    -- Obter o user_id do Rodrigo
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado com email: %', v_email;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔄 INICIANDO ATUALIZAÇÃO DE TENANT_ID';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Usuário: %', v_email;
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Tenant ID Antigo: %', v_tenant_id_antigo;
    RAISE NOTICE 'Tenant ID Novo: %', v_tenant_id_novo;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 1. ATUALIZAR TENANT_ID EM PUBLIC.TENANT_USERS
-- ============================================================================

UPDATE public.tenant_users
SET 
    tenant_id = '00000000-0000-0000-0000-000000000004',
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com'
  AND tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ tenant_users: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- 2. ATUALIZAR TENANT_ID EM PUBLIC.CLIENTS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clients'
    ) THEN
        UPDATE public.clients
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ clients: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela clients não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 3. ATUALIZAR TENANT_ID EM PUBLIC.EXPERIENCES
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'experiences'
    ) THEN
        UPDATE public.experiences
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ experiences: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela experiences não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 4. ATUALIZAR TENANT_ID EM PUBLIC.HISTORIC_SCORES
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'historic_scores'
    ) THEN
        UPDATE public.historic_scores
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ historic_scores: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela historic_scores não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 5. ATUALIZAR TENANT_ID EM PUBLIC.LOGIN_AUDIT
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'login_audit'
    ) THEN
        UPDATE public.login_audit
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ login_audit: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela login_audit não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 6. ATUALIZAR TENANT_ID EM PUBLIC.TENANT_ROLES
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tenant_roles'
    ) THEN
        UPDATE public.tenant_roles
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ tenant_roles: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela tenant_roles não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 7. ATUALIZAR TENANT_ID EM PUBLIC.ROLE_PERMISSIONS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'role_permissions'
    ) THEN
        UPDATE public.role_permissions
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ role_permissions: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela role_permissions não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 8. ATUALIZAR TENANT_ID EM PUBLIC.CUSTOM_DOMAINS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'custom_domains'
    ) THEN
        UPDATE public.custom_domains
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ custom_domains: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela custom_domains não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 9. ATUALIZAR TENANT_ID EM PUBLIC.USER_SESSIONS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_sessions'
    ) THEN
        UPDATE public.user_sessions
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ user_sessions: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela user_sessions não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 10. ATUALIZAR TENANT_ID EM PUBLIC.PRODUTOS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'produtos'
    ) THEN
        UPDATE public.produtos
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ produtos: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela produtos não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 11. ATUALIZAR TENANT_ID EM PUBLIC.PROPOSTAS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'propostas'
    ) THEN
        UPDATE public.propostas
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ propostas: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela propostas não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 12. ATUALIZAR TENANT_ID EM PUBLIC.PARCELAS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'parcelas'
    ) THEN
        UPDATE public.parcelas
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ parcelas: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela parcelas não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 13. ATUALIZAR TENANT_ID EM PUBLIC.PAGAMENTOS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pagamentos'
    ) THEN
        UPDATE public.pagamentos
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ pagamentos: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela pagamentos não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 14. ATUALIZAR TENANT_ID EM PUBLIC.DOCUMENTOS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'documentos'
    ) THEN
        UPDATE public.documentos
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ documentos: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela documentos não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 15. ATUALIZAR TENANT_ID EM PUBLIC.AUDITORIA
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'auditoria'
    ) THEN
        UPDATE public.auditoria
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ auditoria: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela auditoria não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 16. ATUALIZAR TENANT_ID EM PUBLIC.COMISSOES
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'comissoes'
    ) THEN
        UPDATE public.comissoes
        SET tenant_id = '00000000-0000-0000-0000-000000000004'
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ comissoes: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela comissoes não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 17. ATUALIZAR TENANT_ID EM PUBLIC.LOANS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'loans'
    ) THEN
        UPDATE public.loans
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ loans: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela loans não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 18. ATUALIZAR TENANT_ID EM PUBLIC.INSTALLMENTS
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'installments'
    ) THEN
        UPDATE public.installments
        SET 
            tenant_id = '00000000-0000-0000-0000-000000000004',
            updated_at = now()
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ installments: % registro(s) atualizado(s)', v_count;
    ELSE
        RAISE NOTICE '⚠️  Tabela installments não existe, pulando...';
    END IF;
END $$;

-- ============================================================================
-- 19. ATUALIZAR TENANT_ID NO METADATA DE PUBLIC.USERS
-- ============================================================================

UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com'
  AND (metadata->>'tenant_id' = '7b45092c-5f80-4746-b4f2-41fff758fa44' OR metadata->>'tenant_id' IS NULL);

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ users.metadata: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- 20. ATUALIZAR TENANT_ID NO METADATA DE PUBLIC.TENANT_USERS
-- ============================================================================

UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com'
  AND (metadata->>'tenant_id' = '7b45092c-5f80-4746-b4f2-41fff758fa44' OR metadata->>'tenant_id' IS NULL);

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ tenant_users.metadata: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- 21. ATUALIZAR TENANT_ID NO METADATA DE AUTH.USERS
-- ============================================================================

UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com'
  AND (
    raw_user_meta_data->>'tenant_id' = '7b45092c-5f80-4746-b4f2-41fff758fa44' 
    OR raw_app_meta_data->>'tenant_id' = '7b45092c-5f80-4746-b4f2-41fff758fa44'
    OR raw_user_meta_data->>'tenant_id' IS NULL
    OR raw_app_meta_data->>'tenant_id' IS NULL
  );

DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ auth.users.metadata: % registro(s) atualizado(s)', v_count;
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 VERIFICAÇÃO FINAL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- Verificar se ainda há registros com o tenant_id antigo
DO $$
DECLARE
    v_count integer;
BEGIN
    -- Verificar tenant_users
    SELECT COUNT(*) INTO v_count
    FROM public.tenant_users
    WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
    RAISE NOTICE '📊 tenant_users com tenant_id antigo: %', v_count;
    
    -- Verificar clients
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clients'
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.clients
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        RAISE NOTICE '📊 clients com tenant_id antigo: %', v_count;
    END IF;
    
    -- Verificar propostas
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'propostas'
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.propostas
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        RAISE NOTICE '📊 propostas com tenant_id antigo: %', v_count;
    END IF;
    
    -- Verificar parcelas
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'parcelas'
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.parcelas
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        RAISE NOTICE '📊 parcelas com tenant_id antigo: %', v_count;
    END IF;
    
    -- Verificar loans
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'loans'
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.loans
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        RAISE NOTICE '📊 loans com tenant_id antigo: %', v_count;
    END IF;
    
    -- Verificar installments
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'installments'
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.installments
        WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44';
        RAISE NOTICE '📊 installments com tenant_id antigo: %', v_count;
    END IF;
END $$;

-- Verificar tenant_id atual do usuário Rodrigo
SELECT 
    'TENANT_ID ATUAL DO USUÁRIO RODRIGO' as info,
    tu.email,
    tu.tenant_id as tenant_id_tenant_users,
    pu.metadata->>'tenant_id' as tenant_id_users_metadata,
    au.raw_user_meta_data->>'tenant_id' as tenant_id_auth_user_metadata,
    au.raw_app_meta_data->>'tenant_id' as tenant_id_auth_app_metadata
FROM public.tenant_users tu
LEFT JOIN public.users pu ON pu.email = tu.email
LEFT JOIN auth.users au ON au.email = tu.email
WHERE tu.email = 'rodrigoconecteloja@gmail.com';

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ATUALIZAÇÃO DE TENANT_ID CONCLUÍDA!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário: rodrigoconecteloja@gmail.com';
    RAISE NOTICE 'Tenant ID Antigo: 7b45092c-5f80-4746-b4f2-41fff758fa44';
    RAISE NOTICE 'Tenant ID Novo: 00000000-0000-0000-0000-000000000004';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabelas atualizadas:';
    RAISE NOTICE '  - tenant_users';
    RAISE NOTICE '  - clients';
    RAISE NOTICE '  - experiences';
    RAISE NOTICE '  - historic_scores';
    RAISE NOTICE '  - login_audit';
    RAISE NOTICE '  - tenant_roles';
    RAISE NOTICE '  - role_permissions';
    RAISE NOTICE '  - custom_domains';
    RAISE NOTICE '  - user_sessions';
    RAISE NOTICE '  - produtos';
    RAISE NOTICE '  - propostas';
    RAISE NOTICE '  - parcelas';
    RAISE NOTICE '  - pagamentos';
    RAISE NOTICE '  - documentos';
    RAISE NOTICE '  - auditoria';
    RAISE NOTICE '  - comissoes';
    RAISE NOTICE '  - loans';
    RAISE NOTICE '  - installments';
    RAISE NOTICE '  - users.metadata';
    RAISE NOTICE '  - tenant_users.metadata';
    RAISE NOTICE '  - auth.users.metadata';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
