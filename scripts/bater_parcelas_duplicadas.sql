-- ============================================================================
-- BATIMENTO: qual parcela duplicada é a CORRETA?
-- Tenant: 00000000-0000-0000-0000-000000000003
-- ============================================================================
-- Como decidir (ordem de evidência):
--   1. Tem payment_history com lançamentos? → dinheiro real registrado
--   2. amount_paid > 0 / status PAID|PARTIAL?
--   3. amount_paid bate com a soma do payment_history?
--   4. Em clone exato (mesma data+valor): manter a com mais evidência;
--      se empatar, manter a mais ANTIGA (created_at)
--   5. Em colisão de número (datas diferentes): em geral NÃO apagar —
--      as duas podem ser meses reais; o erro é a NUMERAÇÃO.
-- ============================================================================
-- Nota INTEREST_ONLY: installments_count=1 no contrato é normal.
-- Novas parcelas vão sendo criadas mês a mês; "diferença" alta NÃO
-- significa sozinha que há lixo (só clones/colisões de número importam).
-- ============================================================================

WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
dup_keys AS (
    SELECT
        i.loan_id,
        i.number,
        COUNT(*) AS qtd_no_grupo,
        COUNT(DISTINCT i.due_date) AS vencimentos_distintos,
        COUNT(DISTINCT i.amount) AS valores_distintos
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
    GROUP BY i.loan_id, i.number
    HAVING COUNT(*) > 1
),
scored AS (
    SELECT
        i.id,
        i.tenant_id,
        i.client_id,
        COALESCE(c.nome_completo, c.nome) AS cliente,
        i.loan_id,
        l.model AS modelo_emprestimo,
        l.installments_count AS qtd_prevista_contrato,
        l.start_date AS inicio_contrato,
        i.number AS parcela,
        i.due_date,
        i.amount,
        i.amount_paid,
        i.status,
        i.paid_date,
        i.created_at,
        i.updated_at,
        d.qtd_no_grupo,
        d.vencimentos_distintos,
        d.valores_distintos,
        COALESCE(jsonb_array_length(i.payment_history), 0) AS qtd_pagamentos_hist,
        COALESCE((
            SELECT SUM(COALESCE((e->>'amount')::numeric, 0))
            FROM jsonb_array_elements(COALESCE(i.payment_history, '[]'::jsonb)) e
        ), 0) AS soma_payment_history,
        (
            CASE WHEN COALESCE(jsonb_array_length(i.payment_history), 0) > 0 THEN 100 ELSE 0 END
          + CASE WHEN COALESCE(i.amount_paid, 0) > 0 THEN 40 ELSE 0 END
          + CASE
                WHEN i.status = 'PAID' THEN 30
                WHEN i.status = 'PARTIAL' THEN 20
                WHEN i.status = 'LATE' THEN 10
                ELSE 0
            END
          + CASE
                WHEN ABS(
                    COALESCE(i.amount_paid, 0)
                    - COALESCE((
                        SELECT SUM(COALESCE((e->>'amount')::numeric, 0))
                        FROM jsonb_array_elements(COALESCE(i.payment_history, '[]'::jsonb)) e
                      ), 0)
                ) < 0.01
                     AND COALESCE(i.amount_paid, 0) > 0
                THEN 20
                ELSE 0
            END
          + (1.0 / (1 + EXTRACT(EPOCH FROM (now() - i.created_at)) / 86400.0))
        ) AS score_corretude
    FROM public.installments i
    CROSS JOIN params p
    INNER JOIN dup_keys d
        ON d.loan_id = i.loan_id
       AND d.number = i.number
    LEFT JOIN public.clients c ON c.id = i.client_id
    LEFT JOIN public.loans l ON l.id = i.loan_id
    WHERE i.tenant_id = p.tenant_id
),
-- sombra: outra parcela no mesmo loan+due_date com pagamento
shadow_paid AS (
    SELECT DISTINCT
        s.id
    FROM scored s
    INNER JOIN scored s2
        ON s2.loan_id = s.loan_id
       AND s2.due_date = s.due_date
       AND s2.id <> s.id
       AND (s2.qtd_pagamentos_hist > 0 OR COALESCE(s2.amount_paid, 0) > 0)
    WHERE s.status IN ('PENDING', 'LATE')
),
ranked AS (
    SELECT
        s.*,
        CASE
            WHEN s.vencimentos_distintos = 1 AND s.valores_distintos = 1 THEN 'CLONE_EXATO'
            ELSE 'COLISAO_NUMERO'
        END AS tipo_conflito,
        ROW_NUMBER() OVER (
            PARTITION BY s.loan_id, s.number, s.due_date, s.amount
            ORDER BY s.score_corretude DESC, s.created_at ASC, s.id ASC
        ) AS rn_clone,
        ROW_NUMBER() OVER (
            PARTITION BY s.loan_id
            ORDER BY s.due_date ASC, s.score_corretude DESC, s.created_at ASC
        ) AS numero_sugerido_por_vencimento,
        EXISTS (SELECT 1 FROM shadow_paid sp WHERE sp.id = s.id) AS eh_sombra_de_paga
    FROM scored s
)
SELECT
    tipo_conflito,
    cliente,
    loan_id,
    modelo_emprestimo,
    qtd_prevista_contrato,
    parcela AS numero_atual,
    due_date,
    amount,
    amount_paid,
    status,
    qtd_pagamentos_hist,
    soma_payment_history,
    ROUND(score_corretude::numeric, 2) AS score,
    id AS installment_id,
    created_at,
    CASE
        WHEN tipo_conflito = 'CLONE_EXATO' AND rn_clone = 1 THEN 'MANTER'
        WHEN tipo_conflito = 'CLONE_EXATO' AND rn_clone > 1 THEN 'REMOVER (clone)'
        WHEN tipo_conflito = 'COLISAO_NUMERO' AND qtd_pagamentos_hist > 0
            THEN 'MANTER (tem pagamento) — RENUMERAR'
        WHEN tipo_conflito = 'COLISAO_NUMERO' AND amount_paid > 0
            THEN 'MANTER (tem amount_paid) — RENUMERAR'
        WHEN tipo_conflito = 'COLISAO_NUMERO' AND eh_sombra_de_paga
            THEN 'REVISAR — possível sombra de parcela já paga'
        WHEN tipo_conflito = 'COLISAO_NUMERO'
            THEN 'MANTER — RENUMERAR por vencimento'
        ELSE 'REVISAR MANUAL'
    END AS acao_sugerida,
    CASE
        WHEN tipo_conflito = 'COLISAO_NUMERO' THEN numero_sugerido_por_vencimento
        ELSE parcela
    END AS numero_sugerido
FROM ranked
ORDER BY
    tipo_conflito,
    cliente,
    loan_id,
    due_date,
    score DESC;


-- ============================================================================
-- RESUMO por empréstimo (só loans com número duplicado)
-- PRICE: diferença > 0 costuma indicar clones
-- INTEREST_ONLY: installments_count=1 é esperado; foque em clones, não na diferença
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
),
dup_loans AS (
    SELECT DISTINCT x.loan_id
    FROM public.installments x
    CROSS JOIN params p
    WHERE x.tenant_id = p.tenant_id
    GROUP BY x.loan_id, x.number
    HAVING COUNT(*) > 1
),
clone_stats AS (
    SELECT
        i.loan_id,
        COUNT(*) - COUNT(DISTINCT (i.number, i.due_date, i.amount)) AS linhas_clone_exatas_extras
    FROM public.installments i
    INNER JOIN dup_loans d ON d.loan_id = i.loan_id
    GROUP BY i.loan_id
)
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    l.id AS loan_id,
    l.model,
    l.installments_count AS previstas_no_contrato,
    COUNT(i.id) AS parcelas_no_banco,
    COUNT(i.id) - l.installments_count AS diferenca_vs_contrato,
    cs.linhas_clone_exatas_extras,
    COUNT(*) FILTER (WHERE i.status = 'PAID') AS pagas,
    COUNT(*) FILTER (WHERE i.status <> 'PAID') AS abertas,
    ROUND(SUM(i.amount)::numeric, 2) AS soma_parcelas,
    ROUND(l.total_amount::numeric, 2) AS total_contrato,
    CASE
        WHEN l.model = 'INTEREST_ONLY' THEN 'IO: qtd>1 é normal; limpe só clones'
        WHEN cs.linhas_clone_exatas_extras > 0 THEN 'PRICE: tem clone exato para remover'
        ELSE 'PRICE: revisar colisão de número / renumerar'
    END AS leitura
FROM public.loans l
CROSS JOIN params p
INNER JOIN dup_loans d ON d.loan_id = l.id
LEFT JOIN clone_stats cs ON cs.loan_id = l.id
LEFT JOIN public.clients c ON c.id = l.client_id
LEFT JOIN public.installments i ON i.loan_id = l.id
WHERE l.tenant_id = p.tenant_id
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    l.id,
    l.model,
    l.installments_count,
    l.total_amount,
    cs.linhas_clone_exatas_extras
ORDER BY cs.linhas_clone_exatas_extras DESC NULLS LAST, cliente;
