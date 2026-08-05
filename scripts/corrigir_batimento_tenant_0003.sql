-- ============================================================================
-- CORREÇÃO DO BATIMENTO FE ↔ DB — TENANT 0003 (Cleiton Max Car)
-- ============================================================================
-- Cobre os achados do script batimento_emprestimos_parcelas.py:
--
--   D) Parcela vencida ainda PENDING          → LATE          (AUTO)
--   F) Empréstimo PAID com outstanding > 0    → outstanding=0 (AUTO)
--   G) outstanding_amount ≠ FE canônico       → recalcula     (AUTO)
--   B) amount_paid >= amount e status <> PAID → PAID          (AUTO, se houver)
--   C) status PAID com saldo                  → PARTIAL/PENDING (AUTO, se houver)
--
-- NÃO altera automaticamente (só preview — revisão manual):
--   J) total_amount ≠ Σ parcelas.amount  (pode ser parcela duplicada / rollover)
--   K) amount_paid > amount               (comum em INTEREST_ONLY com amortização)
--   H) divergência entre fórmulas FE      (corrigir no código, não no banco)
--
-- Uso (SQL Editor do Supabase):
--   1) Rode PASSO 0 (preview) e confira
--   2) Rode PASSO 1 (criar tabelas de backup — uma vez)
--   3) Rode PASSO 2 (backup + UPDATEs em transação)
--   4) Rode PASSO 3 (validação)
--   5) (Opcional) Rode PASSO 4 — só leitura dos casos J e K
--
-- Tenant fixo:
--   00000000-0000-0000-0000-000000000003
-- ============================================================================

-- ============================================================================
-- PASSO 0: PREVIEW — o que será alterado (rode sozinho primeiro)
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
-- Capital amortizado via payment_history (camelCase do frontend)
principal_por_loan AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(
            COALESCE((elem->>'principalPaid')::numeric, (elem->>'principal_paid')::numeric, 0)
        ), 0) AS capital_pago
    FROM public.installments i
    CROSS JOIN params p
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(i.payment_history, '[]'::jsonb)) elem ON TRUE
    WHERE i.tenant_id = p.tenant_id
    GROUP BY i.loan_id
),
cobrancas_abertas AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)), 0) AS aberto
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status <> 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
    GROUP BY i.loan_id
),
pago_por_loan AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(COALESCE(i.amount_paid, 0)), 0) AS total_pago
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
    GROUP BY i.loan_id
),
outstanding_canonico AS (
    SELECT
        l.id AS loan_id,
        l.model,
        upper(l.status) AS status_db,
        COALESCE(l.outstanding_amount, 0) AS outstanding_atual,
        CASE
            WHEN upper(l.status) = 'PAID'
                 AND NOT EXISTS (
                     SELECT 1 FROM public.installments i
                     WHERE i.loan_id = l.id
                       AND i.status <> 'PAID'
                       AND COALESCE(i.amount_paid, 0) < i.amount
                 )
                THEN 0::numeric
            WHEN upper(COALESCE(l.model, 'PRICE')) = 'INTEREST_ONLY' THEN
                ROUND((
                    GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                    + GREATEST(
                        ROUND(GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                              * (l.interest_rate / 100.0), 2),
                        COALESCE(ca.aberto, 0)
                    )
                )::numeric, 2)
            ELSE
                ROUND(GREATEST(l.total_amount - COALESCE(pg.total_pago, 0), 0)::numeric, 2)
        END AS outstanding_novo
    FROM public.loans l
    CROSS JOIN params p
    LEFT JOIN principal_por_loan pp ON pp.loan_id = l.id
    LEFT JOIN cobrancas_abertas ca ON ca.loan_id = l.id
    LEFT JOIN pago_por_loan pg ON pg.loan_id = l.id
    WHERE l.tenant_id = p.tenant_id
)
SELECT
    acao,
    cliente,
    loan_id,
    installment_id,
    parcela,
    vencimento,
    valor_atual,
    valor_novo,
    detalhe
FROM (
    -- D: PENDING vencida → LATE
    SELECT
        'D_para_LATE'::text AS acao,
        c.nome AS cliente,
        l.id AS loan_id,
        i.id AS installment_id,
        i.number AS parcela,
        i.due_date AS vencimento,
        i.status::text AS valor_atual,
        'LATE'::text AS valor_novo,
        format('dias_atraso=%s saldo=%s',
               ((now() AT TIME ZONE 'America/Sao_Paulo')::date - i.due_date),
               ROUND((i.amount - COALESCE(i.amount_paid, 0))::numeric, 2)
        ) AS detalhe,
        1 AS ord
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PENDING'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL

    -- F: PAID com outstanding > 0 → zerar
    SELECT
        'F_zerar_outstanding_paid',
        c.nome,
        l.id,
        NULL::uuid,
        NULL::integer,
        NULL::date,
        COALESCE(l.outstanding_amount, 0)::text,
        '0',
        'empréstimo PAID com valor em aberto residual',
        2
    FROM public.loans l
    JOIN public.clients c ON c.id = l.client_id
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01

    UNION ALL

    -- G: outstanding diverge do canônico (tolerância 2 centavos)
    SELECT
        'G_recalcular_outstanding',
        c.nome,
        oc.loan_id,
        NULL::uuid,
        NULL::integer,
        NULL::date,
        oc.outstanding_atual::text,
        oc.outstanding_novo::text,
        format('modelo=%s status=%s Δ=%s',
               oc.model, oc.status_db,
               ROUND((oc.outstanding_atual - oc.outstanding_novo)::numeric, 2)),
        3
    FROM outstanding_canonico oc
    JOIN public.loans l ON l.id = oc.loan_id
    JOIN public.clients c ON c.id = l.client_id
    WHERE ABS(oc.outstanding_atual - oc.outstanding_novo) > 0.02

    UNION ALL

    -- B: valor quitado, status errado
    SELECT
        'B_para_PAID',
        c.nome,
        l.id,
        i.id,
        i.number,
        i.due_date,
        i.status,
        'PAID',
        format('amount=%s paid=%s', i.amount, i.amount_paid),
        4
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.amount_paid >= i.amount
      AND i.amount > 0
      AND i.status <> 'PAID'

    UNION ALL

    -- C: PAID com saldo
    SELECT
        'C_para_PARTIAL_ou_PENDING',
        c.nome,
        l.id,
        i.id,
        i.number,
        i.due_date,
        i.status,
        CASE WHEN COALESCE(i.amount_paid, 0) <= 0 THEN 'PENDING' ELSE 'PARTIAL' END,
        format('amount=%s paid=%s', i.amount, i.amount_paid),
        5
    FROM public.installments i
    JOIN public.clients c ON c.id = i.client_id
    JOIN public.loans l ON l.id = i.loan_id
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.amount > 0
) x
ORDER BY ord, cliente, vencimento NULLS LAST, parcela NULLS LAST;


-- Contagem rápida do preview
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT 'D_para_LATE' AS acao, COUNT(*) AS qtd
FROM public.installments i
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
UNION ALL
SELECT 'F_zerar_outstanding_paid', COUNT(*)
FROM public.loans l
CROSS JOIN params p
WHERE l.tenant_id = p.tenant_id
  AND upper(l.status) = 'PAID'
  AND COALESCE(l.outstanding_amount, 0) > 0.01
UNION ALL
SELECT 'B_para_PAID', COUNT(*)
FROM public.installments i
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'
UNION ALL
SELECT 'C_para_PARTIAL_ou_PENDING', COUNT(*)
FROM public.installments i
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PAID' AND COALESCE(i.amount_paid, 0) < i.amount AND i.amount > 0;


-- ============================================================================
-- PASSO 1: criar tabelas de backup (rodar uma vez; seguro se já existirem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.installments_backup_batimento_0003 AS
SELECT i.*, now() AS backup_em
FROM public.installments i
WHERE FALSE;

CREATE TABLE IF NOT EXISTS public.loans_backup_batimento_0003 AS
SELECT l.*, now() AS backup_em
FROM public.loans l
WHERE FALSE;


-- ============================================================================
-- PASSO 2: BACKUP + CORREÇÃO (rode este bloco inteiro)
-- ============================================================================
DO $$
DECLARE
    v_tenant uuid := '00000000-0000-0000-0000-000000000003';
    n_b int := 0;
    n_c int := 0;
    n_d int := 0;
    n_f int := 0;
    n_g int := 0;
BEGIN
    -- Backup parcelas (D/B/C)
    INSERT INTO public.installments_backup_batimento_0003
    SELECT i.*, now()
    FROM public.installments i
    WHERE i.tenant_id = v_tenant
      AND (
            (i.status = 'PENDING'
             AND COALESCE(i.amount_paid, 0) < i.amount
             AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date)
         OR (i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID')
         OR (i.status = 'PAID' AND COALESCE(i.amount_paid, 0) < i.amount AND i.amount > 0)
      );

    -- Backup empréstimos (F + candidatos G)
    INSERT INTO public.loans_backup_batimento_0003
    SELECT l.*, now()
    FROM public.loans l
    WHERE l.tenant_id = v_tenant
      AND (
            (upper(l.status) = 'PAID' AND COALESCE(l.outstanding_amount, 0) > 0.01)
         OR TRUE  -- backup de todos os loans do tenant afetados no G abaixo
      )
      AND l.id IN (
          SELECT id FROM public.loans WHERE tenant_id = v_tenant
      );

    -- B: valor quitado → PAID
    UPDATE public.installments i
    SET status = 'PAID',
        paid_date = COALESCE(
            i.paid_date,
            (i.updated_at AT TIME ZONE 'America/Sao_Paulo')::date
        )
    WHERE i.tenant_id = v_tenant
      AND i.amount_paid >= i.amount
      AND i.amount > 0
      AND i.status <> 'PAID';
    GET DIAGNOSTICS n_b = ROW_COUNT;

    -- C: PAID com saldo → PARTIAL/PENDING
    UPDATE public.installments i
    SET status = CASE
                   WHEN COALESCE(i.amount_paid, 0) <= 0 THEN 'PENDING'
                   ELSE 'PARTIAL'
                 END,
        paid_date = NULL
    WHERE i.tenant_id = v_tenant
      AND i.status = 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.amount > 0;
    GET DIAGNOSTICS n_c = ROW_COUNT;

    -- D: vencida PENDING → LATE
    UPDATE public.installments i
    SET status = 'LATE'
    WHERE i.tenant_id = v_tenant
      AND i.status = 'PENDING'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    GET DIAGNOSTICS n_d = ROW_COUNT;

    -- F: PAID com outstanding residual → 0
    UPDATE public.loans l
    SET outstanding_amount = 0,
        updated_at = now()
    WHERE l.tenant_id = v_tenant
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01;
    GET DIAGNOSTICS n_f = ROW_COUNT;

    -- G: recalcular outstanding_amount (fórmula canônica = loanBalances.ts)
    WITH principal_por_loan AS (
        SELECT
            i.loan_id,
            COALESCE(SUM(
                COALESCE((elem->>'principalPaid')::numeric, (elem->>'principal_paid')::numeric, 0)
            ), 0) AS capital_pago
        FROM public.installments i
        LEFT JOIN LATERAL jsonb_array_elements(COALESCE(i.payment_history, '[]'::jsonb)) elem ON TRUE
        WHERE i.tenant_id = v_tenant
        GROUP BY i.loan_id
    ),
    cobrancas_abertas AS (
        SELECT
            i.loan_id,
            COALESCE(SUM(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)), 0) AS aberto
        FROM public.installments i
        WHERE i.tenant_id = v_tenant
          AND i.status <> 'PAID'
          AND COALESCE(i.amount_paid, 0) < i.amount
        GROUP BY i.loan_id
    ),
    pago_por_loan AS (
        SELECT
            i.loan_id,
            COALESCE(SUM(COALESCE(i.amount_paid, 0)), 0) AS total_pago
        FROM public.installments i
        WHERE i.tenant_id = v_tenant
        GROUP BY i.loan_id
    ),
    calc AS (
        SELECT
            l.id AS loan_id,
            CASE
                WHEN upper(l.status) = 'PAID'
                     AND NOT EXISTS (
                         SELECT 1 FROM public.installments i
                         WHERE i.loan_id = l.id
                           AND i.status <> 'PAID'
                           AND COALESCE(i.amount_paid, 0) < i.amount
                     )
                    THEN 0::numeric
                WHEN upper(COALESCE(l.model, 'PRICE')) = 'INTEREST_ONLY' THEN
                    ROUND((
                        GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                        + GREATEST(
                            ROUND(GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                                  * (l.interest_rate / 100.0), 2),
                            COALESCE(ca.aberto, 0)
                        )
                    )::numeric, 2)
                ELSE
                    ROUND(GREATEST(l.total_amount - COALESCE(pg.total_pago, 0), 0)::numeric, 2)
            END AS outstanding_novo
        FROM public.loans l
        LEFT JOIN principal_por_loan pp ON pp.loan_id = l.id
        LEFT JOIN cobrancas_abertas ca ON ca.loan_id = l.id
        LEFT JOIN pago_por_loan pg ON pg.loan_id = l.id
        WHERE l.tenant_id = v_tenant
    )
    UPDATE public.loans l
    SET outstanding_amount = calc.outstanding_novo,
        updated_at = now()
    FROM calc
    WHERE l.id = calc.loan_id
      AND ABS(COALESCE(l.outstanding_amount, 0) - calc.outstanding_novo) > 0.02;
    GET DIAGNOSTICS n_g = ROW_COUNT;

    RAISE NOTICE
        'Batimento tenant % corrigido => B:%, C:%, D:%, F:%, G:%',
        v_tenant, n_b, n_c, n_d, n_f, n_g;
END $$;


-- ============================================================================
-- PASSO 3: VALIDAÇÃO — tipos D/F/B/C devem zerar; G deve zerar após recalc
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
principal_por_loan AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(
            COALESCE((elem->>'principalPaid')::numeric, (elem->>'principal_paid')::numeric, 0)
        ), 0) AS capital_pago
    FROM public.installments i
    CROSS JOIN params p
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(i.payment_history, '[]'::jsonb)) elem ON TRUE
    WHERE i.tenant_id = p.tenant_id
    GROUP BY i.loan_id
),
cobrancas_abertas AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)), 0) AS aberto
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status <> 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
    GROUP BY i.loan_id
),
pago_por_loan AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(COALESCE(i.amount_paid, 0)), 0) AS total_pago
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
    GROUP BY i.loan_id
),
inconsistencias AS (
    SELECT 'D_vencida_ainda_pending' AS tipo
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PENDING'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL
    SELECT 'F_emprestimo_paid_com_valor_aberto'
    FROM public.loans l
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
      AND upper(l.status) = 'PAID'
      AND COALESCE(l.outstanding_amount, 0) > 0.01

    UNION ALL
    SELECT 'B_valor_quitado_status_nao_paid'
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'

    UNION ALL
    SELECT 'C_status_paid_com_saldo'
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND i.status = 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.amount > 0

    UNION ALL
    SELECT 'G_outstanding_ainda_divergente'
    FROM public.loans l
    CROSS JOIN params p
    LEFT JOIN principal_por_loan pp ON pp.loan_id = l.id
    LEFT JOIN cobrancas_abertas ca ON ca.loan_id = l.id
    LEFT JOIN pago_por_loan pg ON pg.loan_id = l.id
    WHERE l.tenant_id = p.tenant_id
      AND ABS(
            COALESCE(l.outstanding_amount, 0)
            - CASE
                WHEN upper(l.status) = 'PAID'
                     AND NOT EXISTS (
                         SELECT 1 FROM public.installments i
                         WHERE i.loan_id = l.id
                           AND i.status <> 'PAID'
                           AND COALESCE(i.amount_paid, 0) < i.amount
                     )
                    THEN 0::numeric
                WHEN upper(COALESCE(l.model, 'PRICE')) = 'INTEREST_ONLY' THEN
                    ROUND((
                        GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                        + GREATEST(
                            ROUND(GREATEST(l.amount - COALESCE(pp.capital_pago, 0), 0)
                                  * (l.interest_rate / 100.0), 2),
                            COALESCE(ca.aberto, 0)
                        )
                    )::numeric, 2)
                ELSE
                    ROUND(GREATEST(l.total_amount - COALESCE(pg.total_pago, 0), 0)::numeric, 2)
              END
          ) > 0.02
)
SELECT tipo, COUNT(*) AS qtd_restante
FROM inconsistencias
GROUP BY tipo
ORDER BY qtd_restante DESC;
-- Esperado: 0 linhas (ou só tipos que não foram auto-corrigidos)


-- ============================================================================
-- PASSO 4 (SÓ LEITURA): casos J e K — NÃO corrigir no automático
-- ============================================================================

-- J) total_amount ≠ soma das parcelas (PRICE)
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT
    c.nome AS cliente,
    l.id AS loan_id,
    l.model,
    upper(l.status) AS status,
    l.total_amount,
    COALESCE(s.soma_parcelas, 0) AS soma_parcelas,
    ROUND((l.total_amount - COALESCE(s.soma_parcelas, 0))::numeric, 2) AS delta,
    s.qtd_parcelas
FROM public.loans l
JOIN public.clients c ON c.id = l.client_id
CROSS JOIN params p
LEFT JOIN LATERAL (
    SELECT
        SUM(i.amount) AS soma_parcelas,
        COUNT(*) AS qtd_parcelas
    FROM public.installments i
    WHERE i.loan_id = l.id
) s ON TRUE
WHERE l.tenant_id = p.tenant_id
  AND upper(COALESCE(l.model, 'PRICE')) = 'PRICE'
  AND ABS(l.total_amount - COALESCE(s.soma_parcelas, 0)) > 0.02
ORDER BY ABS(l.total_amount - COALESCE(s.soma_parcelas, 0)) DESC;


-- K) amount_paid > amount (pode ser amortização INTEREST_ONLY intencional)
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT
    c.nome AS cliente,
    l.model,
    i.id AS installment_id,
    i.number AS parcela,
    i.amount,
    i.amount_paid,
    ROUND((i.amount_paid - i.amount)::numeric, 2) AS excesso,
    i.status
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans l ON l.id = i.loan_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND COALESCE(i.amount_paid, 0) > i.amount + 0.02
ORDER BY (i.amount_paid - i.amount) DESC, c.nome;
