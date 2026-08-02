-- ============================================================================
-- CORREÇÃO TIPO A — empréstimo PAID com parcela ainda pendente
-- Caso típico: João Guedes — tela mostra saldo, mas receber bloqueia
-- com "valor em aberto do empréstimo (R$ 0,00)".
--
-- Ação: reabrir o empréstimo para ACTIVE e recalcular outstanding_amount.
-- ============================================================================

-- >>> ALTERE O TENANT AQUI <<<
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
)

-- 1) PREVIEW: quem será reaberto
SELECT
    c.nome AS cliente,
    l.id AS loan_id,
    upper(l.status) AS status_emprestimo,
    COALESCE(l.outstanding_amount, 0) AS valor_em_aberto_atual,
    l.model AS modelo,
    l.amount AS capital,
    i.id AS installment_id,
    i.number AS parcela,
    i.due_date AS vencimento,
    i.amount AS valor_parcela,
    i.amount_paid AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0) AS saldo_parcela,
    i.status AS status_parcela
FROM public.loans l
JOIN public.installments i ON i.loan_id = l.id
JOIN public.clients c ON c.id = l.client_id
CROSS JOIN params p
WHERE l.tenant_id = p.tenant_id
  AND upper(l.status) = 'PAID'
  AND i.status <> 'PAID'
  AND i.amount_paid < i.amount
ORDER BY c.nome, i.number;


-- 2) CORRIGIR — descomente e rode depois de conferir o preview
-- WITH params AS (
--     SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
-- ),
-- afetados AS (
--     SELECT DISTINCT l.id AS loan_id
--     FROM public.loans l
--     JOIN public.installments i ON i.loan_id = l.id
--     CROSS JOIN params p
--     WHERE l.tenant_id = p.tenant_id
--       AND upper(l.status) = 'PAID'
--       AND i.status <> 'PAID'
--       AND i.amount_paid < i.amount
-- )
-- UPDATE public.loans l
-- SET
--     status = 'ACTIVE',
--     outstanding_amount = (
--         SELECT COALESCE(SUM(GREATEST(i.amount - i.amount_paid, 0)), 0)
--         FROM public.installments i
--         WHERE i.loan_id = l.id
--           AND i.status <> 'PAID'
--           AND i.amount_paid < i.amount
--     )
-- FROM afetados a
-- WHERE l.id = a.loan_id
-- RETURNING l.id, l.status, l.outstanding_amount;

-- 3) VALIDAR — deve retornar 0
-- WITH params AS (
--     SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
-- )
-- SELECT COUNT(*) AS ainda_tipo_a
-- FROM public.loans l
-- JOIN public.installments i ON i.loan_id = l.id
-- CROSS JOIN params p
-- WHERE l.tenant_id = p.tenant_id
--   AND upper(l.status) = 'PAID'
--   AND i.status <> 'PAID'
--   AND i.amount_paid < i.amount;
