-- ============================================================================
-- VERIFICAR PARCELAS DUPLICADAS DOS CLIENTES (v2 — classificada)
-- ============================================================================
-- Tenant foco (descomente onde indicado):
--   00000000-0000-0000-0000-000000000003
--
-- Tipos:
--   CLONE_EXATO     = mesmo loan + number + due_date (+ amount) → limpar
--   COLISAO_NUMERO  = mesmo loan + number, mas due_dates diferentes
--                     (geralmente regeneração de cronograma / rollover)
-- ============================================================================

-- ============================================================================
-- 0) CONTAGEM POR TIPO
-- ============================================================================
WITH grupos AS (
    SELECT
        tenant_id,
        loan_id,
        number,
        COUNT(*) AS qtd,
        COUNT(DISTINCT due_date) AS qtd_vencimentos_distintos,
        COUNT(DISTINCT amount) AS qtd_valores_distintos
    FROM public.installments
    WHERE tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
    GROUP BY tenant_id, loan_id, number
    HAVING COUNT(*) > 1
)
SELECT
    COUNT(*) FILTER (
        WHERE qtd_vencimentos_distintos = 1 AND qtd_valores_distintos = 1
    ) AS clones_exatos,
    COUNT(*) FILTER (
        WHERE qtd_vencimentos_distintos > 1 OR qtd_valores_distintos > 1
    ) AS colisoes_de_numero,
    COUNT(*) AS total_grupos_duplicados
FROM grupos;


-- ============================================================================
-- 1) CLONES EXATOS (prioridade de limpeza)
--    Mesmo loan + number + due_date + amount
-- ============================================================================
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    i.client_id,
    i.loan_id,
    i.number AS parcela,
    i.due_date,
    i.amount,
    COUNT(*) AS qtd,
    ARRAY_AGG(i.id ORDER BY i.created_at) AS installment_ids,
    ARRAY_AGG(i.status ORDER BY i.created_at) AS status_list,
    ARRAY_AGG(i.amount_paid ORDER BY i.created_at) AS pagos,
    ARRAY_AGG(i.created_at ORDER BY i.created_at) AS criadas_em
FROM public.installments i
LEFT JOIN public.clients c ON c.id = i.client_id
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    i.client_id,
    i.loan_id,
    i.number,
    i.due_date,
    i.amount
HAVING COUNT(*) > 1
ORDER BY cliente, i.loan_id, i.number;


-- ============================================================================
-- 1.1) CANDIDATOS A EXCLUSÃO em clones exatos
--      Mantém a parcela "mais útil" e marca as demais como remover.
--      Regra de retenção:
--        1) preferir status PAID
--        2) senão a de maior amount_paid
--        3) senão a mais antiga (created_at)
-- ============================================================================
WITH ranked AS (
    SELECT
        i.*,
        COALESCE(c.nome_completo, c.nome) AS cliente,
        ROW_NUMBER() OVER (
            PARTITION BY i.loan_id, i.number, i.due_date, i.amount
            ORDER BY
                CASE WHEN i.status = 'PAID' THEN 0
                     WHEN i.status = 'PARTIAL' THEN 1
                     WHEN i.status = 'LATE' THEN 2
                     ELSE 3 END,
                COALESCE(i.amount_paid, 0) DESC,
                i.created_at ASC,
                i.id ASC
        ) AS rn
    FROM public.installments i
    LEFT JOIN public.clients c ON c.id = i.client_id
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
      AND EXISTS (
          SELECT 1
          FROM public.installments x
          WHERE x.tenant_id = i.tenant_id
            AND x.loan_id = i.loan_id
            AND x.number = i.number
            AND x.due_date = i.due_date
            AND x.amount = i.amount
            AND x.id <> i.id
      )
)
SELECT
    cliente,
    loan_id,
    number AS parcela,
    due_date,
    amount,
    id AS installment_id,
    status,
    amount_paid,
    created_at,
    CASE WHEN rn = 1 THEN 'MANTER' ELSE 'REMOVER' END AS acao
FROM ranked
ORDER BY cliente, loan_id, number, rn;


-- ============================================================================
-- 2) COLISÃO DE NÚMERO (datas diferentes) — revisão manual
--    Ex.: Andressa parcela 1 em 2026-05-29 e outra "1" em 2026-07-29
-- ============================================================================
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    i.client_id,
    i.loan_id,
    i.number AS parcela,
    COUNT(*) AS qtd,
    COUNT(DISTINCT i.due_date) AS vencimentos_distintos,
    ARRAY_AGG(i.id ORDER BY i.due_date, i.created_at) AS installment_ids,
    ARRAY_AGG(i.due_date ORDER BY i.due_date, i.created_at) AS vencimentos,
    ARRAY_AGG(i.status ORDER BY i.due_date, i.created_at) AS status_list,
    ARRAY_AGG(i.amount ORDER BY i.due_date, i.created_at) AS valores
FROM public.installments i
LEFT JOIN public.clients c ON c.id = i.client_id
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    i.client_id,
    i.loan_id,
    i.number
HAVING COUNT(*) > 1
   AND COUNT(DISTINCT i.due_date) > 1
ORDER BY cliente, i.loan_id, i.number;
