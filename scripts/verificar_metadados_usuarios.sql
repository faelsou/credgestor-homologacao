-- ============================================================================
-- CREDGESTOR - Verificar Metadados dos Usuários
-- ============================================================================
-- IMPORTANTE: user_metadata e app_metadata NÃO são colunas SQL!
-- Eles são acessados via API do Supabase Auth, não via SQL direto.
-- 
-- Para verificar os metadados, use o script Python:
--   python3 scripts/verificar_metadados_usuarios.py
-- ============================================================================

-- ============================================================================
-- NOTA: Esta query NÃO funcionará porque user_metadata não é uma coluna SQL
-- ============================================================================
-- SELECT email, user_metadata->>'tenant_id', app_metadata->>'tenant_id'
-- FROM auth.users;
-- ============================================================================

-- ============================================================================
-- ALTERNATIVA: Verificar usuários via tenant_users
-- ============================================================================
-- Esta query mostra os usuários e seus tenants através da tabela tenant_users
-- ============================================================================

SELECT 
    'USUÁRIOS E SEUS TENANTS' as info,
    tu.email as usuario_email,
    tu.tenant_id,
    t.name as tenant_name,
    t.email as tenant_email,
    tu.role as usuario_role,
    tu.ativo as usuario_ativo,
    CASE 
        WHEN tu.ativo = true THEN '✅ Ativo'
        ELSE '❌ Inativo'
    END as status
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
ORDER BY tu.email, tu.tenant_id;

-- ============================================================================
-- VERIFICAR SE HÁ USUÁRIOS SEM VÍNCULO EM tenant_users
-- ============================================================================

-- Nota: Esta query requer acesso à tabela auth.users
-- Se não funcionar, use o script Python para verificar os metadados

-- ============================================================================
-- RESUMO: TENANTS E SEUS USUÁRIOS
-- ============================================================================

SELECT 
    'RESUMO POR TENANT' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    t.email as tenant_email,
    COUNT(DISTINCT tu.user_id) as total_usuarios_ativos,
    STRING_AGG(DISTINCT tu.email, ', ' ORDER BY tu.email) as usuarios_emails
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
GROUP BY t.id, t.name, t.email
ORDER BY t.created_at DESC;
