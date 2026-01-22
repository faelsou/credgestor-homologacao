-- ============================================================================
-- CREDGESTOR - QUERIES SQL AVANÇADAS
-- ============================================================================
-- Script com queries de uso avançado para análise e busca na base de dados
-- Sistema: CredGestor - Multi-tenancy
-- ============================================================================

-- ============================================================================
-- 1. QUANTIDADE DE CLIENTES CADASTRADOS POR USUÁRIO
-- ============================================================================

-- Opção 1: Usando tabela de auditoria (se houver registro de criação)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(DISTINCT a.registro_id) as total_clientes_cadastrados
FROM public.auditoria a
JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
WHERE a.tabela = 'clients'
  AND a.acao = 'INSERT'
  AND tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
ORDER BY total_clientes_cadastrados DESC;

-- Opção 2: Clientes por tenant (agrupado por usuários do tenant)
-- Nota: Se não houver rastreamento direto, agrupa por tenant
SELECT 
    t.name as tenant_nome,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    ROUND(COUNT(DISTINCT c.id)::numeric / NULLIF(COUNT(DISTINCT tu.user_id), 0), 2) as media_clientes_por_usuario
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
LEFT JOIN public.clients c ON t.id = c.tenant_id AND c.ativo = true
WHERE t.ativo = true
GROUP BY t.id, t.name
ORDER BY total_clientes DESC;

-- Opção 3: Clientes cadastrados por usuário (usando auditoria com detalhes)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(DISTINCT a.registro_id) as total_clientes_cadastrados,
    MIN(a.data_hora) as primeiro_cadastro,
    MAX(a.data_hora) as ultimo_cadastro
FROM public.auditoria a
JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
WHERE a.tabela = 'clients'
  AND a.acao = 'INSERT'
  AND tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
ORDER BY total_clientes_cadastrados DESC;

-- ============================================================================
-- 2. QUANTIDADE DE EMPRÉSTIMOS PRICE E SOMENTE JUROS POR USUÁRIO
-- ============================================================================

-- Empréstimos PRICE e INTEREST_ONLY por usuário (via propostas)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as total_propostas,
    COUNT(CASE WHEN l.model = 'PRICE' THEN 1 END) as emprestimos_price,
    COUNT(CASE WHEN l.model = 'INTEREST_ONLY' THEN 1 END) as emprestimos_somente_juros,
    SUM(CASE WHEN l.model = 'PRICE' THEN l.amount ELSE 0 END) as valor_total_price,
    SUM(CASE WHEN l.model = 'INTEREST_ONLY' THEN l.amount ELSE 0 END) as valor_total_somente_juros
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.propostas p ON tu.user_id = p.usuario_id
LEFT JOIN public.loans l ON p.cliente_id = l.client_id AND p.tenant_id = l.tenant_id
WHERE tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
ORDER BY total_propostas DESC;

-- Empréstimos PRICE e INTEREST_ONLY por usuário (diretamente da tabela loans via auditoria)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(CASE WHEN l.model = 'PRICE' THEN 1 END) as emprestimos_price,
    COUNT(CASE WHEN l.model = 'INTEREST_ONLY' THEN 1 END) as emprestimos_somente_juros,
    COUNT(CASE WHEN l.model = 'PRICE' THEN 1 END) + 
    COUNT(CASE WHEN l.model = 'INTEREST_ONLY' THEN 1 END) as total_emprestimos,
    SUM(CASE WHEN l.model = 'PRICE' THEN l.amount ELSE 0 END) as valor_total_price,
    SUM(CASE WHEN l.model = 'INTEREST_ONLY' THEN l.amount ELSE 0 END) as valor_total_somente_juros,
    ROUND(AVG(CASE WHEN l.model = 'PRICE' THEN l.amount END), 2) as ticket_medio_price,
    ROUND(AVG(CASE WHEN l.model = 'INTEREST_ONLY' THEN l.amount END), 2) as ticket_medio_somente_juros
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.auditoria a ON tu.user_id = a.usuario_id 
    AND a.tabela = 'loans' 
    AND a.acao = 'INSERT'
LEFT JOIN public.loans l ON a.registro_id = l.id
WHERE tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
HAVING COUNT(l.id) > 0
ORDER BY total_emprestimos DESC;

-- Resumo de empréstimos por modelo (todos os usuários)
SELECT 
    l.model as modelo_emprestimo,
    COUNT(*) as quantidade,
    COUNT(DISTINCT l.client_id) as clientes_unicos,
    COUNT(DISTINCT l.tenant_id) as tenants_unicos,
    SUM(l.amount) as valor_total,
    ROUND(AVG(l.amount), 2) as ticket_medio,
    SUM(l.total_amount) as valor_total_com_juros,
    MIN(l.start_date) as primeiro_emprestimo,
    MAX(l.start_date) as ultimo_emprestimo
FROM public.loans l
WHERE l.status != 'cancelled'
GROUP BY l.model
ORDER BY quantidade DESC;

-- ============================================================================
-- 3. QUANTIDADE DE DISPOSITIVOS ATIVOS NO BANCO DE DADOS
-- ============================================================================

-- Dispositivos ativos (sessões não expiradas)
SELECT 
    COUNT(DISTINCT us.id) as total_dispositivos_ativos,
    COUNT(DISTINCT us.user_id) as usuarios_com_sessao_ativa,
    COUNT(DISTINCT us.tenant_id) as tenants_com_sessoes_ativas
FROM public.user_sessions us
WHERE us.expires_at > NOW()
  AND us.created_at > NOW() - INTERVAL '30 days';

-- Dispositivos ativos por usuário
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(DISTINCT us.id) as dispositivos_ativos,
    MAX(us.expires_at) as ultima_sessao_expira_em,
    MAX(us.created_at) as ultimo_acesso
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.user_sessions us ON tu.user_id = us.user_id 
    AND us.expires_at > NOW()
WHERE tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
HAVING COUNT(DISTINCT us.id) > 0
ORDER BY dispositivos_ativos DESC, ultimo_acesso DESC;

-- Dispositivos ativos por tenant
SELECT 
    t.name as tenant_nome,
    COUNT(DISTINCT us.user_id) as usuarios_com_sessao_ativa,
    COUNT(DISTINCT us.id) as total_dispositivos_ativos,
    COUNT(DISTINCT us.ip_address) as ips_unicos
FROM public.tenants t
LEFT JOIN public.user_sessions us ON t.id = us.tenant_id 
    AND us.expires_at > NOW()
WHERE t.ativo = true
GROUP BY t.id, t.name
ORDER BY total_dispositivos_ativos DESC;

-- Histórico de dispositivos (últimos 30 dias)
SELECT 
    DATE(us.created_at) as data,
    COUNT(DISTINCT us.id) as dispositivos_unicos,
    COUNT(DISTINCT us.user_id) as usuarios_unicos,
    COUNT(DISTINCT us.ip_address) as ips_unicos
FROM public.user_sessions us
WHERE us.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(us.created_at)
ORDER BY data DESC;

-- ============================================================================
-- 4. QUERIES AVANÇADAS DE ANÁLISE
-- ============================================================================

-- 4.1. Performance de Usuários (Dashboard Executivo)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(DISTINCT c.id) as clientes_cadastrados,
    COUNT(DISTINCT l.id) as emprestimos_criados,
    COUNT(DISTINCT CASE WHEN l.model = 'PRICE' THEN l.id END) as emprestimos_price,
    COUNT(DISTINCT CASE WHEN l.model = 'INTEREST_ONLY' THEN l.id END) as emprestimos_somente_juros,
    SUM(CASE WHEN l.status = 'open' THEN l.outstanding_amount ELSE 0 END) as valor_em_aberto,
    COUNT(DISTINCT CASE WHEN inst.status IN ('PENDING', 'LATE') THEN inst.id END) as parcelas_pendentes,
    MAX(l.created_at) as ultimo_emprestimo_criado
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.auditoria a_c ON tu.user_id = a_c.usuario_id 
    AND a_c.tabela = 'clients' 
    AND a_c.acao = 'INSERT'
LEFT JOIN public.clients c ON a_c.registro_id = c.id
LEFT JOIN public.auditoria a_l ON tu.user_id = a_l.usuario_id 
    AND a_l.tabela = 'loans' 
    AND a_l.acao = 'INSERT'
LEFT JOIN public.loans l ON a_l.registro_id = l.id
LEFT JOIN public.installments inst ON l.id = inst.loan_id
WHERE tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
ORDER BY emprestimos_criados DESC, clientes_cadastrados DESC;

-- 4.2. Análise de Inadimplência por Usuário
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(DISTINCT l.id) as total_emprestimos,
    COUNT(DISTINCT CASE WHEN inst.status = 'LATE' THEN inst.loan_id END) as emprestimos_com_atraso,
    COUNT(CASE WHEN inst.status = 'LATE' THEN 1 END) as parcelas_atrasadas,
    SUM(CASE WHEN inst.status = 'LATE' THEN (inst.amount - inst.amount_paid) ELSE 0 END) as valor_em_atraso,
    ROUND(
        COUNT(CASE WHEN inst.status = 'LATE' THEN 1 END)::numeric / 
        NULLIF(COUNT(inst.id), 0) * 100, 
        2
    ) as taxa_inadimplencia_percentual
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.auditoria a ON tu.user_id = a.usuario_id 
    AND a.tabela = 'loans' 
    AND a.acao = 'INSERT'
LEFT JOIN public.loans l ON a.registro_id = l.id
LEFT JOIN public.installments inst ON l.id = inst.loan_id
WHERE tu.ativo = true
GROUP BY tu.email, u.name, t.name, tu.tenant_id
HAVING COUNT(DISTINCT l.id) > 0
ORDER BY valor_em_atraso DESC;

-- 4.3. Análise Temporal de Empréstimos por Usuário
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    DATE_TRUNC('month', l.created_at) as mes,
    COUNT(*) as emprestimos_criados,
    COUNT(CASE WHEN l.model = 'PRICE' THEN 1 END) as emprestimos_price,
    COUNT(CASE WHEN l.model = 'INTEREST_ONLY' THEN 1 END) as emprestimos_somente_juros,
    SUM(l.amount) as valor_total,
    ROUND(AVG(l.amount), 2) as ticket_medio
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
LEFT JOIN public.auditoria a ON tu.user_id = a.usuario_id 
    AND a.tabela = 'loans' 
    AND a.acao = 'INSERT'
LEFT JOIN public.loans l ON a.registro_id = l.id
WHERE tu.ativo = true
  AND l.created_at >= NOW() - INTERVAL '12 months'
GROUP BY tu.email, u.name, DATE_TRUNC('month', l.created_at)
ORDER BY tu.email, mes DESC;

-- 4.4. Top 10 Clientes por Valor de Empréstimo (por usuário)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    c.nome as cliente_nome,
    c.cpf_cnpj,
    COUNT(l.id) as total_emprestimos,
    SUM(l.amount) as valor_total_emprestado,
    SUM(CASE WHEN l.model = 'PRICE' THEN l.amount ELSE 0 END) as valor_price,
    SUM(CASE WHEN l.model = 'INTEREST_ONLY' THEN l.amount ELSE 0 END) as valor_somente_juros,
    MAX(l.created_at) as ultimo_emprestimo
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
LEFT JOIN public.auditoria a ON tu.user_id = a.usuario_id 
    AND a.tabela = 'loans' 
    AND a.acao = 'INSERT'
LEFT JOIN public.loans l ON a.registro_id = l.id
LEFT JOIN public.clients c ON l.client_id = c.id
WHERE tu.ativo = true
GROUP BY tu.email, u.name, c.id, c.nome, c.cpf_cnpj
HAVING COUNT(l.id) > 0
ORDER BY tu.email, valor_total_emprestado DESC
LIMIT 10;

-- 4.5. Análise de Parcelas por Modelo de Empréstimo
SELECT 
    l.model as modelo_emprestimo,
    COUNT(inst.id) as total_parcelas,
    COUNT(CASE WHEN inst.status = 'PAID' THEN 1 END) as parcelas_pagas,
    COUNT(CASE WHEN inst.status = 'PENDING' THEN 1 END) as parcelas_pendentes,
    COUNT(CASE WHEN inst.status = 'LATE' THEN 1 END) as parcelas_atrasadas,
    SUM(inst.amount) as valor_total_parcelas,
    SUM(inst.amount_paid) as valor_total_pago,
    SUM(inst.amount - inst.amount_paid) as valor_total_aberto,
    ROUND(
        COUNT(CASE WHEN inst.status = 'PAID' THEN 1 END)::numeric / 
        NULLIF(COUNT(inst.id), 0) * 100, 
        2
    ) as taxa_pagamento_percentual
FROM public.loans l
LEFT JOIN public.installments inst ON l.id = inst.loan_id
WHERE l.status != 'cancelled'
GROUP BY l.model
ORDER BY total_parcelas DESC;

-- 4.6. Estatísticas Gerais do Sistema
SELECT 
    'Total de Tenants Ativos' as metrica,
    COUNT(*)::text as valor
FROM public.tenants
WHERE ativo = true

UNION ALL

SELECT 
    'Total de Usuários Ativos' as metrica,
    COUNT(*)::text as valor
FROM public.tenant_users
WHERE ativo = true

UNION ALL

SELECT 
    'Total de Clientes Ativos' as metrica,
    COUNT(*)::text as valor
FROM public.clients
WHERE ativo = true

UNION ALL

SELECT 
    'Total de Empréstimos (PRICE)' as metrica,
    COUNT(*)::text as valor
FROM public.loans
WHERE model = 'PRICE' AND status != 'cancelled'

UNION ALL

SELECT 
    'Total de Empréstimos (Somente Juros)' as metrica,
    COUNT(*)::text as valor
FROM public.loans
WHERE model = 'INTEREST_ONLY' AND status != 'cancelled'

UNION ALL

SELECT 
    'Valor Total Emprestado (PRICE)' as metrica,
    'R$ ' || TO_CHAR(SUM(amount), '999,999,999.99') as valor
FROM public.loans
WHERE model = 'PRICE' AND status != 'cancelled'

UNION ALL

SELECT 
    'Valor Total Emprestado (Somente Juros)' as metrica,
    'R$ ' || TO_CHAR(SUM(amount), '999,999,999.99') as valor
FROM public.loans
WHERE model = 'INTEREST_ONLY' AND status != 'cancelled'

UNION ALL

SELECT 
    'Parcelas Pendentes' as metrica,
    COUNT(*)::text as valor
FROM public.installments
WHERE status IN ('PENDING', 'LATE')

UNION ALL

SELECT 
    'Valor em Atraso' as metrica,
    'R$ ' || TO_CHAR(SUM(amount - amount_paid), '999,999,999.99') as valor
FROM public.installments
WHERE status = 'LATE'

UNION ALL

SELECT 
    'Dispositivos Ativos' as metrica,
    COUNT(*)::text as valor
FROM public.user_sessions
WHERE expires_at > NOW();

-- 4.7. Análise de Crescimento Mensal
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    COUNT(*) as novos_clientes,
    SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as total_acumulado
FROM public.clients
WHERE ativo = true
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC
LIMIT 12;

-- 4.8. Empréstimos por Faixa de Valor
SELECT 
    CASE 
        WHEN l.amount < 1000 THEN 'Até R$ 1.000'
        WHEN l.amount < 5000 THEN 'R$ 1.000 - R$ 5.000'
        WHEN l.amount < 10000 THEN 'R$ 5.000 - R$ 10.000'
        WHEN l.amount < 50000 THEN 'R$ 10.000 - R$ 50.000'
        ELSE 'Acima de R$ 50.000'
    END as faixa_valor,
    l.model as modelo,
    COUNT(*) as quantidade,
    SUM(l.amount) as valor_total,
    ROUND(AVG(l.amount), 2) as ticket_medio
FROM public.loans l
WHERE l.status != 'cancelled'
GROUP BY faixa_valor, l.model
ORDER BY 
    CASE 
        WHEN l.amount < 1000 THEN 1
        WHEN l.amount < 5000 THEN 2
        WHEN l.amount < 10000 THEN 3
        WHEN l.amount < 50000 THEN 4
        ELSE 5
    END,
    l.model;

-- 4.9. Usuários Mais Ativos (por ações registradas)
SELECT 
    tu.email as usuario_email,
    u.name as usuario_nome,
    t.name as tenant_nome,
    COUNT(a.id) as total_acoes,
    COUNT(DISTINCT a.tabela) as tabelas_modificadas,
    COUNT(CASE WHEN a.acao = 'INSERT' THEN 1 END) as insercoes,
    COUNT(CASE WHEN a.acao = 'UPDATE' THEN 1 END) as atualizacoes,
    COUNT(CASE WHEN a.acao = 'DELETE' THEN 1 END) as exclusoes,
    MIN(a.data_hora) as primeira_acao,
    MAX(a.data_hora) as ultima_acao
FROM public.tenant_users tu
LEFT JOIN public.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id
LEFT JOIN public.auditoria a ON tu.user_id = a.usuario_id
WHERE tu.ativo = true
  AND a.data_hora >= NOW() - INTERVAL '30 days'
GROUP BY tu.email, u.name, t.name, tu.tenant_id
ORDER BY total_acoes DESC
LIMIT 20;

-- 4.10. Análise de Taxa de Juros por Modelo
SELECT 
    l.model as modelo_emprestimo,
    COUNT(*) as quantidade,
    ROUND(MIN(l.interest_rate), 2) as taxa_minima,
    ROUND(MAX(l.interest_rate), 2) as taxa_maxima,
    ROUND(AVG(l.interest_rate), 2) as taxa_media,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.interest_rate), 2) as taxa_mediana
FROM public.loans l
WHERE l.status != 'cancelled'
GROUP BY l.model
ORDER BY l.model;

-- ============================================================================
-- 5. QUERIES DE MANUTENÇÃO E DIAGNÓSTICO
-- ============================================================================

-- 5.1. Verificar Integridade de Dados
SELECT 
    'Clientes sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)

UNION ALL

SELECT 
    'Empréstimos sem cliente' as problema,
    COUNT(*) as quantidade
FROM public.loans l
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = l.client_id)

UNION ALL

SELECT 
    'Parcelas sem empréstimo' as problema,
    COUNT(*) as quantidade
FROM public.installments inst
WHERE NOT EXISTS (SELECT 1 FROM public.loans l WHERE l.id = inst.loan_id)

UNION ALL

SELECT 
    'Usuários sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.tenant_users tu
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id);

-- 5.2. Sessões Expiradas (limpeza)
SELECT 
    COUNT(*) as sessoes_expiradas,
    MIN(expires_at) as mais_antiga,
    MAX(expires_at) as mais_recente
FROM public.user_sessions
WHERE expires_at < NOW() - INTERVAL '7 days';

-- 5.3. Tamanho das Tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho_total,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as tamanho_tabela,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as tamanho_indices
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'users', 'tenant_users', 'clients', 'loans', 'installments', 'user_sessions', 'auditoria')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
