-- ============================================================================
-- CREDGESTOR - Atualizar Nomes de Usuários (Versão Simplificada)
-- ============================================================================
-- Este script atualiza os nomes dos usuários nas tabelas:
--   - public.users (campo name)
--   - auth.users (campo raw_user_meta_data->>'name')
-- ============================================================================

-- ============================================================================
-- ATUALIZAÇÕES
-- ============================================================================

-- 1. Ancore Cosmeticos -> Cleiton Araújo Dias
--    Email: ancorecosmeticos@hotmail.com

-- 2. Cleiton Max Car -> Cleiton Araújo Dias
--    Email: cleitonmaxcar@hotmail.com

-- 3. Rodrigo Conecte Loja -> Rodrigo Assunção
--    Email: rodrigoconecteloja@gmail.com

-- ============================================================================
-- ATUALIZAR NOMES EM PUBLIC.USERS
-- ============================================================================

UPDATE public.users
SET name = 'Cleiton Araújo Dias', updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

UPDATE public.users
SET name = 'Cleiton Araújo Dias', updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

UPDATE public.users
SET name = 'Rodrigo Assunção', updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- ============================================================================
-- ATUALIZAR NOMES EM AUTH.USERS (Supabase Auth)
-- ============================================================================

UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Cleiton Araújo Dias'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Cleiton Araújo Dias'),
    updated_at = now()
WHERE email = 'cleitonmaxcar@hotmail.com';

UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Rodrigo Assunção'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 
    au.email,
    pu.name as nome_public_users,
    au.raw_user_meta_data->>'name' as nome_auth_users,
    CASE 
        WHEN pu.name = au.raw_user_meta_data->>'name' THEN '✅ Sincronizado'
        ELSE '⚠️ Não sincronizado'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE au.email IN (
    'ancorecosmeticos@hotmail.com',
    'cleitonmaxcar@hotmail.com',
    'rodrigoconecteloja@gmail.com'
)
ORDER BY au.email;
