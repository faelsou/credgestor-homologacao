-- ============================================================================
-- CREDGESTOR - Criar Usuário Admin Completo
-- ============================================================================
-- Este script cria um usuário admin completo com acesso total à aplicação
-- Email: cleitonmaxcar@hotmail.com
-- Senha: CleitonM@xCar2026
-- ============================================================================

-- ============================================================================
-- 1. CRIAR/VERIFICAR TENANT PADRÃO
-- ============================================================================

-- Criar tenant padrão se não existir (ou usar um existente)
-- Você pode modificar o ID e nome do tenant conforme necessário
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

-- Função auxiliar para criar usuário no Auth (se tiver permissões)
-- Esta função requer permissões de service_role
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
-- 3. CRIAR USUÁRIO ADMIN COMPLETO
-- ============================================================================

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_email text := 'cleitonmaxcar@hotmail.com';
    v_password text := 'CleitonM@xCar2026';
    v_name text := 'Cleiton Max Car';
    v_role text := 'admin';
BEGIN
    -- Obter tenant_id (do primeiro tenant ativo ou criar um)
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE ativo = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Se não encontrou, cria um tenant padrão
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
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '📋 Usando Tenant ID: %', v_tenant_id;
    
    -- Tentar criar usuário no Auth (pode falhar se não tiver permissões)
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
    -- (será atualizado quando criar o usuário no Dashboard do Supabase)
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        RAISE NOTICE '⚠️ Criando UUID temporário: %. Você precisará criar o usuário no Supabase Auth Dashboard e atualizar o ID.', v_user_id;
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
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ USUÁRIO ADMIN CRIADO COM SUCESSO!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Email: %', v_email;
    RAISE NOTICE 'Senha: %', v_password;
    RAISE NOTICE 'Role: %', v_role;
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- 4. VERIFICAÇÃO DOS DADOS CRIADOS
-- ============================================================================

-- Verificar tenant
SELECT 
    'Tenant do usuário:' as info,
    id,
    name,
    slug,
    ativo
FROM public.tenants
WHERE id IN (
    SELECT tenant_id 
    FROM public.tenant_users 
    WHERE email = 'cleitonmaxcar@hotmail.com'
)
ORDER BY name;

-- Verificar usuário criado
SELECT 
    'Usuário criado:' as info,
    tu.tenant_id,
    t.name as tenant_name,
    tu.email,
    tu.role,
    tu.ativo,
    u.name as user_name,
    u.id as user_id,
    tu.created_at
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.email = 'cleitonmaxcar@hotmail.com'
ORDER BY tu.created_at DESC;

-- Verificar se existe no auth.users (se tiver acesso)
DO $$
DECLARE
    v_auth_user_id uuid;
BEGIN
    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = 'cleitonmaxcar@hotmail.com'
    LIMIT 1;
    
    IF v_auth_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ Usuário encontrado no auth.users com ID: %', v_auth_user_id;
    ELSE
        RAISE NOTICE '⚠️ Usuário NÃO encontrado no auth.users. Você precisa criar manualmente no Supabase Auth Dashboard.';
    END IF;
END $$;

-- ============================================================================
-- 5. INSTRUÇÕES IMPORTANTES
-- ============================================================================

-- ⚠️ IMPORTANTE: Se o usuário não foi criado automaticamente no auth.users,
-- você precisa criá-lo manualmente no Supabase Auth Dashboard:
--
-- 1. Acesse: https://app.supabase.com/project/[SEU-PROJECT]/auth/users
-- 2. Clique em "Add User" > "Create new user"
-- 3. Preencha:
--    - Email: cleitonmaxcar@hotmail.com
--    - Password: CleitonM@xCar2026
--    - Auto Confirm User: ✅ (MARCAR ESTA OPÇÃO - importante!)
--    - User Metadata:
--      {
--        "tenant_id": "[TENANT_ID_DO_SCRIPT]",
--        "name": "Cleiton Max Car",
--        "role": "admin"
--      }
-- 4. Após criar no Auth, execute o script abaixo para atualizar o ID:
--
-- UPDATE public.tenant_users tu
-- SET user_id = au.id,
--     updated_at = now()
-- FROM auth.users au
-- WHERE tu.email = au.email
--     AND tu.email = 'cleitonmaxcar@hotmail.com'
--     AND tu.user_id != au.id;
--
-- UPDATE public.users u
-- SET id = au.id,
--     updated_at = now()
-- FROM auth.users au
-- WHERE u.email = au.email
--     AND u.email = 'cleitonmaxcar@hotmail.com'
--     AND u.id != au.id;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
