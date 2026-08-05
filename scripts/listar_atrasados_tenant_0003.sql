-- ============================================================================
-- CLIENTES EM ATRASO NO BANCO — Tenant 0003 (Cleiton Max Car)
-- Critério: status = LATE OU (PENDING com vencimento passado e saldo)
-- ============================================================================

WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT
    c.nome AS cliente,
    c.cpf_cnpj AS cpf,
    COALESCE(c.whatsapp, c.celular, c.telefone) AS telefone,
    i.number AS parcela,
    i.due_date AS vencimento,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date - i.due_date AS dias_atraso,
    i.amount AS valor,
    COALESCE(i.amount_paid, 0) AS pago,
    ROUND((i.amount - COALESCE(i.amount_paid, 0))::numeric, 2) AS saldo,
    i.status,
    l.model AS modelo,
    l.id AS loan_id,
    i.id AS installment_id
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans l ON l.id = i.loan_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.amount > 0
  AND (
        i.status = 'LATE'
     OR (
          i.status = 'PENDING'
          AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )
  )
ORDER BY dias_atraso DESC, c.nome, i.number;


-- ----------------------------------------------------------------------------
-- RESUMO POR CLIENTE (saldo total em atraso)
-- ----------------------------------------------------------------------------
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT
    c.nome AS cliente,
    COUNT(*) AS qtd_parcelas_atraso,
    MAX((now() AT TIME ZONE 'America/Sao_Paulo')::date - i.due_date) AS maior_atraso_dias,
    ROUND(SUM(i.amount - COALESCE(i.amount_paid, 0))::numeric, 2) AS saldo_total_atraso
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.amount > 0
  AND (
        i.status = 'LATE'
     OR (
          i.status = 'PENDING'
          AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )
  )
GROUP BY c.id, c.nome
ORDER BY maior_atraso_dias DESC, saldo_total_atraso DESC;
