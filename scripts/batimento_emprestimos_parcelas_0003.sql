-- ============================================================================
-- BATIMENTO EMPRÉSTIMOS / PARCELAS — FE ↔ DB — TENANT 0003
-- ============================================================================
-- Espelha scripts/batimento_emprestimos_parcelas.py (tipos A–M).
-- SOMENTE LEITURA — não altera dados.
--
-- Uso (SQL Editor Supabase / psql):
--   1) Ajuste params (tenant_id, as_of)
--   2) Rode o script inteiro
--   3) Veja RESUMO + DETALHES
--
-- Tipos:
--   A  loan PAID com parcela pendente
--   B  parcela quitada (pago≥valor) com status ≠ PAID
--   C  status PAID com saldo
--   D  PENDING vencida → deveria LATE
--   E  loan ACTIVE sem parcela pendente → deveria PAID
--   F  loan PAID com outstanding > 0
--   G  outstanding_amount ≠ fórmula canônica (loanBalances.ts)
--   H  fórmula Histórico ≠ Listagem Empréstimos (INTEREST_ONLY)
--   I  status DB ≠ status FE canônico
--   J  PRICE: total_amount ≠ Σ parcelas.amount
--   K  amount_paid > amount
--   L  Σ payment_history ≠ amount_paid
--   M  loan sem parcelas
-- ============================================================================

WITH params AS (
    SELECT
        '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id,
        CURRENT_DATE AS as_of   -- isLate = due_date < as_of
),

loans_t AS (
    SELECT l.*
    FROM public.loans l
    CROSS JOIN params p
    WHERE l.tenant_id = p.tenant_id
),
inst_t AS (
    SELECT i.*
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
),
clients_t AS (
    SELECT
        c.id,
        COALESCE(c.nome_completo, c.nome, '(sem cliente)') AS cliente
    FROM public.clients c
    CROSS JOIN params p
    WHERE c.tenant_id = p.tenant_id
),

-- ---------------------------------------------------------------------------
-- Agregados por loan
-- ---------------------------------------------------------------------------
loan_agg AS (
    SELECT
        l.id AS loan_id,
        l.client_id,
        l.model,
        upper(COALESCE(l.status, '')) AS status_db,
        COALESCE(l.amount, 0)::numeric AS capital,
        COALESCE(l.interest_rate, 0)::numeric AS taxa,
        COALESCE(l.total_amount, 0)::numeric AS total_amount,
        COALESCE(l.outstanding_amount, 0)::numeric AS outstanding_db,
        -- Igual Python: installments_count OR len(related) OR 1 (não GREATEST)
        COALESCE(
            NULLIF(l.installments_count, 0),
            NULLIF(COUNT(i.id), 0),
            1
        )::int AS installments_count,
        COUNT(i.id) AS qtd_parcelas,
        -- PRICE display status (Python): todas as parcelas status=PAID (ou amount<=0)
        BOOL_AND(
            i.id IS NULL
            OR upper(COALESCE(i.status, '')) = 'PAID'
            OR COALESCE(i.amount, 0) <= 0
        ) AS price_todas_pagas,
        COALESCE(SUM(i.amount), 0)::numeric AS soma_parcelas,
        COALESCE(SUM(COALESCE(i.amount_paid, 0)), 0)::numeric AS total_pago,
        COALESCE(SUM(
            CASE
                WHEN upper(COALESCE(i.status, '')) <> 'PAID'
                 AND COALESCE(i.amount_paid, 0) < i.amount
                THEN GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)
                ELSE 0
            END
        ), 0)::numeric AS cobrancas_abertas,
        BOOL_OR(
            upper(COALESCE(i.status, '')) <> 'PAID'
            AND COALESCE(i.amount_paid, 0) < i.amount
        ) AS tem_pendente,
        COALESCE((
            SELECT SUM(
                COALESCE(
                    (e->>'principalPaid')::numeric,
                    (e->>'principal_paid')::numeric,
                    0
                )
            )
            FROM public.installments ix
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(COALESCE(ix.payment_history, '[]'::jsonb)) = 'array'
                        THEN ix.payment_history
                    ELSE '[]'::jsonb
                END
            ) e
            WHERE ix.loan_id = l.id
        ), 0)::numeric AS capital_pago
    FROM loans_t l
    LEFT JOIN inst_t i ON i.loan_id = l.id
    GROUP BY
        l.id, l.client_id, l.model, l.status, l.amount, l.interest_rate,
        l.total_amount, l.outstanding_amount, l.installments_count
),

-- ---------------------------------------------------------------------------
-- Fórmulas FE
-- ---------------------------------------------------------------------------
loan_fe AS (
    SELECT
        a.*,
        GREATEST(a.capital - a.capital_pago, 0)::numeric AS capital_pendente,
        -- PRICE outstanding = total_amount - total_pago
        ROUND(GREATEST(a.total_amount - a.total_pago, 0), 2) AS fe_price,
        -- INTEREST_ONLY canônico (loanBalances.ts)
        ROUND(
            GREATEST(a.capital - a.capital_pago, 0)
            + GREATEST(
                ROUND(GREATEST(a.capital - a.capital_pago, 0) * (a.taxa / 100.0), 2),
                a.cobrancas_abertas
              ),
            2
        ) AS fe_io_canon,
        -- INTEREST_ONLY Loans.tsx (ceil * installments_count)
        ROUND(
            GREATEST(a.capital - a.capital_pago, 0)
            + CEIL(GREATEST(a.capital - a.capital_pago, 0) * (a.taxa / 100.0))
              * a.installments_count,
            2
        ) AS fe_io_loans_tsx,
        CASE
            WHEN a.qtd_parcelas = 0 THEN 'ACTIVE'
            WHEN upper(COALESCE(a.model, 'PRICE')) = 'INTEREST_ONLY' THEN
                CASE
                    WHEN a.capital_pago >= a.capital AND NOT COALESCE(a.tem_pendente, FALSE)
                        THEN 'PAID'
                    ELSE 'ACTIVE'
                END
            ELSE
                -- display_status_canonical PRICE: all(status=PAID), NÃO tem_pendente
                CASE
                    WHEN COALESCE(a.price_todas_pagas, FALSE) THEN 'PAID'
                    ELSE 'ACTIVE'
                END
        END AS fe_status
    FROM loan_agg a
),
loan_fe2 AS (
    SELECT
        f.*,
        CASE
            WHEN f.status_db = 'PAID' AND NOT COALESCE(f.tem_pendente, FALSE) THEN 0::numeric
            WHEN f.qtd_parcelas = 0 THEN f.total_amount
            WHEN upper(COALESCE(f.model, 'PRICE')) = 'INTEREST_ONLY' THEN f.fe_io_canon
            ELSE f.fe_price
        END AS fe_canon,
        CASE
            WHEN f.status_db = 'PAID' THEN 0::numeric
            WHEN f.qtd_parcelas = 0 THEN f.total_amount
            WHEN upper(COALESCE(f.model, 'PRICE')) = 'INTEREST_ONLY' THEN f.fe_io_loans_tsx
            ELSE f.fe_price
        END AS fe_loans_tsx
    FROM loan_fe f
),

-- ---------------------------------------------------------------------------
-- Achados (UNION de todos os tipos)
-- ---------------------------------------------------------------------------
achados AS (

    -- A) loan PAID com parcela pendente
    SELECT
        'A_emprestimo_paid_parcela_pendente'::text AS tipo,
        'CRITICAL'::text AS severidade,
        cl.cliente,
        i.loan_id,
        i.id AS installment_id,
        format(
            'loan PAID mas parcela #%s status=%s saldo=%s',
            i.number,
            upper(i.status),
            ROUND(i.amount - COALESCE(i.amount_paid, 0), 2)
        ) AS detalhe,
        f.status_db AS db_value,
        'ACTIVE'::text AS fe_value
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    CROSS JOIN params p
    WHERE f.status_db = 'PAID'
      AND upper(COALESCE(i.status, '')) <> 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount

    UNION ALL

    -- B) quitada sem status PAID
    SELECT
        'B_valor_quitado_status_nao_paid',
        'CRITICAL',
        cl.cliente,
        i.loan_id,
        i.id,
        format(
            'parcela #%s pago=%s valor=%s status=%s',
            i.number,
            ROUND(COALESCE(i.amount_paid, 0), 2),
            ROUND(i.amount, 2),
            upper(i.status)
        ),
        upper(i.status),
        'PAID'
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE i.amount > 0
      AND COALESCE(i.amount_paid, 0) >= i.amount
      AND upper(COALESCE(i.status, '')) <> 'PAID'

    UNION ALL

    -- C) PAID com saldo
    SELECT
        'C_status_paid_com_saldo',
        'CRITICAL',
        cl.cliente,
        i.loan_id,
        i.id,
        format(
            'parcela #%s status=PAID mas saldo=%s',
            i.number,
            ROUND(i.amount - COALESCE(i.amount_paid, 0), 2)
        ),
        'PAID',
        CASE WHEN COALESCE(i.amount_paid, 0) > 0 THEN 'PARTIAL' ELSE 'PENDING' END
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE upper(COALESCE(i.status, '')) = 'PAID'
      AND i.amount > 0
      AND COALESCE(i.amount_paid, 0) < i.amount

    UNION ALL

    -- D) PENDING vencida
    SELECT
        'D_vencida_ainda_pending',
        'MEDIUM',
        cl.cliente,
        i.loan_id,
        i.id,
        format(
            'parcela #%s vencimento=%s dias_atraso=%s status=PENDING',
            i.number,
            i.due_date::date,
            (p.as_of - i.due_date::date)
        ),
        'PENDING',
        'LATE'
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    CROSS JOIN params p
    WHERE upper(COALESCE(i.status, '')) = 'PENDING'
      AND COALESCE(i.amount_paid, 0) < i.amount
      AND i.due_date::date < p.as_of

    UNION ALL

    -- E) ACTIVE sem pendência
    SELECT
        'E_emprestimo_active_sem_parcela_pendente',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        CASE
            WHEN upper(COALESCE(f.model, 'PRICE')) = 'INTEREST_ONLY'
                THEN 'ACTIVE/OPEN sem parcela pendente e capital quitado → deveria PAID'
            ELSE 'ACTIVE/OPEN sem parcela pendente → deveria PAID'
        END,
        f.status_db,
        'PAID'
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE f.status_db IN ('ACTIVE', 'OPEN')
      AND f.qtd_parcelas > 0
      AND NOT COALESCE(f.tem_pendente, FALSE)
      AND (
            upper(COALESCE(f.model, 'PRICE')) <> 'INTEREST_ONLY'
            OR f.capital_pago >= f.capital
          )

    UNION ALL

    -- F) PAID com outstanding > 0
    SELECT
        'F_emprestimo_paid_com_valor_aberto',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format('PAID com outstanding_amount=%s', ROUND(f.outstanding_db, 2)),
        ROUND(f.outstanding_db, 2)::text,
        '0'
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE f.status_db = 'PAID'
      AND f.outstanding_db > 0.02

    UNION ALL

    -- G) outstanding DB ≠ canônico
    SELECT
        'G_outstanding_db_vs_fe_canonico',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format(
            'modelo=%s status_db=%s | DB outstanding=%s ≠ FE canônico=%s (Δ=%s) | FE Loans.tsx=%s',
            COALESCE(f.model, 'PRICE'),
            f.status_db,
            ROUND(f.outstanding_db, 2),
            ROUND(f.fe_canon, 2),
            ROUND(f.outstanding_db - f.fe_canon, 2),
            ROUND(f.fe_loans_tsx, 2)
        ),
        ROUND(f.outstanding_db, 2)::text,
        ROUND(f.fe_canon, 2)::text
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE ABS(f.outstanding_db - f.fe_canon) > 0.02

    UNION ALL

    -- H) divergência fórmulas FE
    SELECT
        'H_divergencia_formulas_fe',
        'MEDIUM',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format(
            'modelo=%s | Histórico/loanBalances=%s ≠ Listagem Empréstimos=%s (Δ=%s)',
            COALESCE(f.model, 'PRICE'),
            ROUND(f.fe_canon, 2),
            ROUND(f.fe_loans_tsx, 2),
            ROUND(f.fe_canon - f.fe_loans_tsx, 2)
        ),
        ROUND(f.fe_loans_tsx, 2)::text,
        ROUND(f.fe_canon, 2)::text
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE ABS(f.fe_canon - f.fe_loans_tsx) > 0.02

    UNION ALL

    -- I) status DB ≠ FE
    SELECT
        'I_status_emprestimo_db_vs_fe',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format(
            'DB status=%s ≠ FE display=%s modelo=%s',
            f.status_db,
            f.fe_status,
            COALESCE(f.model, 'PRICE')
        ),
        f.status_db,
        f.fe_status
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE f.status_db IN ('ACTIVE', 'OPEN', 'PAID')
      AND NOT (f.status_db = 'OPEN' AND f.fe_status = 'ACTIVE')
      AND f.status_db <> f.fe_status

    UNION ALL

    -- J) PRICE total ≠ soma parcelas
    SELECT
        'J_total_amount_vs_soma_parcelas',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format(
            'total_amount=%s ≠ Σ parcelas.amount=%s (Δ=%s) qtd=%s',
            ROUND(f.total_amount, 2),
            ROUND(f.soma_parcelas, 2),
            ROUND(f.total_amount - f.soma_parcelas, 2),
            f.qtd_parcelas
        ),
        ROUND(f.total_amount, 2)::text,
        ROUND(f.soma_parcelas, 2)::text
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE upper(COALESCE(f.model, 'PRICE')) = 'PRICE'
      AND f.qtd_parcelas > 0
      AND ABS(f.soma_parcelas - f.total_amount) > 0.02

    UNION ALL

    -- K) amount_paid > amount
    SELECT
        'K_pago_maior_que_parcela',
        'MEDIUM',
        cl.cliente,
        i.loan_id,
        i.id,
        format(
            'parcela #%s amount=%s amount_paid=%s excesso=%s',
            i.number,
            ROUND(i.amount, 2),
            ROUND(COALESCE(i.amount_paid, 0), 2),
            ROUND(COALESCE(i.amount_paid, 0) - i.amount, 2)
        ),
        ROUND(COALESCE(i.amount_paid, 0), 2)::text,
        ROUND(i.amount, 2)::text
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE COALESCE(i.amount_paid, 0) > i.amount + 0.02

    UNION ALL

    -- L) Σ payment_history ≠ amount_paid
    SELECT
        'L_historico_vs_amount_paid',
        'MEDIUM',
        cl.cliente,
        i.loan_id,
        i.id,
        format(
            'parcela #%s Σ payment_history=%s ≠ amount_paid=%s',
            i.number,
            ROUND(h.hist_sum, 2),
            ROUND(COALESCE(i.amount_paid, 0), 2)
        ),
        ROUND(COALESCE(i.amount_paid, 0), 2)::text,
        ROUND(h.hist_sum, 2)::text
    FROM inst_t i
    JOIN loan_fe2 f ON f.loan_id = i.loan_id
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    CROSS JOIN LATERAL (
        SELECT COALESCE(SUM(COALESCE((e->>'amount')::numeric, 0)), 0) AS hist_sum
        FROM jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(COALESCE(i.payment_history, '[]'::jsonb)) = 'array'
                 AND jsonb_array_length(i.payment_history) > 0
                    THEN i.payment_history
                ELSE '[]'::jsonb
            END
        ) e
    ) h
    WHERE jsonb_typeof(COALESCE(i.payment_history, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(i.payment_history, '[]'::jsonb)) > 0
      AND ABS(h.hist_sum - COALESCE(i.amount_paid, 0)) > 0.02

    UNION ALL

    -- M) loan sem parcelas
    SELECT
        'M_emprestimo_sem_parcelas',
        'HIGH',
        cl.cliente,
        f.loan_id,
        NULL::uuid,
        format('status=%s amount=%s sem installments', f.status_db, ROUND(f.capital, 2)),
        '0',
        NULL
    FROM loan_fe2 f
    LEFT JOIN clients_t cl ON cl.id = f.client_id
    WHERE f.qtd_parcelas = 0
      AND f.status_db <> 'PAID'
),

resumo AS (
    SELECT
        tipo,
        severidade,
        COUNT(*) AS qtd
    FROM achados
    GROUP BY tipo, severidade
),
totais AS (
    SELECT
        (SELECT COUNT(*) FROM loans_t) AS loans,
        (SELECT COUNT(*) FROM inst_t) AS installments,
        (SELECT as_of FROM params) AS as_of,
        (SELECT COUNT(*) FROM achados) AS total_achados
)

-- ============================================================================
-- SAÍDA
-- ============================================================================
SELECT
    1 AS ordem,
    'RESUMO'::text AS secao,
    r.tipo AS info,
    r.severidade AS col_a,
    r.qtd::text AS col_b,
    NULL::text AS col_c,
    NULL::text AS col_d,
    NULL::text AS col_e
FROM resumo r

UNION ALL

SELECT
    0,
    'ESCOPO',
    'as_of=' || t.as_of::text,
    'loans=' || t.loans::text,
    'inst=' || t.installments::text,
    'achados=' || t.total_achados::text,
    NULL,
    NULL
FROM totais t

UNION ALL

SELECT
    2,
    'DETALHE',
    a.tipo || ' · ' || COALESCE(a.cliente, '?'),
    a.severidade,
    LEFT(a.loan_id::text, 8),
    COALESCE(LEFT(a.installment_id::text, 8), '-'),
    LEFT(a.detalhe, 180),
    COALESCE(a.db_value, '') || ' → ' || COALESCE(a.fe_value, '')
FROM achados a

ORDER BY 1, 3;
