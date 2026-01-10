-- ============================================================================
-- CREDGESTOR - Criar Usuários de Teste para Multi-Tenancy
-- ============================================================================
-- Este script cria 3 usuários de teste vinculados a diferentes tenants
-- Execute após criar as tabelas e habilitar RLS
-- ============================================================================

-- ============================================================================
-- 1. CRIAR/VERIFICAR TENANTS
-- ============================================================================

-- Criar tenants de teste se não existirem
INSERT INTO public.tenants (id, name, slug, email, telefone, ativo) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Empresa Alpha', 'empresa-alpha', 'contato@alpha.com', '(11) 98765-4321', true),
    ('00000000-0000-0000-0000-000000000002', 'Empresa Beta', 'empresa-beta', 'contato@beta.com', '(11) 98765-4322', true),
    ('00000000-0000-0000-0000-000000000003', 'Empresa Gamma', 'empresa-gamma', 'contato@gamma.com', '(11) 98765-4323', true)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    ativo = EXCLUDED.ativo,
    updated_at = now();

-- ============================================================================
-- 2. CRIAR USUÁRIOS NO SUPABASE AUTH (via função)
-- ============================================================================

-- Nota: No Supabase, usuários são criados via Auth API ou Dashboard
-- Este script prepara os dados e mostra como criar

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
        RETURN NULL;
END;
$$;

-- ============================================================================
-- 3. CRIAR USUÁRIOS DE TESTE
-- ============================================================================

-- Usuário 1: Admin da Empresa Alpha
-- Email: admin@alpha.com
-- Senha: AdminAlpha123!
-- Tenant: Empresa Alpha

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Tentar criar usuário no Auth (pode falhar se já existir)
    v_user_id := create_auth_user(
        'admin@alpha.com',
        'AdminAlpha123!',
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', 'Administrador Alpha',
            'role', 'admin'
        )
    );
    
    -- Se não conseguiu criar, tenta buscar usuário existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM auth.users 
        WHERE email = 'admin@alpha.com' 
        LIMIT 1;
    END IF;
    
    -- Se ainda não tem usuário, cria um UUID temporário
    -- (será atualizado quando criar o usuário no Dashboard)
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
    END IF;
    
    -- Criar registro na tabela users (global)
    INSERT INTO public.users (id, email, name, role, metadata)
    VALUES (
        v_user_id,
        'admin@alpha.com',
        'Administrador Alpha',
        'admin',
        jsonb_build_object('tenant_id', v_tenant_id::text)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    -- Vincular usuário ao tenant
    INSERT INTO public.tenant_users (tenant_id, user_id, email, role, ativo)
    VALUES (
        v_tenant_id,
        v_user_id,
        'admin@alpha.com',
        'admin',
        true
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        ativo = EXCLUDED.ativo,
        updated_at = now();
    
    RAISE NOTICE '✅ Usuário 1 criado: admin@alpha.com (ID: %)', v_user_id;
END $$;

-- Usuário 2: Usuário da Empresa Beta
-- Email: user@beta.com
-- Senha: UserBeta123!
-- Tenant: Empresa Beta

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- Tentar criar usuário no Auth
    v_user_id := create_auth_user(
        'user@beta.com',
        'UserBeta123!',
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', 'Usuário Beta',
            'role', 'user'
        )
    );
    
    -- Se não conseguiu criar, tenta buscar usuário existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM auth.users 
        WHERE email = 'user@beta.com' 
        LIMIT 1;
    END IF;
    
    -- Se ainda não tem usuário, cria um UUID temporário
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
    END IF;
    
    -- Criar registro na tabela users (global)
    INSERT INTO public.users (id, email, name, role, metadata)
    VALUES (
        v_user_id,
        'user@beta.com',
        'Usuário Beta',
        'user',
        jsonb_build_object('tenant_id', v_tenant_id::text)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    -- Vincular usuário ao tenant
    INSERT INTO public.tenant_users (tenant_id, user_id, email, role, ativo)
    VALUES (
        v_tenant_id,
        v_user_id,
        'user@beta.com',
        'user',
        true
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        ativo = EXCLUDED.ativo,
        updated_at = now();
    
    RAISE NOTICE '✅ Usuário 2 criado: user@beta.com (ID: %)', v_user_id;
END $$;

-- Usuário 3: Gestor da Empresa Gamma
-- Email: gestor@gamma.com
-- Senha: GestorGamma123!
-- Tenant: Empresa Gamma

DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- Tentar criar usuário no Auth
    v_user_id := create_auth_user(
        'gestor@gamma.com',
        'GestorGamma123!',
        jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'name', 'Gestor Gamma',
            'role', 'gestor'
        )
    );
    
    -- Se não conseguiu criar, tenta buscar usuário existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM auth.users 
        WHERE email = 'gestor@gamma.com' 
        LIMIT 1;
    END IF;
    
    -- Se ainda não tem usuário, cria um UUID temporário
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
    END IF;
    
    -- Criar registro na tabela users (global)
    INSERT INTO public.users (id, email, name, role, metadata)
    VALUES (
        v_user_id,
        'gestor@gamma.com',
        'Gestor Gamma',
        'gestor',
        jsonb_build_object('tenant_id', v_tenant_id::text)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    
    -- Vincular usuário ao tenant
    INSERT INTO public.tenant_users (tenant_id, user_id, email, role, ativo)
    VALUES (
        v_tenant_id,
        v_user_id,
        'gestor@gamma.com',
        'gestor',
        true
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        ativo = EXCLUDED.ativo,
        updated_at = now();
    
    RAISE NOTICE '✅ Usuário 3 criado: gestor@gamma.com (ID: %)', v_user_id;
END $$;

-- ============================================================================
-- 4. VERIFICAÇÃO
-- ============================================================================

-- Verificar tenants criados
SELECT 
    'Tenants criados:' as info,
    id,
    name,
    slug,
    ativo
FROM public.tenants
WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
)
ORDER BY name;

-- Verificar usuários criados
SELECT 
    'Usuários criados:' as info,
    tu.tenant_id,
    t.name as tenant_name,
    tu.email,
    tu.role,
    tu.ativo,
    u.name as user_name
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.email IN (
    'admin@alpha.com',
    'user@beta.com',
    'gestor@gamma.com'
)
ORDER BY t.name, tu.email;

-- ============================================================================
-- 5. INSTRUÇÕES PARA CRIAR USUÁRIOS NO SUPABASE AUTH
-- ============================================================================

-- IMPORTANTE: Após executar este script, você precisa criar os usuários
-- no Supabase Auth Dashboard para que possam fazer login:
--
-- 1. Acesse: https://app.supabase.com/project/[SEU-PROJECT]/auth/users
-- 2. Clique em "Add User" > "Create new user"
-- 3. Para cada usuário:
--
--    Usuário 1:
--    - Email: admin@alpha.com
--    - Password: AdminAlpha123!
--    - Auto Confirm User: ✅ (marcar)
--    - User Metadata: 
--      {
--        "tenant_id": "00000000-0000-0000-0000-000000000001",
--        "name": "Administrador Alpha",
--        "role": "admin"
--      }
--
--    Usuário 2:
--    - Email: user@beta.com
--    - Password: UserBeta123!
--    - Auto Confirm User: ✅ (marcar)
--    - User Metadata:
--      {
--        "tenant_id": "00000000-0000-0000-0000-000000000002",
--        "name": "Usuário Beta",
--        "role": "user"
--      }
--
--    Usuário 3:
--    - Email: gestor@gamma.com
--    - Password: GestorGamma123!
--    - Auto Confirm User: ✅ (marcar)
--    - User Metadata:
--      {
--        "tenant_id": "00000000-0000-0000-0000-000000000003",
--        "name": "Gestor Gamma",
--        "role": "gestor"
--      }
--
-- 4. Após criar no Auth, atualize os IDs na tabela tenant_users:
--    UPDATE public.tenant_users tu
--    SET user_id = au.id
--    FROM auth.users au
--    WHERE tu.email = au.email;

-- ============================================================================
-- 6. SCRIPT PARA ATUALIZAR IDs APÓS CRIAR NO AUTH
-- ============================================================================

-- Execute este script APÓS criar os usuários no Supabase Auth Dashboard:

UPDATE public.tenant_users tu
SET user_id = au.id,
    updated_at = now()
FROM auth.users au
WHERE tu.email = au.email
    AND tu.email IN ('admin@alpha.com', 'user@beta.com', 'gestor@gamma.com')
    AND tu.user_id != au.id;

UPDATE public.users u
SET id = au.id,
    updated_at = now()
FROM auth.users au
WHERE u.email = au.email
    AND u.email IN ('admin@alpha.com', 'user@beta.com', 'gestor@gamma.com')
    AND u.id != au.id;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
