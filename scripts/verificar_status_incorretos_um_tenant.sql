-- ============================================================================
-- VERIFICAÇÃO DE STATUS INCORRETOS — UM TENANT
-- Uso no Supabase SQL Editor:
--   1) Altere o UUID na CTE "params" abaixo
--   2) Rode a consulta inteira (retorna o DETALHE das diferenças)
--   3) Se quiser só a contagem, use a consulta do final do arquivo
-- ============================================================================

-- >>> ALTERE O TENANT AQUI <<<
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
),

inconsistencias AS (
    -- B: valor quitado, status <> PAID
    SELECT
        c.id   AS client_id,
        c.nome AS cliente,
        'B_valor_quitado_status_nao_paid' AS tipo,
        i.id   AS installment_id,
        l.id   AS loan_id,
        i.number AS parcela,
        i.due_date AS vencimento,
        i.amount AS valor,
        i.amount_paid AS valor_pago,
        i.status AS status_atual,
        'PAID'::text AS status_esperado,
        upper(l.status) AS status_emprestimo,
        l.model AS modelo
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.amount_paid >= i.amount
      AND i.amount > 0
      AND i.status <> 'PAID'

    UNION ALL

    -- A: empréstimo PAID com parcela pendente
    SELECT
        c.id,
        c.nome,
        'A_emprestimo_paid_parcela_pendente',
        i.id,
        l.id,
        i.number,
        i.due_date,
        i.amount,
        i.amount_paid,
        i.status,
        'PAID',
        upper(l.status),
        l.model
    FROM public.loans l
    JOIN public.installments i ON i.loan_id = l.id
    JOIN public.clients c      ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND i.status <> 'PAID'
      AND i.amount_paid < i.amount

    UNION ALL

    -- C: status PAID com saldo
    SELECT
        c.id,
        c.nome,
        'C_status_paid_com_saldo',
        i.id,
        l.id,
        i.number,
        i.due_date,
        i.amount,
        i.amount_paid,
        i.status,
        CASE WHEN COALESCE(i.amount_paid, 0) <= 0 THEN 'PENDING' ELSE 'PARTIAL' END,
        upper(l.status),
        l.model
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PAID'
      AND i.amount_paid < i.amount
      AND i.amount > 0

    UNION ALL

    -- D: vencida ainda PENDING
    SELECT
        c.id,
        c.nome,
        'D_vencida_ainda_pending',
        i.id,
        l.id,
        i.number,
        i.due_date,
        i.amount,
        i.amount_paid,
        i.status,
        'LATE',
        upper(l.status),
        l.model
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans   l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL

    -- E: empréstimo ACTIVE/OPEN sem parcela pendente
    SELECT
        c.id,
        c.nome,
        'E_emprestimo_active_sem_parcela_pendente',
        NULL::uuid,
        l.id,
        NULL::integer,
        NULL::date,
        NULL::numeric,
        NULL::numeric,
        upper(l.status),
        'PAID',
        upper(l.status),
        l.model
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1
          FROM public.installments i
          WHERE i.loan_id = l.id
            AND i.status <> 'PAID'
            AND i.amount_paid < i.amount
      )
      AND EXISTS (
          SELECT 1 FROM public.installments i WHERE i.loan_id = l.id
      )

    UNION ALL

    -- F: empréstimo PAID com outstanding_amount > 0
    SELECT
        c.id,
        c.nome,
        'F_emprestimo_paid_com_valor_aberto',
        NULL::uuid,
        l.id,
        NULL::integer,
        NULL::date,
        COALESCE(l.outstanding_amount, 0),
        0::numeric,
        upper(l.status),
        'PAID (outstanding=0)',
        upper(l.status),
        l.model
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01
)

-- DETALHE das diferenças do tenant
SELECT
    cliente,
    tipo,
    modelo,
    status_emprestimo,
    installment_id,
    loan_id,
    parcela,
    vencimento,
    valor,
    valor_pago,
    status_atual,
    status_esperado
FROM inconsistencias
ORDER BY tipo, cliente, vencimento NULLS LAST, parcela NULLS LAST;


-- ============================================================================
-- CONTAGEM POR TIPO (mesmo tenant) — rode separadamente se quiser só o resumo
-- ============================================================================
/*
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
),
inconsistencias AS (
    SELECT 'B_valor_quitado_status_nao_paid' AS tipo
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'

    UNION ALL
    SELECT 'A_emprestimo_paid_parcela_pendente'
    FROM public.loans l
    JOIN public.installments i ON i.loan_id = l.id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID' AND i.status <> 'PAID' AND i.amount_paid < i.amount

    UNION ALL
    SELECT 'C_status_paid_com_saldo'
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0

    UNION ALL
    SELECT 'D_vencida_ainda_pending'
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL
    SELECT 'E_emprestimo_active_sem_parcela_pendente'
    FROM public.loans l
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id AND i.status <> 'PAID' AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)

    UNION ALL
    SELECT 'F_emprestimo_paid_com_valor_aberto'
    FROM public.loans l
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01
)
SELECT tipo, COUNT(*) AS qtd
FROM inconsistencias
GROUP BY tipo
ORDER BY qtd DESC;
*/

-- ============================================================================
-- RESUMO POR CLIENTE (mesmo tenant) — rode separadamente se quiser
-- ============================================================================
/*
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
),
inconsistencias AS (
    SELECT c.id AS client_id, c.nome AS cliente, 'B_valor_quitado_status_nao_paid' AS tipo, i.id AS installment_id, l.id AS loan_id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'

    UNION ALL
    SELECT c.id, c.nome, 'A_emprestimo_paid_parcela_pendente', i.id, l.id
    FROM public.loans l
    JOIN public.installments i ON i.loan_id = l.id
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID' AND i.status <> 'PAID' AND i.amount_paid < i.amount

    UNION ALL
    SELECT c.id, c.nome, 'C_status_paid_com_saldo', i.id, l.id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0

    UNION ALL
    SELECT c.id, c.nome, 'D_vencida_ainda_pending', i.id, l.id
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PENDING' AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL
    SELECT c.id, c.nome, 'E_emprestimo_active_sem_parcela_pendente', NULL::uuid, l.id
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id AND i.status <> 'PAID' AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)

    UNION ALL
    SELECT c.id, c.nome, 'F_emprestimo_paid_com_valor_aberto', NULL::uuid, l.id
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01
)
SELECT
    cliente,
    COUNT(*) AS qtd_problemas,
    COUNT(DISTINCT loan_id) AS qtd_emprestimos,
    COUNT(DISTINCT installment_id) AS qtd_parcelas,
    string_agg(DISTINCT tipo, ', ' ORDER BY tipo) AS tipos_encontrados
FROM inconsistencias
GROUP BY client_id, cliente
ORDER BY qtd_problemas DESC, cliente;
*/
