-- ============================================================================
-- VALIDAÇÃO DE PARCELAS: PAGAS x EM ATRASO
-- Executar no SQL Editor do Supabase (ou psql).
--
-- Observações:
--   - A data "hoje" usa o fuso America/Sao_Paulo (o banco roda em UTC).
--   - Para filtrar um tenant específico, descomente as linhas com tenant_id.
--   - Uma parcela é considerada efetivamente paga quando status = 'PAID'
--     OU quando amount_paid >= amount (baixa que não atualizou o status).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) VISÃO GERAL: contagem e valores por status de parcela
-- ----------------------------------------------------------------------------
SELECT
    i.status,
    COUNT(*)                                   AS qtd_parcelas,
    SUM(i.amount)                              AS valor_total,
    SUM(i.amount_paid)                         AS valor_pago,
    SUM(GREATEST(i.amount - i.amount_paid, 0)) AS valor_pendente
FROM public.installments i
-- WHERE i.tenant_id = 'SEU_TENANT_ID'
GROUP BY i.status
ORDER BY i.status;

-- ----------------------------------------------------------------------------
-- 2) PARCELAS PAGAS (status PAID ou totalmente quitadas pelo valor)
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                     AS cliente,
    l.model                                    AS modelo_emprestimo,
    i.number                                   AS parcela,
    i.due_date                                 AS vencimento,
    i.amount                                   AS valor,
    i.amount_paid                              AS valor_pago,
    i.status,
    i.paid_date                                AS data_baixa
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE (i.status = 'PAID' OR i.amount_paid >= i.amount)
  AND i.amount > 0
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY i.paid_date DESC NULLS LAST, c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 3) PARCELAS EM ATRASO (vencidas, não pagas e com saldo pendente)
--    É esta lista que faz o cliente aparecer como devedor no sistema.
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                          AS cliente,
    c.celular                                       AS telefone,
    l.model                                         AS modelo_emprestimo,
    upper(l.status)                                 AS status_emprestimo,
    i.number                                        AS parcela,
    i.due_date                                      AS vencimento,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date
        - i.due_date                                AS dias_atraso,
    i.amount                                        AS valor,
    i.amount_paid                                   AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0)           AS valor_pendente,
    i.status                                        AS status_parcela
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE i.status <> 'PAID'
  AND i.amount_paid < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY dias_atraso DESC, c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 4) PARCELAS DO DIA (vencem hoje e ainda não foram baixadas)
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                AS cliente,
    c.celular                             AS telefone,
    l.model                               AS modelo_emprestimo,
    i.number                              AS parcela,
    i.amount                              AS valor,
    i.amount_paid                         AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0) AS valor_pendente,
    i.status                              AS status_parcela
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE i.status <> 'PAID'
  AND i.amount_paid < i.amount
  AND i.due_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 5) INCONSISTÊNCIA A: empréstimo QUITADO com parcelas ainda pendentes no banco
--    >>> Estes são os clientes do bug: já pagaram mas voltam como devedores. <<<
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                AS cliente,
    l.id                                  AS loan_id,
    upper(l.status)                       AS status_emprestimo,
    i.id                                  AS installment_id,
    i.number                              AS parcela,
    i.due_date                            AS vencimento,
    i.amount                              AS valor,
    i.amount_paid                         AS valor_pago,
    i.status                              AS status_parcela
FROM public.loans l
JOIN public.installments i ON i.loan_id = l.id
JOIN public.clients c      ON c.id = l.client_id
WHERE upper(l.status) = 'PAID'
  AND i.status <> 'PAID'
  AND i.amount_paid < i.amount
-- AND l.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 6) INCONSISTÊNCIA B: parcela totalmente paga pelo valor, mas status errado
--    (baixa registrou o valor mas o status não foi atualizado para PAID)
-- ----------------------------------------------------------------------------
SELECT
    c.nome          AS cliente,
    i.id            AS installment_id,
    i.number        AS parcela,
    i.due_date      AS vencimento,
    i.amount        AS valor,
    i.amount_paid   AS valor_pago,
    i.status        AS status_parcela
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID'
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 7) RESUMO POR CLIENTE DEVEDOR: total em atraso consolidado
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                     AS cliente,
    c.celular                                  AS telefone,
    COUNT(*)                                   AS parcelas_atrasadas,
    MIN(i.due_date)                            AS atraso_mais_antigo,
    SUM(GREATEST(i.amount - i.amount_paid, 0)) AS total_pendente
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
WHERE i.status <> 'PAID'
  AND i.amount_paid < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
-- AND i.tenant_id = 'SEU_TENANT_ID'
GROUP BY c.id, c.nome, c.celular
ORDER BY total_pendente DESC;
