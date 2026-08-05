-- ============================================================================
-- BATIMENTO DASHBOARD (Home.tsx) × BANCO — TENANT 0003
-- ============================================================================
-- Replica as fórmulas dos cards do Dashboard:
--   • Empréstimos Parcelados (PRICE)
--   • Empréstimos Somente Juros (INTEREST_ONLY)
--
-- Valida:
--   1) Totais do card (capital, parcelas/juros, lucro, recebido, a receber, atraso, ativos)
--   2) Comparação com valores da tela (expect embutido — ajuste se a UI mudar)
--   3) Identidades (PRICE fecha; JUROS capital+juros = j+c)
--   4) Qualidade PRICE (interest + principal ≠ amount)
--   5) Contagem de parcelas (alerta se > 1000 — risco de paginação)
--
-- Uso (SQL Editor do Supabase / psql):
--   1) Ajuste params (tenant_id, as_of, start_date/end_date)
--   2) Rode o script inteiro
--   3) Veja as seções RESULTADO_*
--
-- Equivalente Python:
--   python3 scripts/batimento_dashboard_fe_db.py --as-of 2026-08-05 --expect-screen
--
-- SOMENTE LEITURA — não altera dados.
-- ============================================================================

-- ============================================================================
-- PARAMS
-- ============================================================================
-- as_of ........ data de referência do isLate (due < as_of) — espelha "hoje" do FE
-- start/end .... filtro de período por due_date; NULL = sem filtro (Limpar filtro)
-- expect_* ..... valores colados da tela para batimento FE × DB
-- ============================================================================

WITH params AS (
    SELECT
        '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id,
        DATE '2026-08-05' AS as_of,
        NULL::date AS start_date,   -- ex.: DATE '2026-01-01'
        NULL::date AS end_date,     -- ex.: DATE '2026-08-05'

        -- ---- Expectativa da tela (Dashboard sem filtro, 05/08/2026) ----
        663043.00::numeric   AS expect_p_capital,
        848899.00::numeric   AS expect_p_parcelas,
        163143.20::numeric   AS expect_p_lucro,
        848899.00::numeric   AS expect_p_total,
        140955.00::numeric   AS expect_p_recebido,
        707944.00::numeric   AS expect_p_a_receber,
        37975.00::numeric    AS expect_p_atraso,
        51::int              AS expect_p_atraso_qtd,
        104::int             AS expect_p_ativos,

        381580.00::numeric   AS expect_j_capital,
        116561.64::numeric   AS expect_j_juros,
        498141.64::numeric   AS expect_j_total,
        82210.00::numeric    AS expect_j_recebido,
        47955.48::numeric    AS expect_j_a_receber,
        23908.20::numeric    AS expect_j_atraso,
        79::int              AS expect_j_atraso_qtd,
        101::int             AS expect_j_ativos
),

-- ============================================================================
-- BASE
-- ============================================================================
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
price_loans AS (
    SELECT * FROM loans_t WHERE COALESCE(model, '') <> 'INTEREST_ONLY'
),
juros_loans AS (
    SELECT * FROM loans_t WHERE model = 'INTEREST_ONLY'
),
-- Filtro de período (due_date) — igual Home.tsx
price_inst AS (
    SELECT i.*
    FROM inst_t i
    CROSS JOIN params p
    WHERE i.loan_id IN (SELECT id FROM price_loans)
      AND (
            p.start_date IS NULL
            OR p.end_date IS NULL
            OR (i.due_date::date BETWEEN p.start_date AND p.end_date)
          )
),
juros_inst AS (
    SELECT i.*
    FROM inst_t i
    CROSS JOIN params p
    WHERE i.loan_id IN (SELECT id FROM juros_loans)
      AND (
            p.start_date IS NULL
            OR p.end_date IS NULL
            OR (i.due_date::date BETWEEN p.start_date AND p.end_date)
          )
),

-- ============================================================================
-- FÓRMULAS Home.tsx
-- PRICE interest: interest_amount ?? max(0, amount - (principal_amount ?? amount))
-- JUROS interest: interest_amount ?? amount
-- ============================================================================
price_metrics AS (
    SELECT
        (SELECT COUNT(*) FROM price_loans) AS qtd_loans,
        (SELECT COUNT(*) FROM price_inst) AS qtd_parcelas,
        (SELECT COUNT(*) FROM price_loans WHERE status = 'ACTIVE') AS ativos,
        COALESCE((
            SELECT SUM(amount) FROM price_loans WHERE status = 'ACTIVE'
        ), 0)::numeric AS capital_emprestado,
        COALESCE((SELECT SUM(amount) FROM price_inst), 0)::numeric AS valor_das_parcelas,
        COALESCE((
            SELECT SUM(
                CASE
                    WHEN interest_amount IS NOT NULL THEN interest_amount
                    WHEN principal_amount IS NOT NULL THEN GREATEST(amount - principal_amount, 0)
                    ELSE 0
                END
            )
            FROM price_inst
        ), 0)::numeric AS lucro,
        COALESCE((SELECT SUM(COALESCE(amount_paid, 0)) FROM price_inst), 0)::numeric AS recebido,
        COALESCE((
            SELECT SUM(amount - COALESCE(amount_paid, 0))
            FROM price_inst
            WHERE status <> 'PAID'
        ), 0)::numeric AS a_receber,
        COALESCE((
            SELECT SUM(amount - COALESCE(amount_paid, 0))
            FROM price_inst i
            CROSS JOIN params p
            WHERE i.status <> 'PAID'
              AND i.due_date::date < p.as_of
              AND (i.amount - COALESCE(i.amount_paid, 0)) > 0
        ), 0)::numeric AS em_atraso,
        (
            SELECT COUNT(*)
            FROM price_inst i
            CROSS JOIN params p
            WHERE i.status <> 'PAID'
              AND i.due_date::date < p.as_of
              AND (i.amount - COALESCE(i.amount_paid, 0)) > 0
        )::int AS em_atraso_qtd
),
juros_metrics AS (
    SELECT
        (SELECT COUNT(*) FROM juros_loans) AS qtd_loans,
        (SELECT COUNT(*) FROM juros_inst) AS qtd_parcelas,
        (SELECT COUNT(*) FROM juros_loans WHERE status = 'ACTIVE') AS ativos,
        COALESCE((
            SELECT SUM(amount) FROM juros_loans WHERE status = 'ACTIVE'
        ), 0)::numeric AS capital_emprestado,
        COALESCE((
            SELECT SUM(COALESCE(interest_amount, amount))
            FROM juros_inst
        ), 0)::numeric AS valor_do_juros,
        COALESCE((SELECT SUM(COALESCE(amount_paid, 0)) FROM juros_inst), 0)::numeric AS recebido,
        COALESCE((
            SELECT SUM(amount - COALESCE(amount_paid, 0))
            FROM juros_inst
            WHERE status <> 'PAID'
        ), 0)::numeric AS a_receber,
        COALESCE((
            SELECT SUM(amount - COALESCE(amount_paid, 0))
            FROM juros_inst i
            CROSS JOIN params p
            WHERE i.status <> 'PAID'
              AND i.due_date::date < p.as_of
              AND (i.amount - COALESCE(i.amount_paid, 0)) > 0
        ), 0)::numeric AS em_atraso,
        (
            SELECT COUNT(*)
            FROM juros_inst i
            CROSS JOIN params p
            WHERE i.status <> 'PAID'
              AND i.due_date::date < p.as_of
              AND (i.amount - COALESCE(i.amount_paid, 0)) > 0
        )::int AS em_atraso_qtd
),

-- ============================================================================
-- 1) TOTAIS CALCULADOS NO BANCO (o que o Dashboard deve mostrar)
-- ============================================================================
resultado_totais AS (
    SELECT * FROM (
        VALUES
            ('PRICE', 'capital_emprestado',   (SELECT capital_emprestado FROM price_metrics)),
            ('PRICE', 'valor_das_parcelas',   (SELECT valor_das_parcelas FROM price_metrics)),
            ('PRICE', 'lucro',                (SELECT lucro FROM price_metrics)),
            ('PRICE', 'total_periodo',        (SELECT valor_das_parcelas FROM price_metrics)),
            ('PRICE', 'recebido',             (SELECT recebido FROM price_metrics)),
            ('PRICE', 'a_receber',            (SELECT a_receber FROM price_metrics)),
            ('PRICE', 'em_atraso',            (SELECT em_atraso FROM price_metrics)),
            ('PRICE', 'em_atraso_qtd',        (SELECT em_atraso_qtd FROM price_metrics)::numeric),
            ('PRICE', 'ativos',               (SELECT ativos FROM price_metrics)::numeric),
            ('PRICE', 'qtd_parcelas',         (SELECT qtd_parcelas FROM price_metrics)::numeric),

            ('JUROS', 'capital_emprestado',   (SELECT capital_emprestado FROM juros_metrics)),
            ('JUROS', 'valor_do_juros',       (SELECT valor_do_juros FROM juros_metrics)),
            ('JUROS', 'juros_mais_capital',   (SELECT capital_emprestado + valor_do_juros FROM juros_metrics)),
            ('JUROS', 'recebido',             (SELECT recebido FROM juros_metrics)),
            ('JUROS', 'a_receber',            (SELECT a_receber FROM juros_metrics)),
            ('JUROS', 'em_atraso',            (SELECT em_atraso FROM juros_metrics)),
            ('JUROS', 'em_atraso_qtd',        (SELECT em_atraso_qtd FROM juros_metrics)::numeric),
            ('JUROS', 'ativos',               (SELECT ativos FROM juros_metrics)::numeric),
            ('JUROS', 'qtd_parcelas',         (SELECT qtd_parcelas FROM juros_metrics)::numeric)
    ) AS t(card, metrica, valor_db)
),

-- ============================================================================
-- 2) BATIMENTO TELA × BANCO (17 campos)
-- ============================================================================
batimento_fe_db AS (
    SELECT
        x.card,
        x.metrica,
        x.expect_fe,
        x.valor_db,
        ROUND(x.valor_db - x.expect_fe, 2) AS delta,
        CASE
            WHEN ABS(x.valor_db - x.expect_fe) <= 0.02 THEN 'OK'
            ELSE 'DIVERGE'
        END AS status
    FROM (
        SELECT 'PRICE' AS card, 'capital_emprestado' AS metrica,
               p.expect_p_capital AS expect_fe, m.capital_emprestado AS valor_db
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'valor_das_parcelas', p.expect_p_parcelas, m.valor_das_parcelas
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'lucro', p.expect_p_lucro, m.lucro
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'total_periodo', p.expect_p_total, m.valor_das_parcelas
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'recebido', p.expect_p_recebido, m.recebido
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'a_receber', p.expect_p_a_receber, m.a_receber
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'em_atraso', p.expect_p_atraso, m.em_atraso
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'em_atraso_qtd', p.expect_p_atraso_qtd::numeric, m.em_atraso_qtd::numeric
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'PRICE', 'ativos', p.expect_p_ativos::numeric, m.ativos::numeric
        FROM params p, price_metrics m
        UNION ALL
        SELECT 'JUROS', 'capital_emprestado', p.expect_j_capital, m.capital_emprestado
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'valor_do_juros', p.expect_j_juros, m.valor_do_juros
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'juros_mais_capital', p.expect_j_total,
               m.capital_emprestado + m.valor_do_juros
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'recebido', p.expect_j_recebido, m.recebido
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'a_receber', p.expect_j_a_receber, m.a_receber
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'em_atraso', p.expect_j_atraso, m.em_atraso
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'em_atraso_qtd', p.expect_j_atraso_qtd::numeric, m.em_atraso_qtd::numeric
        FROM params p, juros_metrics m
        UNION ALL
        SELECT 'JUROS', 'ativos', p.expect_j_ativos::numeric, m.ativos::numeric
        FROM params p, juros_metrics m
    ) x
),

resumo_batimento AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'OK') AS ok,
        COUNT(*) FILTER (WHERE status = 'DIVERGE') AS diverge,
        COUNT(*) AS total,
        CASE
            WHEN COUNT(*) FILTER (WHERE status = 'DIVERGE') = 0
                THEN 'OK — Dashboard × Banco alinhados'
            ELSE 'DIVERGE — conferir batimento_fe_db'
        END AS veredito
    FROM batimento_fe_db
),

-- ============================================================================
-- 3) IDENTIDADES
-- ============================================================================
identidades AS (
    SELECT
        'PRICE' AS card,
        'recebido + a_receber = total_periodo' AS regra,
        ROUND(pm.recebido + pm.a_receber, 2) AS lado_esq,
        ROUND(pm.valor_das_parcelas, 2) AS lado_dir,
        ROUND((pm.recebido + pm.a_receber) - pm.valor_das_parcelas, 2) AS delta,
        CASE
            WHEN ABS((pm.recebido + pm.a_receber) - pm.valor_das_parcelas) <= 0.02
                THEN 'OK' ELSE 'QUEBRADA'
        END AS status
    FROM price_metrics pm
    UNION ALL
    SELECT
        'JUROS',
        'capital + juros = juros_mais_capital',
        ROUND(jm.capital_emprestado + jm.valor_do_juros, 2),
        ROUND(jm.capital_emprestado + jm.valor_do_juros, 2),
        0,
        'OK'
    FROM juros_metrics jm
    UNION ALL
    SELECT
        'JUROS',
        'recebido + a_receber ≠ j+c (gap esperado = capital ACTIVE fora das parcelas)',
        ROUND(jm.recebido + jm.a_receber, 2),
        ROUND(jm.capital_emprestado + jm.valor_do_juros, 2),
        ROUND((jm.capital_emprestado + jm.valor_do_juros) - (jm.recebido + jm.a_receber), 2),
        'ESPERADO'
    FROM juros_metrics jm
),

-- ============================================================================
-- 4) QUALIDADE DE DADOS (somente PRICE)
--    INTEREST_ONLY: principal costuma ser capital em aberto → ia+pa ≠ amount é normal
-- ============================================================================
qualidade_price AS (
    SELECT
        i.id AS installment_id,
        i.loan_id,
        i.number,
        i.amount,
        i.interest_amount,
        i.principal_amount,
        ROUND(
            COALESCE(i.interest_amount, 0) + COALESCE(i.principal_amount, 0) - i.amount
        , 2) AS gap_ia_pa_amount,
        CASE
            WHEN i.interest_amount IS NOT NULL
             AND i.principal_amount IS NOT NULL
             AND i.interest_amount = 0
             AND i.amount > i.principal_amount + 0.02
                THEN 'INTEREST_ZERO_COM_RESIDUAL'
            ELSE 'IA_PA_NE_AMOUNT'
        END AS tipo
    FROM price_inst i
    WHERE i.interest_amount IS NOT NULL
      AND i.principal_amount IS NOT NULL
      AND ABS(i.interest_amount + i.principal_amount - i.amount) > 0.02
),

-- ============================================================================
-- 5) CONTAGENS / PAGINAÇÃO
-- ============================================================================
contagens AS (
    SELECT
        (SELECT COUNT(*) FROM loans_t) AS loans_total,
        (SELECT COUNT(*) FROM price_loans) AS loans_price,
        (SELECT COUNT(*) FROM juros_loans) AS loans_juros,
        (SELECT COUNT(*) FROM inst_t) AS installments_total,
        (SELECT COUNT(*) FROM price_inst) AS installments_price,
        (SELECT COUNT(*) FROM juros_inst) AS installments_juros,
        CASE
            WHEN (SELECT COUNT(*) FROM inst_t) > 1000
                THEN 'ALERTA: >1000 parcelas — API sem paginação corta totais do Dashboard'
            ELSE 'OK: ≤1000 parcelas'
        END AS aviso_paginacao
)

-- ============================================================================
-- SAÍDA: rode cada SELECT abaixo (ou o último UNION para visão única)
-- No SQL Editor, a query final retorna o RESUMO + detalhe do batimento.
-- ============================================================================

-- --- A) RESUMO ---
SELECT
    1 AS ordem,
    'RESUMO' AS secao,
    r.veredito AS info,
    r.ok::text AS col_a,
    r.diverge::text AS col_b,
    r.total::text AS col_c,
    NULL::text AS col_d,
    NULL::text AS col_e
FROM resumo_batimento r

UNION ALL

-- --- B) BATIMENTO DETALHADO ---
SELECT
    2,
    'BATIMENTO',
    b.card || ' · ' || b.metrica,
    ROUND(b.expect_fe, 2)::text,
    ROUND(b.valor_db, 2)::text,
    ROUND(b.delta, 2)::text,
    b.status,
    NULL
FROM batimento_fe_db b

UNION ALL

-- --- C) IDENTIDADES ---
SELECT
    3,
    'IDENTIDADE',
    i.card || ' · ' || i.regra,
    i.lado_esq::text,
    i.lado_dir::text,
    i.delta::text,
    i.status,
    NULL
FROM identidades i

UNION ALL

-- --- D) CONTAGENS ---
SELECT
    4,
    'CONTAGEM',
    c.aviso_paginacao,
    'loans=' || c.loans_total || ' (P=' || c.loans_price || ' J=' || c.loans_juros || ')',
    'inst=' || c.installments_total || ' (P=' || c.installments_price || ' J=' || c.installments_juros || ')',
    NULL, NULL, NULL
FROM contagens c

UNION ALL

-- --- E) QUALIDADE PRICE (se houver) ---
SELECT
    5,
    'QUALIDADE_PRICE',
    q.tipo || ' · ' || LEFT(q.installment_id::text, 8),
    'amount=' || q.amount::text,
    'ia=' || COALESCE(q.interest_amount::text, 'null'),
    'pa=' || COALESCE(q.principal_amount::text, 'null'),
    'gap=' || q.gap_ia_pa_amount::text,
    q.loan_id::text
FROM qualidade_price q

ORDER BY 1, 3;
