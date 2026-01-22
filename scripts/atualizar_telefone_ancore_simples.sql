-- ============================================================================
-- CREDGESTOR - Atualizar Telefone: Ancore Cosmeticos (Versão Simplificada)
-- ============================================================================
-- Email: ancorecosmeticos@hotmail.com
-- Telefone: 1194789-7969
-- ============================================================================

-- Atualizar telefone em public.users
UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Atualizar telefone em public.tenant_users
UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Atualizar telefone em auth.users (Supabase Auth)
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('telefone', '1194789-7969'),
    updated_at = now()
WHERE email = 'ancorecosmeticos@hotmail.com';

-- Verificar atualização
SELECT 
    'Ancore Cosmeticos' as usuario,
    pu.metadata->>'telefone' as telefone_public_users,
    tu.metadata->>'telefone' as telefone_tenant_users,
    au.raw_user_meta_data->>'telefone' as telefone_auth_users
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
LEFT JOIN public.tenant_users tu ON tu.email = au.email
WHERE au.email = 'ancorecosmeticos@hotmail.com';
