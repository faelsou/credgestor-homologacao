-- ============================================================================
-- CREDGESTOR - Verificar Tenants Ativos
-- ============================================================================
-- Script SQL para verificar e listar tenants ativos no sistema
-- Sistema: CredGestor - Multi-tenancy
-- ============================================================================

-- ============================================================================
-- 1. CONTAGEM SIMPLES DE TENANTS ATIVOS
-- ============================================================================

SELECT 
    COUNT(*) as total_tenants_ativos
FROM public.tenants
WHERE ativo = true;

-- ============================================================================
-- 2. LISTA COMPLETA DE TENANTS ATIVOS (DETALHADA)
-- ============================================================================

SELECT 
    t.id,
    t.name as nome,
    t.slug,
    t.cnpj,
    t.email,
    t.telefone,
    t.endereco,
    t.cidade,
    t.estado,
    t.cep,
    t.ativo,
    t.created_at as data_criacao,
    t.updated_at as ultima_atualizacao,
    t.configuracoes
FROM public.tenants t
WHERE t.ativo = true
ORDER BY t.name;

-- ============================================================================
-- 3. TENANTS ATIVOS COM ESTATÍSTICAS RELACIONADAS
-- ============================================================================

SELECT 
    t.id,
    t.name as tenant_nome,
    t.slug,
    t.email as tenant_email,
    t.ativo,
    -- Estatísticas de usuários
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN tu.ativo = true THEN tu.user_id END) as usuarios_ativos,
    -- Estatísticas de clientes
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT CASE WHEN c.ativo = true THEN c.id END) as clientes_ativos,
    -- Estatísticas de empréstimos
    COUNT(DISTINCT l.id) as total_emprestimos,
    COUNT(DISTINCT CASE WHEN l.status != 'cancelled' THEN l.id END) as emprestimos_ativos,
    -- Estatísticas de sessões
    COUNT(DISTINCT CASE WHEN us.expires_at > NOW() THEN us.id END) as sessoes_ativas,
    -- Datas
    t.created_at as data_criacao,
    MAX(us.created_at) as ultimo_acesso
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.clients c ON t.id = c.tenant_id
LEFT JOIN public.loans l ON t.id = l.tenant_id
LEFT JOIN public.user_sessions us ON t.id = us.tenant_id
WHERE t.ativo = true
GROUP BY t.id, t.name, t.slug, t.email, t.ativo, t.created_at
ORDER BY t.name;

-- ============================================================================
-- 4. RESUMO COMPARATIVO: ATIVOS vs INATIVOS
-- ============================================================================

SELECT 
    CASE 
        WHEN ativo = true THEN 'Ativos'
        ELSE 'Inativos'
    END as status,
    COUNT(*) as quantidade,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT l.id) as total_emprestimos
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.clients c ON t.id = c.tenant_id
LEFT JOIN public.loans l ON t.id = l.tenant_id
GROUP BY ativo
ORDER BY ativo DESC;

-- ============================================================================
-- 5. TENANTS ATIVOS RECÉM-CRIADOS (ÚLTIMOS 30 DIAS)
-- ============================================================================

SELECT 
    t.id,
    t.name as tenant_nome,
    t.slug,
    t.email,
    t.created_at as data_criacao,
    EXTRACT(DAY FROM NOW() - t.created_at) as dias_desde_criacao,
    COUNT(DISTINCT tu.user_id) as usuarios_cadastrados,
    COUNT(DISTINCT c.id) as clientes_cadastrados
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.clients c ON t.id = c.tenant_id
WHERE t.ativo = true
  AND t.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name, t.slug, t.email, t.created_at
ORDER BY t.created_at DESC;

-- ============================================================================
-- 6. TENANTS ATIVOS COM MAIOR MOVIMENTAÇÃO (TOP 10)
-- ============================================================================

SELECT 
    t.id,
    t.name as tenant_nome,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT l.id) as total_emprestimos,
    COUNT(DISTINCT CASE WHEN us.expires_at > NOW() THEN us.user_id END) as usuarios_online,
    SUM(CASE WHEN l.status != 'cancelled' THEN l.amount ELSE 0 END) as valor_total_emprestado,
    MAX(us.created_at) as ultimo_acesso
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN public.clients c ON t.id = c.tenant_id
LEFT JOIN public.loans l ON t.id = l.tenant_id
LEFT JOIN public.user_sessions us ON t.id = us.tenant_id
WHERE t.ativo = true
GROUP BY t.id, t.name
ORDER BY total_emprestimos DESC, total_clientes DESC
LIMIT 10;

-- ============================================================================
-- 7. VERIFICAÇÃO DE INTEGRIDADE: TENANTS ATIVOS SEM USUÁRIOS
-- ============================================================================

SELECT 
    t.id,
    t.name as tenant_nome,
    t.email,
    t.created_at,
    'Tenant ativo sem usuários cadastrados' as observacao
FROM public.tenants t
WHERE t.ativo = true
  AND NOT EXISTS (
      SELECT 1 
      FROM public.tenant_users tu 
      WHERE tu.tenant_id = t.id
  )
ORDER BY t.created_at DESC;

-- ============================================================================
-- 8. VERIFICAÇÃO DE INTEGRIDADE: TENANTS ATIVOS SEM CLIENTES
-- ============================================================================

SELECT 
    t.id,
    t.name as tenant_nome,
    t.email,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    t.created_at,
    'Tenant ativo sem clientes cadastrados' as observacao
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
WHERE t.ativo = true
  AND NOT EXISTS (
      SELECT 1 
      FROM public.clients c 
      WHERE c.tenant_id = t.id
  )
GROUP BY t.id, t.name, t.email, t.created_at
ORDER BY t.created_at DESC;

-- ============================================================================
-- 9. ESTATÍSTICAS GERAIS (RESUMO EXECUTIVO)
-- ============================================================================

SELECT 
    'Total de Tenants Ativos' as metrica,
    COUNT(*)::text as valor
FROM public.tenants
WHERE ativo = true

UNION ALL

SELECT 
    'Total de Tenants Inativos' as metrica,
    COUNT(*)::text as valor
FROM public.tenants
WHERE ativo = false

UNION ALL

SELECT 
    'Total de Tenants (Todos)' as metrica,
    COUNT(*)::text as valor
FROM public.tenants

UNION ALL

SELECT 
    'Tenants Ativos com Usuários' as metrica,
    COUNT(DISTINCT t.id)::text as valor
FROM public.tenants t
WHERE t.ativo = true
  AND EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.tenant_id = t.id)

UNION ALL

SELECT 
    'Tenants Ativos com Clientes' as metrica,
    COUNT(DISTINCT t.id)::text as valor
FROM public.tenants t
WHERE t.ativo = true
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.tenant_id = t.id)

UNION ALL

SELECT 
    'Tenants Ativos com Empréstimos' as metrica,
    COUNT(DISTINCT t.id)::text as valor
FROM public.tenants t
WHERE t.ativo = true
  AND EXISTS (SELECT 1 FROM public.loans l WHERE l.tenant_id = t.id AND l.status != 'cancelled')

UNION ALL

SELECT 
    'Tenants Ativos com Sessões Ativas' as metrica,
    COUNT(DISTINCT t.id)::text as valor
FROM public.tenants t
WHERE t.ativo = true
  AND EXISTS (
      SELECT 1 
      FROM public.user_sessions us 
      WHERE us.tenant_id = t.id 
        AND us.expires_at > NOW()
  );

-- ============================================================================
-- 10. QUERY RÁPIDA: APENAS CONTAGEM E LISTA BÁSICA
-- ============================================================================

-- Use esta query para uma verificação rápida
SELECT 
    COUNT(*) as total_tenants_ativos,
    STRING_AGG(t.name, ', ' ORDER BY t.name) as nomes_tenants_ativos
FROM public.tenants t
WHERE t.ativo = true;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
