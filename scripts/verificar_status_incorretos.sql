-- ============================================================================
-- VERIFICAÇÃO DE CLIENTES COM STATUS DIFERENTE / ERRADO
-- Executar no SQL Editor do Supabase (ou psql).
--
-- O que este script considera "errado":
--   B) Parcela com valor quitado (amount_paid >= amount) mas status <> PAID
--   A) Empréstimo PAID com parcela ainda pendente (saldo em aberto)
--   C) Parcela marcada PAID mas ainda com saldo (amount_paid < amount)
--   D) Parcela vencida com saldo, status ainda PENDING (deveria ser LATE)
--   E) Empréstimo ACTIVE sem nenhuma parcela pendente (possível quitação não refletida)
--   F) Empréstimo PAID ainda com outstanding_amount > 0
--
-- Em cada consulta, descomente o filtro de tenant_id se quiser limitar o escopo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) RESUMO POR CLIENTE — quem tem algum status inconsistente
--    Comece por esta consulta para ver a lista consolidada.
-- ----------------------------------------------------------------------------
WITH inconsistencias AS (
    -- B: valor pago, status errado
    SELECT
        c.id   AS client_id,
        c.nome AS cliente,
        'B_valor_quitado_status_nao_paid' AS tipo,
        i.id   AS installment_id,
        l.id   AS loan_id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    WHERE i.amount_paid >= i.amount
      AND i.amount > 0
      AND i.status <> 'PAID'
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    -- A: empréstimo quitado com parcela pendente
    SELECT
        c.id,
        c.nome,
        'A_emprestimo_paid_parcela_pendente',
        i.id,
        l.id
    FROM public.loans l
    JOIN public.installments i ON i.loan_id = l.id
    JOIN public.clients c      ON c.id = l.client_id
    WHERE upper(l.status) = 'PAID'
      AND i.status <> 'PAID'
      AND i.amount_paid < i.amount
    -- AND l.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    -- C: status PAID com saldo ainda em aberto
    SELECT
        c.id,
        c.nome,
        'C_status_paid_com_saldo',
        i.id,
        l.id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    WHERE i.status = 'PAID'
      AND i.amount_paid < i.amount
      AND i.amount > 0
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    -- D: vencida com saldo e status PENDING (deveria LATE)
    SELECT
        c.id,
        c.nome,
        'D_vencida_ainda_pending',
        i.id,
        l.id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    WHERE i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    -- E: empréstimo ACTIVE sem parcelas pendentes
    SELECT
        c.id,
        c.nome,
        'E_emprestimo_active_sem_parcela_pendente',
        NULL::uuid,
        l.id
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    WHERE upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1
          FROM public.installments i
          WHERE i.loan_id = l.id
            AND i.status <> 'PAID'
            AND i.amount_paid < i.amount
      )
      AND EXISTS (
          SELECT 1
          FROM public.installments i
          WHERE i.loan_id = l.id
      )
    -- AND l.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    -- F: empréstimo PAID com outstanding_amount > 0
    SELECT
        c.id,
        c.nome,
        'F_emprestimo_paid_com_valor_aberto',
        NULL::uuid,
        l.id
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    WHERE upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01
    -- AND l.tenant_id = 'SEU_TENANT_ID'
)
SELECT
    cliente,
    COUNT(*)                                         AS qtd_problemas,
    COUNT(DISTINCT loan_id)                          AS qtd_emprestimos,
    COUNT(DISTINCT installment_id)                   AS qtd_parcelas,
    string_agg(DISTINCT tipo, ', ' ORDER BY tipo)    AS tipos_encontrados
FROM inconsistencias
GROUP BY client_id, cliente
ORDER BY qtd_problemas DESC, cliente;

-- ----------------------------------------------------------------------------
-- 1) DETALHE: parcela com valor quitado, status diferente de PAID  (tipo B)
--    Status esperado: PAID
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.model                                  AS modelo,
    upper(l.status)                          AS status_emprestimo,
    i.id                                     AS installment_id,
    i.number                                 AS parcela,
    i.due_date                               AS vencimento,
    i.amount                                 AS valor,
    i.amount_paid                            AS valor_pago,
    i.status                                 AS status_atual,
    'PAID'                                   AS status_esperado,
    'B_valor_quitado_status_nao_paid'        AS tipo
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID'
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.due_date, i.number;

-- ----------------------------------------------------------------------------
-- 2) DETALHE: empréstimo PAID com parcela ainda pendente  (tipo A)
--    Status esperado da parcela: PAID (se o empréstimo realmente foi quitado)
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.id                                     AS loan_id,
    upper(l.status)                          AS status_emprestimo,
    i.id                                     AS installment_id,
    i.number                                 AS parcela,
    i.due_date                               AS vencimento,
    i.amount                                 AS valor,
    i.amount_paid                            AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0)    AS saldo,
    i.status                                 AS status_atual,
    'PAID'                                   AS status_esperado_parcela,
    'A_emprestimo_paid_parcela_pendente'     AS tipo
FROM public.loans l
JOIN public.installments i ON i.loan_id = l.id
JOIN public.clients c      ON c.id = l.client_id
WHERE upper(l.status) = 'PAID'
  AND i.status <> 'PAID'
  AND i.amount_paid < i.amount
-- AND l.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 3) DETALHE: parcela PAID com saldo ainda em aberto  (tipo C)
--    Status esperado: PARTIAL (ou PENDING, se amount_paid = 0)
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.model                                  AS modelo,
    i.id                                     AS installment_id,
    i.number                                 AS parcela,
    i.due_date                               AS vencimento,
    i.amount                                 AS valor,
    i.amount_paid                            AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0)    AS saldo,
    i.status                                 AS status_atual,
    CASE
        WHEN i.amount_paid <= 0 THEN 'PENDING'
        ELSE 'PARTIAL'
    END                                      AS status_esperado,
    'C_status_paid_com_saldo'                AS tipo
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE i.status = 'PAID'
  AND i.amount_paid < i.amount
  AND i.amount > 0
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 4) DETALHE: parcela vencida com saldo e status PENDING  (tipo D)
--    Status esperado: LATE
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.model                                  AS modelo,
    i.id                                     AS installment_id,
    i.number                                 AS parcela,
    i.due_date                               AS vencimento,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date
        - i.due_date                         AS dias_atraso,
    i.amount                                 AS valor,
    i.amount_paid                            AS valor_pago,
    GREATEST(i.amount - i.amount_paid, 0)    AS saldo,
    i.status                                 AS status_atual,
    'LATE'                                   AS status_esperado,
    'D_vencida_ainda_pending'                AS tipo
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans   l ON l.id = i.loan_id
WHERE i.status = 'PENDING'
  AND i.amount_paid < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
-- AND i.tenant_id = 'SEU_TENANT_ID'
ORDER BY dias_atraso DESC, c.nome, i.number;

-- ----------------------------------------------------------------------------
-- 5) DETALHE: empréstimo ACTIVE/OPEN sem parcelas pendentes  (tipo E)
--    Status esperado do empréstimo: PAID
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.id                                     AS loan_id,
    l.model                                  AS modelo,
    upper(l.status)                          AS status_atual,
    'PAID'                                   AS status_esperado,
    COALESCE(l.outstanding_amount, 0)        AS valor_em_aberto,
    (
        SELECT COUNT(*)
        FROM public.installments i
        WHERE i.loan_id = l.id
    )                                        AS qtd_parcelas,
    (
        SELECT COUNT(*)
        FROM public.installments i
        WHERE i.loan_id = l.id
          AND i.status = 'PAID'
    )                                        AS qtd_parcelas_paid,
    'E_emprestimo_active_sem_parcela_pendente' AS tipo
FROM public.loans l
JOIN public.clients c ON c.id = l.client_id
WHERE upper(l.status) IN ('ACTIVE', 'OPEN')
  AND NOT EXISTS (
      SELECT 1
      FROM public.installments i
      WHERE i.loan_id = l.id
        AND i.status <> 'PAID'
        AND i.amount_paid < i.amount
  )
  AND EXISTS (
      SELECT 1
      FROM public.installments i
      WHERE i.loan_id = l.id
  )
-- AND l.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome;

-- ----------------------------------------------------------------------------
-- 6) DETALHE: empréstimo PAID com outstanding_amount > 0  (tipo F)
--    Valor em aberto esperado: 0
-- ----------------------------------------------------------------------------
SELECT
    c.nome                                   AS cliente,
    l.id                                     AS loan_id,
    l.model                                  AS modelo,
    upper(l.status)                          AS status_emprestimo,
    l.outstanding_amount                     AS valor_em_aberto_atual,
    0                                        AS valor_em_aberto_esperado,
    'F_emprestimo_paid_com_valor_aberto'     AS tipo
FROM public.loans l
JOIN public.clients c ON c.id = l.client_id
WHERE upper(l.status) = 'PAID'
  AND COALESCE(l.outstanding_amount, 0) > 0.01
-- AND l.tenant_id = 'SEU_TENANT_ID'
ORDER BY c.nome;

-- ----------------------------------------------------------------------------
-- 7) CONTAGEM POR TIPO — visão rápida do volume de cada problema
-- ----------------------------------------------------------------------------
SELECT tipo, COUNT(*) AS qtd
FROM (
    SELECT 'B_valor_quitado_status_nao_paid' AS tipo
    FROM public.installments i
    WHERE i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    SELECT 'A_emprestimo_paid_parcela_pendente'
    FROM public.loans l
    JOIN public.installments i ON i.loan_id = l.id
    WHERE upper(l.status) = 'PAID' AND i.status <> 'PAID' AND i.amount_paid < i.amount
    -- AND l.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    SELECT 'C_status_paid_com_saldo'
    FROM public.installments i
    WHERE i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    SELECT 'D_vencida_ainda_pending'
    FROM public.installments i
    WHERE i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    -- AND i.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    SELECT 'E_emprestimo_active_sem_parcela_pendente'
    FROM public.loans l
    WHERE upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id AND i.status <> 'PAID' AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)
    -- AND l.tenant_id = 'SEU_TENANT_ID'

    UNION ALL

    SELECT 'F_emprestimo_paid_com_valor_aberto'
    FROM public.loans l
    WHERE upper(l.status) = 'PAID' AND COALESCE(l.outstanding_amount, 0) > 0.01
    -- AND l.tenant_id = 'SEU_TENANT_ID'
) t
GROUP BY tipo
ORDER BY qtd DESC;
