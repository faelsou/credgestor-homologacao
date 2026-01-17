-- ============================================================================
-- CREDGESTOR - Criar 2 Usuários Admin Completos
-- ============================================================================
-- Este script cria 2 usuários admin completos com acesso total à aplicação
-- ============================================================================

-- ============================================================================
-- DADOS DOS USUÁRIOS
-- ============================================================================

-- Usuário 1: AiAgent Automate
-- Email: aiagenteautomate@gmail.com
-- Senha: 061603F@tim@
-- Nome: AiAgent Automate
-- Role: admin

-- Usuário 2: Ancore Cosmeticos
-- Email: ancorecosmeticos@hotmail.com
-- Senha: AncoreComseticos2026
-- Nome: Ancore Cosmeticos
-- Role: admin

-- ============================================================================
-- 1. CRIAR/VERIFICAR TENANT PADRÃO
-- ============================================================================

-- Criar tenant padrão se não existir (ou usar um existente)
DO $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Tenta encontrar um tenant existente ou cria um novo
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE ativo = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Se não encontrou nenhum tenant, cria um padrão
    IF v_tenant_id IS NULL THEN
        v_tenant_id := '00000000-0000-0000-0000-000000000001';
        INSERT INTO public.tenants (id, name, slug, email, telefone, ativo) 
        VALUES (
            v_tenant_id,
            'Tenant Principal',
            'tenant-principal',
            'admin@credgestor.com',
            '(11) 0000-0000',
            true
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            email = EXCLUDED.email,
            telefone = EXCLUDED.telefone,
            ativo = EXCLUDED.ativo,
            updated_at = now();
    END IF;
    
    -- Armazena o tenant_id em uma variável de sessão para uso posterior
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, false);
    
    RAISE NOTICE '✅ Tenant ID: %', v_tenant_id;
END $$;

-- ============================================================================
-- 2. FUNÇÃO AUXILIAR PARA CRIAR USUÁRIO NO AUTH
-- ============================================================================

CREATE OR REPLACE FUNCTION create_auth_user(
    p_email text,
    p_password text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Insere na tabela auth.users (requer permissões especiais)
    -- Nota: Em produção, use a API do Supabase Auth
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        p_metadata,
        now(),
        now(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Se falhar, retorna NULL (usuário pode já existir)
        RAISE NOTICE '⚠️ Erro ao criar usuário no auth.users: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ============================================================================
-- 3. CRIAR USUÁRIO 1: AiAgent Automate
-- ============================================================================

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_email text := 'aiagenteautomate@gmail.com';
    v_password text := '061603F@tim@';
    v_name text := 'AiAgent Automate';
    v_role text := 'admin';
BEGIN
    -- Obter tenant_id
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE ativo = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        v_tenant_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    
    RAISE NOTICE '📋 Criando usuário 1: %', v_email;
    RAISE NOTICE '   Usando Tenant ID: %', v_tenant_id;
    
    -- Tentar criar usuário no Auth
    v_user_id := create_auth_user(
        v_email,
        v_password,
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', v_name,
            'role', v_role
        )
    );
    
    -- Se não conseguiu criar, tenta buscar usuário existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM auth.users 
        WHERE email = v_email 
        LIMIT 1;
        
        IF v_user_id IS NOT NULL THEN
            RAISE NOTICE 'ℹ️ Usuário já existe no auth.users com ID: %', v_user_id;
        END IF;
    ELSE
        RAISE NOTICE '✅ Usuário criado no auth.users com ID: %', v_user_id;
    END IF;
    
    -- Se ainda não tem usuário, cria um UUID temporário
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        RAISE NOTICE '⚠️ Criando UUID temporário: %. Você precisará criar o usuário no Supabase Auth Dashboard.', v_user_id;
    END IF;
    
    -- Criar registro na tabela users (global)
    INSERT INTO public.users (id, email, name, role, metadata)
    VALUES (
        v_user_id,
        v_email,
        v_name,
        v_role,
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', v_name,
            'role', v_role
        )
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    RAISE NOTICE '✅ Registro criado/atualizado em public.users';
    
    -- Vincular usuário ao tenant com role admin
    INSERT INTO public.tenant_users (tenant_id, user_id, email, role, ativo, metadata)
    VALUES (
        v_tenant_id,
        v_user_id,
        v_email,
        v_role,
        true,
        jsonb_build_object(
            'name', v_name,
            'role', v_role,
            'created_by', 'script'
        )
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        ativo = EXCLUDED.ativo,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    RAISE NOTICE '✅ Vínculo criado/atualizado em public.tenant_users';
    RAISE NOTICE '✅ Usuário 1 criado com sucesso!';
    
END $$;

-- ============================================================================
-- 4. CRIAR USUÁRIO 2: Ancore Cosmeticos
-- ============================================================================

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_email text := 'ancorecosmeticos@hotmail.com';
    v_password text := 'AncoreComseticos2026';
    v_name text := 'Ancore Cosmeticos';
    v_role text := 'admin';
BEGIN
    -- Obter tenant_id
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE ativo = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        v_tenant_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    
    RAISE NOTICE '📋 Criando usuário 2: %', v_email;
    RAISE NOTICE '   Usando Tenant ID: %', v_tenant_id;
    
    -- Tentar criar usuário no Auth
    v_user_id := create_auth_user(
        v_email,
        v_password,
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', v_name,
            'role', v_role
        )
    );
    
    -- Se não conseguiu criar, tenta buscar usuário existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM auth.users 
        WHERE email = v_email 
        LIMIT 1;
        
        IF v_user_id IS NOT NULL THEN
            RAISE NOTICE 'ℹ️ Usuário já existe no auth.users com ID: %', v_user_id;
        END IF;
    ELSE
        RAISE NOTICE '✅ Usuário criado no auth.users com ID: %', v_user_id;
    END IF;
    
    -- Se ainda não tem usuário, cria um UUID temporário
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        RAISE NOTICE '⚠️ Criando UUID temporário: %. Você precisará criar o usuário no Supabase Auth Dashboard.', v_user_id;
    END IF;
    
    -- Criar registro na tabela users (global)
    INSERT INTO public.users (id, email, name, role, metadata)
    VALUES (
        v_user_id,
        v_email,
        v_name,
        v_role,
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', v_name,
            'role', v_role
        )
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    RAISE NOTICE '✅ Registro criado/atualizado em public.users';
    
    -- Vincular usuário ao tenant com role admin
    INSERT INTO public.tenant_users (tenant_id, user_id, email, role, ativo, metadata)
    VALUES (
        v_tenant_id,
        v_user_id,
        v_email,
        v_role,
        true,
        jsonb_build_object(
            'name', v_name,
            'role', v_role,
            'created_by', 'script'
        )
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        ativo = EXCLUDED.ativo,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    RAISE NOTICE '✅ Vínculo criado/atualizado em public.tenant_users';
    RAISE NOTICE '✅ Usuário 2 criado com sucesso!';
    
END $$;

-- ============================================================================
-- 5. VERIFICAÇÃO DOS USUÁRIOS CRIADOS
-- ============================================================================

-- Verificar usuários criados
SELECT 
    'USUÁRIOS CRIADOS' as info,
    au.email,
    pu.name as nome,
    tu.role,
    tu.ativo,
    t.name as tenant_nome,
    au.email_confirmed_at IS NOT NULL as email_confirmado,
    au.id as auth_user_id,
    tu.user_id as public_user_id
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
LEFT JOIN public.tenant_users tu ON tu.email = au.email
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE au.email IN ('aiagenteautomate@gmail.com', 'ancorecosmeticos@hotmail.com')
ORDER BY au.email;

-- ============================================================================
-- 6. RESUMO FINAL
-- ============================================================================

DO $$
DECLARE
    v_tenant_id uuid;
BEGIN
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE ativo = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        v_tenant_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ USUÁRIOS ADMIN CRIADOS COM SUCESSO!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 1:';
    RAISE NOTICE '  Email: aiagenteautomate@gmail.com';
    RAISE NOTICE '  Senha: 061603F@tim@';
    RAISE NOTICE '  Nome: AiAgent Automate';
    RAISE NOTICE '  Role: admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Usuário 2:';
    RAISE NOTICE '  Email: ancorecosmeticos@hotmail.com';
    RAISE NOTICE '  Senha: AncoreComseticos2026';
    RAISE NOTICE '  Nome: Ancore Cosmeticos';
    RAISE NOTICE '  Role: admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- 7. INSTRUÇÕES IMPORTANTES
-- ============================================================================

-- ⚠️ IMPORTANTE: Se os usuários não foram criados automaticamente no auth.users,
-- você precisa criá-los manualmente no Supabase Auth Dashboard:
--
-- 1. Acesse: https://app.supabase.com/project/[SEU-PROJECT]/auth/users
-- 2. Para cada usuário, clique em "Add User" > "Create new user"
--
-- Usuário 1:
--    - Email: aiagenteautomate@gmail.com
--    - Password: 061603F@tim@
--    - Auto Confirm User: ✅ (MARCAR)
--    - User Metadata: {"tenant_id": "[TENANT_ID]", "name": "AiAgent Automate", "role": "admin"}
--
-- Usuário 2:
--    - Email: ancorecosmeticos@hotmail.com
--    - Password: AncoreComseticos2026
--    - Auto Confirm User: ✅ (MARCAR)
--    - User Metadata: {"tenant_id": "[TENANT_ID]", "name": "Ancore Cosmeticos", "role": "admin"}
--
-- 4. Após criar no Auth, execute o script abaixo para atualizar os IDs:
--
-- UPDATE public.tenant_users tu
-- SET user_id = au.id,
--     updated_at = now()
-- FROM auth.users au
-- WHERE tu.email = au.email
--     AND tu.email IN ('aiagenteautomate@gmail.com', 'ancorecosmeticos@hotmail.com')
--     AND tu.user_id != au.id;
--
-- UPDATE public.users u
-- SET id = au.id,
--     updated_at = now()
-- FROM auth.users au
-- WHERE u.email = au.email
--     AND u.email IN ('aiagenteautomate@gmail.com', 'ancorecosmeticos@hotmail.com')
--     AND u.id != au.id;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================