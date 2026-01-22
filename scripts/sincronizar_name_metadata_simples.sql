-- ============================================================================
-- CREDGESTOR - Sincronizar Name no Metadata (Versão Simplificada)
-- ============================================================================
-- Este script atualiza o campo "name" dentro do metadata (JSONB) 
-- para ser igual ao campo "name" da tabela public.users
-- ============================================================================

-- Atualizar name no metadata de public.users
UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('name', name),
    updated_at = now()
WHERE name IS NOT NULL
  AND (metadata->>'name' IS NULL OR metadata->>'name' != name);

-- Atualizar name no metadata de public.tenant_users
UPDATE public.tenant_users tu
SET 
    metadata = COALESCE(tu.metadata, '{}'::jsonb) || jsonb_build_object('name', u.name),
    updated_at = now()
FROM public.users u
WHERE tu.email = u.email
  AND u.name IS NOT NULL
  AND (tu.metadata->>'name' IS NULL OR tu.metadata->>'name' != u.name);

-- Atualizar name no metadata de auth.users
UPDATE auth.users au
SET 
    raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', u.name),
    updated_at = now()
FROM public.users u
WHERE au.email = u.email
  AND u.name IS NOT NULL
  AND (au.raw_user_meta_data->>'name' IS NULL OR au.raw_user_meta_data->>'name' != u.name);

-- Verificar sincronização
SELECT 
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
