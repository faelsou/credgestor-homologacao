-- ============================================================================
-- LIMPEZA DE PARCELAS DUPLICADAS — FASE A (risco zero)
-- Tenant: 00000000-0000-0000-0000-000000000003
-- ============================================================================
-- Escopo desta fase: clones exatos (mesmo loan_id + number + due_date + amount)
-- em que NENHUMA linha do grupo tem dinheiro nem acordo registrado:
--   - amount_paid = 0 (ou nulo)
--   - payment_history vazio ('[]')
--   - status apenas PENDING ou LATE
--   - sem promised_payment_*
--
-- Nesses grupos as linhas são indistinguíveis e nenhuma carrega recebimento,
-- então apagar as excedentes não altera valor recebido nem histórico.
-- Mantém-se sempre a linha mais ANTIGA (created_at), que é a referenciada
-- pelos registros criados junto com o empréstimo.
--
-- FORA DESTA FASE:
--   PASSO 5  — clones com pagamento (revisão no extrato)
--   PASSO 5b — clones sem pagamento mas com promessa/agendamento
--
-- Executar no SQL Editor do Supabase, um passo por vez, na ordem.
-- Não rode o arquivo inteiro de uma vez: o editor só mostra o último resultado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASSO 0: PREVIEW — exatamente o que será apagado
--          Rode e confira ANTES de qualquer alteração.
-- ----------------------------------------------------------------------------
WITH grupos_sem_dinheiro AS (
    SELECT
        i.loan_id,
        i.number,
        i.due_date,
        i.amount
    FROM public.installments i
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
    GROUP BY i.loan_id, i.number, i.due_date, i.amount
    HAVING COUNT(*) > 1
       AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
       AND COUNT(*) FILTER (WHERE i.status NOT IN ('PENDING', 'LATE')) = 0
       -- Comparar com '[]' evita jsonb_array_length em objeto/valor inválido
       AND COUNT(*) FILTER (
               WHERE COALESCE(i.payment_history, '[]'::jsonb) <> '[]'::jsonb
           ) = 0
       AND COUNT(*) FILTER (
               WHERE COALESCE(i.promised_payment_history, '[]'::jsonb) <> '[]'::jsonb
                  OR i.promised_payment_date IS NOT NULL
                  OR i.promised_payment_amount IS NOT NULL
                  OR i.promised_payment_reason IS NOT NULL
           ) = 0
),
ranked AS (
    SELECT
        i.id,
        i.loan_id,
        i.number,
        i.due_date,
        i.amount,
        i.status,
        i.created_at,
        COALESCE(c.nome_completo, c.nome) AS cliente,
        ROW_NUMBER() OVER (
            PARTITION BY i.loan_id, i.number, i.due_date, i.amount
            ORDER BY i.created_at ASC, i.id ASC
        ) AS rn
    FROM public.installments i
    INNER JOIN grupos_sem_dinheiro g
        ON g.loan_id = i.loan_id
       AND g.number = i.number
       AND g.due_date = i.due_date
       AND g.amount = i.amount
    LEFT JOIN public.clients c ON c.id = i.client_id
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
)
SELECT
    cliente,
    loan_id,
    number AS parcela,
    due_date,
    amount,
    status,
    id AS installment_id,
    created_at,
    CASE WHEN rn = 1 THEN 'MANTER' ELSE 'APAGAR' END AS acao
FROM ranked
ORDER BY cliente, loan_id, number, rn;


-- ----------------------------------------------------------------------------
-- PASSO 1: BACKUP das linhas que serão apagadas
--          Obrigatório. Permite restaurar com um INSERT se algo der errado.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.installments_backup_dedup_fase_a AS
SELECT i.*, now() AS backup_em
FROM public.installments i
WHERE false;

CREATE UNIQUE INDEX IF NOT EXISTS installments_backup_dedup_fase_a_id_uidx
    ON public.installments_backup_dedup_fase_a (id);

-- A tabela guarda dados financeiros de clientes. Sem isto ela nasce no schema
-- public sem RLS e passa a ser legível pela API (PostgREST) com a chave anon.
ALTER TABLE public.installments_backup_dedup_fase_a ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.installments_backup_dedup_fase_a FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.installments_backup_dedup_fase_a FROM authenticated;
    END IF;
END $$;

-- Copia TODAS as colunas atuais de installments (não lista campos).
-- NOT EXISTS impede duplicar o backup se o PASSO 1 for rodado de novo.
INSERT INTO public.installments_backup_dedup_fase_a
WITH grupos_sem_dinheiro AS (
    SELECT
        i.loan_id,
        i.number,
        i.due_date,
        i.amount
    FROM public.installments i
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
    GROUP BY i.loan_id, i.number, i.due_date, i.amount
    HAVING COUNT(*) > 1
       AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
       AND COUNT(*) FILTER (WHERE i.status NOT IN ('PENDING', 'LATE')) = 0
       AND COUNT(*) FILTER (
               WHERE COALESCE(i.payment_history, '[]'::jsonb) <> '[]'::jsonb
           ) = 0
       AND COUNT(*) FILTER (
               WHERE COALESCE(i.promised_payment_history, '[]'::jsonb) <> '[]'::jsonb
                  OR i.promised_payment_date IS NOT NULL
                  OR i.promised_payment_amount IS NOT NULL
                  OR i.promised_payment_reason IS NOT NULL
           ) = 0
),
ranked AS (
    SELECT
        i.*,
        ROW_NUMBER() OVER (
            PARTITION BY i.loan_id, i.number, i.due_date, i.amount
            ORDER BY i.created_at ASC, i.id ASC
        ) AS rn
    FROM public.installments i
    INNER JOIN grupos_sem_dinheiro g
        ON g.loan_id = i.loan_id
       AND g.number = i.number
       AND g.due_date = i.due_date
       AND g.amount = i.amount
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
)
SELECT i.*, now() AS backup_em
FROM public.installments i
WHERE i.id IN (SELECT r.id FROM ranked r WHERE r.rn > 1)
  AND NOT EXISTS (
      SELECT 1
      FROM public.installments_backup_dedup_fase_a b
      WHERE b.id = i.id
  );

-- Confirme que o backup tem o mesmo total do PASSO 0 (linhas "APAGAR")
SELECT COUNT(*) AS linhas_em_backup
FROM public.installments_backup_dedup_fase_a;


-- ----------------------------------------------------------------------------
-- PASSO 2: DELETE em transação
--          Só apaga IDs que estão no backup E que AINDA não têm dinheiro,
--          acordo nem irmão único (revalida o critério no momento do delete).
--          Rode o bloco inteiro de uma vez.
-- ----------------------------------------------------------------------------
BEGIN;

DELETE FROM public.installments i
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
  AND i.id IN (SELECT b.id FROM public.installments_backup_dedup_fase_a b)
  AND COALESCE(i.amount_paid, 0) = 0
  AND i.status IN ('PENDING', 'LATE')
  AND COALESCE(i.payment_history, '[]'::jsonb) = '[]'::jsonb
  AND COALESCE(i.promised_payment_history, '[]'::jsonb) = '[]'::jsonb
  AND i.promised_payment_date IS NULL
  AND i.promised_payment_amount IS NULL
  AND i.promised_payment_reason IS NULL
  -- Não apaga se a linha "MANTER" já não existir (evita zerar o grupo)
  AND EXISTS (
      SELECT 1
      FROM public.installments k
      WHERE k.loan_id = i.loan_id
        AND k.number = i.number
        AND k.due_date = i.due_date
        AND k.amount = i.amount
        AND k.id <> i.id
  );

COMMIT;


-- ----------------------------------------------------------------------------
-- PASSO 2.1: VALIDAÇÃO do delete — as duas colunas devem vir 0
--            (a verificação fica fora da transação porque o editor do Supabase
--             mostra apenas o resultado da última instrução do bloco)
-- ----------------------------------------------------------------------------
SELECT
    (
        SELECT COUNT(*)
        FROM (
            SELECT 1
            FROM public.installments i
            WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
            GROUP BY i.loan_id, i.number, i.due_date, i.amount
            HAVING COUNT(*) > 1
               AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
               AND COUNT(*) FILTER (WHERE i.status NOT IN ('PENDING', 'LATE')) = 0
               AND COUNT(*) FILTER (
                       WHERE COALESCE(i.payment_history, '[]'::jsonb) <> '[]'::jsonb
                   ) = 0
               AND COUNT(*) FILTER (
                       WHERE COALESCE(i.promised_payment_history, '[]'::jsonb) <> '[]'::jsonb
                          OR i.promised_payment_date IS NOT NULL
                          OR i.promised_payment_amount IS NOT NULL
                          OR i.promised_payment_reason IS NOT NULL
                   ) = 0
        ) x
    ) AS clones_sem_dinheiro_restantes,
    (
        SELECT COUNT(*)
        FROM public.installments i
        WHERE i.id IN (SELECT b.id FROM public.installments_backup_dedup_fase_a b)
          AND COALESCE(i.amount_paid, 0) = 0
          AND i.status IN ('PENDING', 'LATE')
    ) AS linhas_do_backup_ainda_sem_dinheiro;


-- ----------------------------------------------------------------------------
-- PASSO 3: RECALCULAR o valor em aberto dos empréstimos afetados
--          Usa a mesma fórmula canônica de corrigir_batimento_tenant_0003.sql.
-- ----------------------------------------------------------------------------
WITH afetados AS (
    SELECT DISTINCT b.loan_id
    FROM public.installments_backup_dedup_fase_a b
),
capital_pago AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(
            COALESCE((elem->>'principalPaid')::numeric,
                     (elem->>'principal_paid')::numeric, 0)
        ), 0) AS capital
    FROM public.installments i
    INNER JOIN afetados a ON a.loan_id = i.loan_id
    LEFT JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(COALESCE(i.payment_history, '[]'::jsonb)) = 'array'
                THEN i.payment_history
            ELSE '[]'::jsonb
        END
    ) elem ON TRUE
    GROUP BY i.loan_id
),
cobrancas_abertas AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(GREATEST(i.amount - COALESCE(i.amount_paid, 0), 0)), 0) AS aberto
    FROM public.installments i
    INNER JOIN afetados a ON a.loan_id = i.loan_id
    WHERE i.status <> 'PAID'
      AND COALESCE(i.amount_paid, 0) < i.amount
    GROUP BY i.loan_id
),
pago_total AS (
    SELECT
        i.loan_id,
        COALESCE(SUM(COALESCE(i.amount_paid, 0)), 0) AS total_pago
    FROM public.installments i
    INNER JOIN afetados a ON a.loan_id = i.loan_id
    GROUP BY i.loan_id
)
UPDATE public.loans l
SET outstanding_amount = CASE
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
                GREATEST(l.amount - COALESCE(cp.capital, 0), 0)
                + GREATEST(
                    ROUND(GREATEST(l.amount - COALESCE(cp.capital, 0), 0)
                          * (l.interest_rate / 100.0), 2),
                    COALESCE(ca.aberto, 0)
                )
            )::numeric, 2)
        ELSE
            ROUND(GREATEST(l.total_amount - COALESCE(pt.total_pago, 0), 0)::numeric, 2)
    END
FROM afetados a
LEFT JOIN capital_pago cp ON cp.loan_id = a.loan_id
LEFT JOIN cobrancas_abertas ca ON ca.loan_id = a.loan_id
LEFT JOIN pago_total pt ON pt.loan_id = a.loan_id
WHERE l.id = a.loan_id
  AND l.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid;


-- ----------------------------------------------------------------------------
-- PASSO 4: VALIDAÇÃO — quantidade de parcelas x contrato nos loans afetados
-- ----------------------------------------------------------------------------
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    l.id AS loan_id,
    l.model,
    l.installments_count AS previstas_no_contrato,
    COUNT(i.id) AS parcelas_no_banco,
    ROUND(SUM(i.amount)::numeric, 2) AS soma_parcelas,
    ROUND(l.total_amount::numeric, 2) AS total_contrato,
    ROUND(COALESCE(l.outstanding_amount, 0)::numeric, 2) AS em_aberto
FROM public.loans l
LEFT JOIN public.clients c ON c.id = l.client_id
LEFT JOIN public.installments i ON i.loan_id = l.id
WHERE l.id IN (SELECT DISTINCT loan_id FROM public.installments_backup_dedup_fase_a)
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    l.id, l.model, l.installments_count, l.total_amount, l.outstanding_amount
ORDER BY cliente;


-- ----------------------------------------------------------------------------
-- PASSO 5: FASE B — clones que TÊM dinheiro (somente leitura, não apaga)
--          Cada grupo aqui precisa de decisão manual: verificar no extrato se
--          o pagamento entrou uma vez (apagar a linha sem lastro) ou duas
--          vezes (estornar/ajustar, não apenas apagar).
-- ----------------------------------------------------------------------------
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    i.loan_id,
    i.number AS parcela,
    i.due_date,
    i.amount,
    COUNT(*) AS qtd_linhas,
    SUM(COALESCE(i.amount_paid, 0)) AS soma_amount_paid,
    ARRAY_AGG(i.id ORDER BY i.created_at) AS installment_ids,
    ARRAY_AGG(i.status ORDER BY i.created_at) AS status_list,
    ARRAY_AGG(COALESCE(i.amount_paid, 0) ORDER BY i.created_at) AS pagos,
    ARRAY_AGG(i.paid_date ORDER BY i.created_at) AS datas_baixa,
    ARRAY_AGG(
        CASE
            WHEN jsonb_typeof(COALESCE(i.payment_history, '[]'::jsonb)) = 'array'
                THEN jsonb_array_length(i.payment_history)
            ELSE 0
        END
        ORDER BY i.created_at
    ) AS qtd_lancamentos
FROM public.installments i
LEFT JOIN public.clients c ON c.id = i.client_id
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    i.loan_id, i.number, i.due_date, i.amount
HAVING COUNT(*) > 1
   AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) > 0
ORDER BY soma_amount_paid DESC, cliente;


-- ----------------------------------------------------------------------------
-- PASSO 5b: clones SEM dinheiro mas COM promessa/agendamento (somente leitura)
--           A Fase A não apaga estes grupos. Revisar manualmente.
-- ----------------------------------------------------------------------------
SELECT
    COALESCE(c.nome_completo, c.nome) AS cliente,
    i.loan_id,
    i.number AS parcela,
    i.due_date,
    i.amount,
    COUNT(*) AS qtd_linhas,
    ARRAY_AGG(i.id ORDER BY i.created_at) AS installment_ids,
    ARRAY_AGG(i.promised_payment_date ORDER BY i.created_at) AS datas_promessa,
    ARRAY_AGG(i.promised_payment_amount ORDER BY i.created_at) AS valores_promessa
FROM public.installments i
LEFT JOIN public.clients c ON c.id = i.client_id
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
GROUP BY
    COALESCE(c.nome_completo, c.nome),
    i.loan_id, i.number, i.due_date, i.amount
HAVING COUNT(*) > 1
   AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
   AND COUNT(*) FILTER (
           WHERE COALESCE(i.promised_payment_history, '[]'::jsonb) <> '[]'::jsonb
              OR i.promised_payment_date IS NOT NULL
              OR i.promised_payment_amount IS NOT NULL
              OR i.promised_payment_reason IS NOT NULL
       ) > 0
ORDER BY cliente;


-- ----------------------------------------------------------------------------
-- ROLLBACK MANUAL (se necessário): restaura as linhas apagadas na Fase A
-- ----------------------------------------------------------------------------
-- INSERT INTO public.installments
-- SELECT
--     b.id, b.tenant_id, b.loan_id, b.client_id, b.number, b.due_date, b.amount,
--     b.amount_paid, b.interest_amount, b.principal_amount,
--     b.promised_payment_reason, b.promised_payment_amount,
--     b.promised_payment_date, b.promised_payment_history, b.payment_history,
--     b.status, b.paid_date, b.created_at, b.updated_at
-- FROM public.installments_backup_dedup_fase_a b
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.installments i WHERE i.id = b.id
-- );
