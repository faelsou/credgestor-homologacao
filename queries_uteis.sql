-- ============================================
-- CREDGESTOR - QUERIES SQL ÚTEIS
-- ============================================

-- ============================================
-- 1. CONSULTAS GERAIS
-- ============================================

-- Listar todos os tenants ativos
SELECT id, nome, slug, cnpj, email, 
       data_criacao, ativo
FROM tenants 
WHERE ativo = TRUE
ORDER BY nome;

-- Ver estatísticas por tenant
SELECT 
    t.nome as tenant,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT p.id) as total_propostas
FROM tenants t
LEFT JOIN usuarios u ON t.id = u.tenant_id
LEFT JOIN clientes c ON t.id = c.tenant_id
LEFT JOIN propostas p ON t.id = p.tenant_id
WHERE t.ativo = TRUE
GROUP BY t.id, t.nome
ORDER BY t.nome;

-- ============================================
-- 2. ANÁLISE DE CLIENTES
-- ============================================

-- Clientes por faixa de score de crédito
SELECT 
    tenant_id,
    CASE 
        WHEN score_credito >= 800 THEN 'Excelente (800+)'
        WHEN score_credito >= 700 THEN 'Muito Bom (700-799)'
        WHEN score_credito >= 600 THEN 'Bom (600-699)'
        WHEN score_credito >= 500 THEN 'Regular (500-599)'
        ELSE 'Ruim (<500)'
    END as faixa_score,
    COUNT(*) as quantidade
FROM clientes
WHERE ativo = TRUE AND score_credito IS NOT NULL
GROUP BY tenant_id, faixa_score
ORDER BY tenant_id, faixa_score;

-- Top 10 clientes por renda
SELECT 
    c.nome,
    c.cpf_cnpj,
    c.renda_mensal,
    c.score_credito,
    COUNT(p.id) as total_propostas
FROM clientes c
LEFT JOIN propostas p ON c.id = p.cliente_id
WHERE c.tenant_id = 1 AND c.ativo = TRUE
GROUP BY c.id
ORDER BY c.renda_mensal DESC
LIMIT 10;

-- Clientes sem propostas
SELECT 
    c.id,
    c.nome,
    c.email,
    c.telefone,
    c.data_criacao
FROM clientes c
LEFT JOIN propostas p ON c.id = p.cliente_id
WHERE c.tenant_id = 1 
  AND c.ativo = TRUE
  AND p.id IS NULL
ORDER BY c.data_criacao DESC;

-- ============================================
-- 3. ANÁLISE DE PROPOSTAS
-- ============================================

-- Propostas por status
SELECT 
    status,
    COUNT(*) as quantidade,
    SUM(valor_solicitado) as valor_total_solicitado,
    SUM(valor_aprovado) as valor_total_aprovado,
    AVG(taxa_juros) as taxa_media
FROM propostas
WHERE tenant_id = 1
GROUP BY status
ORDER BY quantidade DESC;

-- Propostas aprovadas no mês
SELECT 
    DATE_TRUNC('day', data_aprovacao) as dia,
    COUNT(*) as quantidade,
    SUM(valor_aprovado) as valor_total,
    AVG(valor_aprovado) as ticket_medio
FROM propostas
WHERE tenant_id = 1 
  AND status = 'aprovado'
  AND data_aprovacao >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('day', data_aprovacao)
ORDER BY dia;

-- Taxa de aprovação
SELECT 
    COUNT(CASE WHEN status = 'aprovado' THEN 1 END) * 100.0 / COUNT(*) as taxa_aprovacao,
    COUNT(CASE WHEN status = 'reprovado' THEN 1 END) * 100.0 / COUNT(*) as taxa_reprovacao,
    COUNT(CASE WHEN status = 'em_analise' THEN 1 END) * 100.0 / COUNT(*) as taxa_analise
FROM propostas
WHERE tenant_id = 1;

-- Propostas com maior valor
SELECT 
    p.numero_proposta,
    c.nome as cliente,
    p.valor_aprovado,
    p.taxa_juros,
    p.prazo,
    p.valor_parcela,
    p.data_aprovacao,
    u.nome as vendedor
FROM propostas p
JOIN clientes c ON p.cliente_id = c.id
JOIN usuarios u ON p.usuario_id = u.id
WHERE p.tenant_id = 1 AND p.status = 'aprovado'
ORDER BY p.valor_aprovado DESC
LIMIT 10;

-- ============================================
-- 4. ANÁLISE FINANCEIRA
-- ============================================

-- Valor total em carteira (propostas aprovadas)
SELECT 
    COUNT(*) as total_contratos,
    SUM(valor_aprovado) as valor_total_financiado,
    AVG(valor_aprovado) as ticket_medio,
    AVG(taxa_juros) as taxa_media,
    AVG(prazo) as prazo_medio
FROM propostas
WHERE tenant_id = 1 AND status IN ('aprovado', 'concluido');

-- Receita por produto
SELECT 
    prod.nome as produto,
    COUNT(p.id) as quantidade_contratos,
    SUM(p.valor_aprovado) as valor_total,
    AVG(p.taxa_juros) as taxa_media
FROM propostas p
JOIN produtos prod ON p.produto_id = prod.id
WHERE p.tenant_id = 1 AND p.status = 'aprovado'
GROUP BY prod.id, prod.nome
ORDER BY valor_total DESC;

-- Previsão de recebimento mensal (parcelas pendentes)
SELECT 
    DATE_TRUNC('month', data_vencimento) as mes,
    COUNT(*) as quantidade_parcelas,
    SUM(valor_parcela) as valor_previsto,
    COUNT(CASE WHEN status = 'pago' THEN 1 END) as pagas,
    COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'atrasado' THEN 1 END) as atrasadas
FROM parcelas
WHERE tenant_id = 1
GROUP BY DATE_TRUNC('month', data_vencimento)
ORDER BY mes;

-- ============================================
-- 5. INADIMPLÊNCIA
-- ============================================

-- Parcelas vencidas e não pagas
SELECT 
    par.id,
    prop.numero_proposta,
    c.nome as cliente,
    c.telefone,
    par.numero_parcela,
    par.valor_parcela,
    par.data_vencimento,
    CURRENT_DATE - par.data_vencimento as dias_atraso,
    par.juros_atraso,
    par.multa
FROM parcelas par
JOIN propostas prop ON par.proposta_id = prop.id
JOIN clientes c ON prop.cliente_id = c.id
WHERE par.tenant_id = 1
  AND par.status IN ('pendente', 'atrasado')
  AND par.data_vencimento < CURRENT_DATE
ORDER BY par.data_vencimento;

-- Taxa de inadimplência
SELECT 
    COUNT(CASE WHEN status = 'atrasado' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN status IN ('pendente', 'atrasado', 'pago') THEN 1 END) as taxa_inadimplencia,
    SUM(CASE WHEN status = 'atrasado' THEN valor_parcela ELSE 0 END) as valor_em_atraso
FROM parcelas
WHERE tenant_id = 1;

-- Clientes inadimplentes
SELECT 
    c.nome,
    c.cpf_cnpj,
    c.telefone,
    c.email,
    COUNT(par.id) as parcelas_atrasadas,
    SUM(par.valor_parcela) as valor_total_atrasado,
    MAX(par.data_vencimento) as ultima_parcela_vencida
FROM clientes c
JOIN propostas prop ON c.id = prop.cliente_id
JOIN parcelas par ON prop.id = par.proposta_id
WHERE par.tenant_id = 1
  AND par.status = 'atrasado'
GROUP BY c.id
ORDER BY valor_total_atrasado DESC;

-- ============================================
-- 6. PERFORMANCE DE VENDEDORES
-- ============================================

-- Ranking de vendedores
SELECT 
    u.nome as vendedor,
    COUNT(p.id) as total_propostas,
    COUNT(CASE WHEN p.status = 'aprovado' THEN 1 END) as aprovadas,
    COUNT(CASE WHEN p.status = 'aprovado' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(p.id), 0) as taxa_conversao,
    SUM(CASE WHEN p.status = 'aprovado' THEN p.valor_aprovado ELSE 0 END) as valor_total_vendido,
    AVG(CASE WHEN p.status = 'aprovado' THEN p.valor_aprovado END) as ticket_medio
FROM usuarios u
LEFT JOIN propostas p ON u.id = p.usuario_id
WHERE u.tenant_id = 1 AND u.ativo = TRUE
GROUP BY u.id, u.nome
ORDER BY valor_total_vendido DESC;

-- Comissões por vendedor
SELECT 
    u.nome as vendedor,
    COUNT(c.id) as total_comissoes,
    SUM(CASE WHEN c.status = 'pago' THEN c.valor_comissao ELSE 0 END) as valor_pago,
    SUM(CASE WHEN c.status = 'pendente' THEN c.valor_comissao ELSE 0 END) as valor_pendente,
    SUM(c.valor_comissao) as valor_total
FROM usuarios u
LEFT JOIN comissoes c ON u.id = c.usuario_id
WHERE u.tenant_id = 1
GROUP BY u.id, u.nome
ORDER BY valor_total DESC;

-- ============================================
-- 7. AUDITORIA E LOGS
-- ============================================

-- Últimas ações no sistema
SELECT 
    a.data_hora,
    u.nome as usuario,
    a.acao,
    a.tabela,
    a.registro_id,
    a.ip_address
FROM auditoria a
LEFT JOIN usuarios u ON a.usuario_id = u.id
WHERE a.tenant_id = 1
ORDER BY a.data_hora DESC
LIMIT 50;

-- Ações por usuário
SELECT 
    u.nome as usuario,
    a.acao,
    COUNT(*) as quantidade
FROM auditoria a
JOIN usuarios u ON a.usuario_id = u.id
WHERE a.tenant_id = 1
  AND a.data_hora >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.nome, a.acao
ORDER BY quantidade DESC;

-- ============================================
-- 8. MANUTENÇÃO E LIMPEZA
-- ============================================

-- Identificar registros órfãos (sem tenant)
SELECT 'usuarios' as tabela, COUNT(*) FROM usuarios WHERE tenant_id NOT IN (SELECT id FROM tenants)
UNION ALL
SELECT 'clientes' as tabela, COUNT(*) FROM clientes WHERE tenant_id NOT IN (SELECT id FROM tenants)
UNION ALL
SELECT 'propostas' as tabela, COUNT(*) FROM propostas WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- Atualizar parcelas atrasadas
UPDATE parcelas
SET status = 'atrasado',
    dias_atraso = CURRENT_DATE - data_vencimento
WHERE tenant_id = 1
  AND status = 'pendente'
  AND data_vencimento < CURRENT_DATE;

-- Registros inativos há mais de 1 ano
SELECT 
    'clientes' as tabela,
    COUNT(*) as quantidade
FROM clientes
WHERE tenant_id = 1
  AND ativo = FALSE
  AND data_atualizacao < CURRENT_DATE - INTERVAL '1 year'
UNION ALL
SELECT 
    'usuarios' as tabela,
    COUNT(*) as quantidade
FROM usuarios
WHERE tenant_id = 1
  AND ativo = FALSE
  AND data_atualizacao < CURRENT_DATE - INTERVAL '1 year';

-- ============================================
-- 9. RELATÓRIOS EXECUTIVOS
-- ============================================

-- Dashboard executivo
SELECT 
    'Clientes Ativos' as metrica,
    COUNT(*)::TEXT as valor
FROM clientes
WHERE tenant_id = 1 AND ativo = TRUE

UNION ALL

SELECT 
    'Propostas em Análise' as metrica,
    COUNT(*)::TEXT as valor
FROM propostas
WHERE tenant_id = 1 AND status = 'em_analise'

UNION ALL

SELECT 
    'Taxa de Aprovação' as metrica,
    ROUND(COUNT(CASE WHEN status = 'aprovado' THEN 1 END) * 100.0 / COUNT(*), 2)::TEXT || '%' as valor
FROM propostas
WHERE tenant_id = 1

UNION ALL

SELECT 
    'Carteira Total' as metrica,
    'R$ ' || TO_CHAR(SUM(valor_aprovado), '999,999,999.99') as valor
FROM propostas
WHERE tenant_id = 1 AND status = 'aprovado'

UNION ALL

SELECT 
    'Parcelas Vencidas' as metrica,
    COUNT(*)::TEXT as valor
FROM parcelas
WHERE tenant_id = 1 AND status = 'atrasado'

UNION ALL

SELECT 
    'Ticket Médio' as metrica,
    'R$ ' || TO_CHAR(AVG(valor_aprovado), '999,999.99') as valor
FROM propostas
WHERE tenant_id = 1 AND status = 'aprovado';

-- ============================================
-- 10. QUERIES DE OTIMIZAÇÃO
-- ============================================

-- Verificar índices existentes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Estatísticas de uso das tabelas
SELECT 
    schemaname,
    relname as tabela,
    n_live_tup as linhas_ativas,
    n_dead_tup as linhas_mortas,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Tamanho das tabelas
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as tamanho
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)::regclass) DESC;
