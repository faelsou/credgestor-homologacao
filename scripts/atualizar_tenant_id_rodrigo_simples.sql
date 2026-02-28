-- ============================================================================
-- CREDGESTOR - Atualizar Tenant ID do Usuário Rodrigo (Versão Simplificada)
-- ============================================================================
-- Este script atualiza o tenant_id do usuário Rodrigo em TODAS as tabelas
-- Email do usuário: rodrigoconecteloja@gmail.com
-- 
-- De: 7b45092c-5f80-4746-b4f2-41fff758fa44
-- Para: 00000000-0000-0000-0000-000000000004
-- ============================================================================

-- ============================================================================
-- ATUALIZAR TENANT_ID EM TODAS AS TABELAS
-- ============================================================================

-- 1. tenant_users
UPDATE public.tenant_users
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com' AND tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 2. clients
UPDATE public.clients
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 3. experiences
UPDATE public.experiences
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 4. historic_scores
UPDATE public.historic_scores
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 5. login_audit
UPDATE public.login_audit
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 6. tenant_roles
UPDATE public.tenant_roles
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 7. role_permissions
UPDATE public.role_permissions
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 8. custom_domains
UPDATE public.custom_domains
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 9. user_sessions
UPDATE public.user_sessions
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 10. produtos
UPDATE public.produtos
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 11. propostas
UPDATE public.propostas
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 12. parcelas
UPDATE public.parcelas
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 13. pagamentos
UPDATE public.pagamentos
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 14. documentos
UPDATE public.documentos
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 15. auditoria
UPDATE public.auditoria
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 16. comissoes
UPDATE public.comissoes
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 17. loans
UPDATE public.loans
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- 18. installments
UPDATE public.installments
SET tenant_id = '00000000-0000-0000-0000-000000000004'::uuid, updated_at = now()
WHERE tenant_id = '7b45092c-5f80-4746-b4f2-41fff758fa44'::uuid;

-- ============================================================================
-- ATUALIZAR TENANT_ID NO METADATA
-- ============================================================================

-- 19. users.metadata
UPDATE public.users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- 20. tenant_users.metadata
UPDATE public.tenant_users
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- 21. auth.users.metadata
UPDATE auth.users
SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', '00000000-0000-0000-0000-000000000004'),
    updated_at = now()
WHERE email = 'rodrigoconecteloja@gmail.com';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar tenant_id atual do usuário Rodrigo
SELECT 
    'TENANT_ID ATUAL DO USUÁRIO RODRIGO' as info,
    tu.email,
    tu.tenant_id as tenant_id_tenant_users,
    pu.metadata->>'tenant_id' as tenant_id_users_metadata,
    au.raw_user_meta_data->>'tenant_id' as tenant_id_auth_user_metadata
FROM public.tenant_users tu
LEFT JOIN public.users pu ON pu.email = tu.email
LEFT JOIN auth.users au ON au.email = tu.email
WHERE tu.email = 'rodrigoconecteloja@gmail.com';
