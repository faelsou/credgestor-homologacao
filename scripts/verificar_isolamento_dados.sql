-- ============================================================================
-- CREDGESTOR - Verificar Isolamento de Dados por Tenant
-- ============================================================================
-- Este script verifica se os dados estão realmente isolados por tenant_id
-- REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR TENANTS E SEUS USUÁRIOS
-- ============================================================================

SELECT 
    'TENANTS E USUÁRIOS' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    t.email as tenant_email,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    STRING_AGG(DISTINCT tu.email, ', ' ORDER BY tu.email) as usuarios_emails
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
GROUP BY t.id, t.name, t.email
ORDER BY t.created_at DESC;

-- ============================================================================
-- 2. VERIFICAR CLIENTES POR TENANT
-- ============================================================================

SELECT 
    'CLIENTES POR TENANT' as info,
    c.tenant_id,
    t.name as tenant_name,
    COUNT(*) as total_clientes,
    STRING_AGG(c.nome || ' (' || c.cpf_cnpj || ')', ', ' ORDER BY c.nome) as clientes
FROM public.clients c
LEFT JOIN public.tenants t ON t.id = c.tenant_id
GROUP BY c.tenant_id, t.name
ORDER BY total_clientes DESC;

-- ============================================================================
-- 3. VERIFICAR SE HÁ CLIENTES SEM TENANT_ID
-- ============================================================================

SELECT 
    'CLIENTES SEM TENANT_ID' as info,
    COUNT(*) as total,
    STRING_AGG(nome || ' (' || cpf_cnpj || ')', ', ') as clientes
FROM public.clients
WHERE tenant_id IS NULL;

-- ============================================================================
-- 4. VERIFICAR EMPRÉSTIMOS POR TENANT
-- ============================================================================

SELECT 
    'EMPRÉSTIMOS POR TENANT' as info,
    l.tenant_id,
    t.name as tenant_name,
    COUNT(*) as total_emprestimos
FROM public.loans l
LEFT JOIN public.tenants t ON t.id = l.tenant_id
GROUP BY l.tenant_id, t.name
ORDER BY total_emprestimos DESC;

-- ============================================================================
-- 5. VERIFICAR PARCELAS POR TENANT
-- ============================================================================

SELECT 
    'PARCELAS POR TENANT' as info,
    i.tenant_id,
    t.name as tenant_name,
    COUNT(*) as total_parcelas
FROM public.installments i
LEFT JOIN public.tenants t ON t.id = i.tenant_id
GROUP BY i.tenant_id, t.name
ORDER BY total_parcelas DESC;

-- ============================================================================
-- 6. VERIFICAR SE HÁ DADOS COM TENANT_ID DIFERENTE DO USUÁRIO
-- ============================================================================

-- Clientes que não pertencem ao tenant do usuário
SELECT 
    'VERIFICAÇÃO DE ISOLAMENTO - CLIENTES' as info,
    c.id as cliente_id,
    c.nome as cliente_nome,
    c.tenant_id as cliente_tenant_id,
    t.name as tenant_nome,
    tu.email as usuario_email,
    tu.tenant_id as usuario_tenant_id,
    CASE 
        WHEN c.tenant_id = tu.tenant_id THEN '✅ Correto'
        ELSE '❌ ERRO: Cliente não pertence ao tenant do usuário'
    END as status
FROM public.clients c
INNER JOIN public.tenant_users tu ON tu.ativo = true
LEFT JOIN public.tenants t ON t.id = c.tenant_id
WHERE c.tenant_id != tu.tenant_id
ORDER BY c.tenant_id, tu.tenant_id;

-- ============================================================================
-- 7. RESUMO: DADOS POR TENANT
-- ============================================================================

SELECT 
    'RESUMO GERAL DE DADOS POR TENANT' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM public.clients WHERE tenant_id = t.id) as total_clientes,
    (SELECT COUNT(*) FROM public.loans WHERE tenant_id = t.id) as total_emprestimos,
    (SELECT COUNT(*) FROM public.installments WHERE tenant_id = t.id) as total_parcelas,
    (SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = t.id AND ativo = true) as total_usuarios
FROM public.tenants t
WHERE t.ativo = true
ORDER BY t.created_at DESC;

-- ============================================================================
-- 8. VERIFICAR SE HÁ DADOS ÓRFÃOS (sem tenant válido)
-- ============================================================================

SELECT 
    'DADOS ÓRFÃOS (sem tenant válido)' as info,
    'clients' as tabela,
    COUNT(*) as total
FROM public.clients c
WHERE c.tenant_id NOT IN (SELECT id FROM public.tenants)
UNION ALL
SELECT 
    'DADOS ÓRFÃOS (sem tenant válido)' as info,
    'loans' as tabela,
    COUNT(*) as total
FROM public.loans l
WHERE l.tenant_id NOT IN (SELECT id FROM public.tenants)
UNION ALL
SELECT 
    'DADOS ÓRFÃOS (sem tenant válido)' as info,
    'installments' as tabela,
    COUNT(*) as total
FROM public.installments i
WHERE i.tenant_id NOT IN (SELECT id FROM public.tenants);
