-- ============================================================================
-- VERIFICAR STATUS E SALDO A PAGAR — CRISTINA (ANA CRISTINA CRUZ LIMA)
-- Tenant: 00000000-0000-0000-0000-000000000003
-- ============================================================================

-- 1) Resumo por empréstimo
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
cliente AS (
    SELECT c.id, c.nome, c.cpf_cnpj
    FROM public.clients c
    CROSS JOIN params p
    WHERE c.tenant_id = p.tenant_id
      AND c.nome ILIKE '%ANA CRISTINA CRUZ LIMA%'
)
SELECT
    cl.nome AS cliente,
    cl.cpf_cnpj AS cpf,
    l.id AS loan_id,
    l.model AS modelo,
    upper(l.status) AS status_emprestimo,
    l.amount AS capital,
    l.interest_rate AS taxa_am,
    l.total_amount,
    COALESCE(l.outstanding_amount, 0) AS outstanding_gravado,
    COUNT(i.id) AS qtd_parcelas,
    COUNT(*) FILTER (WHERE i.status = 'PAID') AS qtd_pagas,
    COUNT(*) FILTER (WHERE i.status = 'PARTIAL') AS qtd_parciais,
    COUNT(*) FILTER (WHERE i.status = 'LATE') AS qtd_atraso,
    COUNT(*) FILTER (WHERE i.status = 'PENDING') AS qtd_pendentes,
    ROUND(SUM(COALESCE(i.amount_paid, 0))::numeric, 2) AS total_pago_parcelas,
    ROUND(SUM(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0))
          FILTER (WHERE i.status <> 'PAID')::numeric, 2) AS saldo_parcelas_abertas
FROM cliente cl
JOIN public.loans l ON l.client_id = cl.id
LEFT JOIN public.installments i ON i.loan_id = l.id
GROUP BY cl.nome, cl.cpf_cnpj, l.id, l.model, l.status, l.amount,
         l.interest_rate, l.total_amount, l.outstanding_amount
ORDER BY l.created_at;


-- 2) Detalhe de cada parcela (quanto falta)
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
cliente AS (
    SELECT c.id, c.nome
    FROM public.clients c
    CROSS JOIN params p
    WHERE c.tenant_id = p.tenant_id
      AND c.nome ILIKE '%ANA CRISTINA CRUZ LIMA%'
)
SELECT
    cl.nome AS cliente,
    l.id AS loan_id,
    l.model AS modelo,
    i.number AS parcela,
    i.due_date AS vencimento_contrato,
    i.promised_payment_date AS data_agendada,
    i.amount AS valor_parcela,
    COALESCE(i.amount_paid, 0) AS ja_pago,
    ROUND(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)::numeric, 2) AS falta_pagar,
    i.status,
    COALESCE(i.interest_amount, 0) AS juros_gravado,
    COALESCE(i.principal_amount, 0) AS capital_parcela,
    i.promised_payment_amount AS valor_prometido,
    i.paid_date AS data_pagamento,
    i.id AS installment_id
FROM cliente cl
JOIN public.loans l ON l.client_id = cl.id
JOIN public.installments i ON i.loan_id = l.id
ORDER BY i.due_date, i.number;


-- 3) Só o que ainda falta (aberto)
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
cliente AS (
    SELECT c.id, c.nome
    FROM public.clients c
    CROSS JOIN params p
    WHERE c.tenant_id = p.tenant_id
      AND c.nome ILIKE '%ANA CRISTINA CRUZ LIMA%'
)
SELECT
    cl.nome AS cliente,
    i.number AS parcela,
    i.due_date AS vencimento,
    i.amount AS valor,
    COALESCE(i.amount_paid, 0) AS pago,
    ROUND((i.amount - COALESCE(i.amount_paid, 0))::numeric, 2) AS falta,
    i.status,
    l.model,
    l.id AS loan_id
FROM cliente cl
JOIN public.loans l ON l.client_id = cl.id
JOIN public.installments i ON i.loan_id = l.id
WHERE COALESCE(i.amount_paid, 0) < i.amount
  AND i.status <> 'PAID'
ORDER BY i.due_date, i.number;
