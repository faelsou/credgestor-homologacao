-- ============================================================================
-- CORREÇÃO DE STATUS — UM TENANT
-- Resolve os tipos B, C, D e E encontrados na verificação.
--
-- Uso:
--   1) Altere o tenant_id na CTE params
--   2) Rode o PASSO 0 (preview) e confira
--   3) Rode o resto do script (backup + updates + validação)
-- ============================================================================

-- >>> ALTERE O TENANT AQUI <<<
-- Use o mesmo UUID em TODOS os blocos abaixo.

-- ============================================================================
-- PASSO 0: PREVIEW — o que será alterado (rode sozinho primeiro)
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
)
SELECT
    'B_para_PAID' AS acao,
    c.nome AS cliente,
    i.id AS installment_id,
    l.id AS loan_id,
    i.number AS parcela,
    i.due_date AS vencimento,
    i.amount AS valor,
    i.amount_paid AS valor_pago,
    i.status AS status_atual,
    'PAID' AS status_novo
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans l ON l.id = i.loan_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID'

UNION ALL

SELECT
    'C_para_PARTIAL_ou_PENDING',
    c.nome,
    i.id,
    l.id,
    i.number,
    i.due_date,
    i.amount,
    i.amount_paid,
    i.status,
    CASE WHEN COALESCE(i.amount_paid, 0) <= 0 THEN 'PENDING' ELSE 'PARTIAL' END
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans l ON l.id = i.loan_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PAID'
  AND i.amount_paid < i.amount
  AND i.amount > 0

UNION ALL

SELECT
    'D_para_LATE',
    c.nome,
    i.id,
    l.id,
    i.number,
    i.due_date,
    i.amount,
    i.amount_paid,
    i.status,
    'LATE'
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
JOIN public.loans l ON l.id = i.loan_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PENDING'
  AND i.amount_paid < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

UNION ALL

SELECT
    'E_emprestimo_para_PAID',
    c.nome,
    NULL::uuid,
    l.id,
    NULL::integer,
    NULL::date,
    COALESCE(l.outstanding_amount, 0),
    0,
    upper(l.status),
    'PAID'
FROM public.loans l
JOIN public.clients c ON c.id = l.client_id
CROSS JOIN params p
WHERE l.tenant_id = p.tenant_id
  AND upper(l.status) IN ('ACTIVE', 'OPEN')
  AND NOT EXISTS (
      SELECT 1 FROM public.installments i
      WHERE i.loan_id = l.id
        AND i.status <> 'PAID'
        AND i.amount_paid < i.amount
  )
  AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)

ORDER BY acao, cliente, vencimento NULLS LAST, parcela NULLS LAST;


-- ============================================================================
-- A partir daqui: BACKUP + CORREÇÃO
-- Rode só depois de conferir o preview acima
-- ============================================================================

/*
-- >>> ALTERE O TENANT AQUI TAMBÉM <<<
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS tenant_id
)

-- Backup parcelas
, backup_inst AS (
    INSERT INTO public.installments_backup_correcao_tenant
    SELECT i.*, now() AS backup_em, p.tenant_id AS tenant_corrigido
    FROM public.installments i
    CROSS JOIN params p
    WHERE i.tenant_id = p.tenant_id
      AND (
        (i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID')
        OR (i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0)
        OR (
          i.status = 'PENDING'
          AND i.amount_paid < i.amount
          AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )
      )
    RETURNING id
)
SELECT COUNT(*) AS parcelas_no_backup FROM backup_inst;
*/

-- ----------------------------------------------------------------------------
-- 1) Criar tabelas de backup (uma vez)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.installments_backup_correcao_tenant AS
SELECT i.*, now() AS backup_em, i.tenant_id AS tenant_corrigido
FROM public.installments i
WHERE FALSE;

CREATE TABLE IF NOT EXISTS public.loans_backup_correcao_tenant AS
SELECT l.*, now() AS backup_em, l.tenant_id AS tenant_corrigido
FROM public.loans l
WHERE FALSE;

-- ----------------------------------------------------------------------------
-- 2) Backup + updates (rode este bloco inteiro)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_tenant uuid := '00000000-0000-0000-0000-000000000001'; -- <<< ALTERE AQUI
    n_b int;
    n_c int;
    n_d int;
    n_e int;
BEGIN
    -- Backup parcelas
    INSERT INTO public.installments_backup_correcao_tenant
    SELECT i.*, now(), v_tenant
    FROM public.installments i
    WHERE i.tenant_id = v_tenant
      AND (
        (i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID')
        OR (i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0)
        OR (
          i.status = 'PENDING'
          AND i.amount_paid < i.amount
          AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )
      );

    -- Backup empréstimos (tipo E)
    INSERT INTO public.loans_backup_correcao_tenant
    SELECT l.*, now(), v_tenant
    FROM public.loans l
    WHERE l.tenant_id = v_tenant
      AND upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id
            AND i.status <> 'PAID'
            AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id);

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
      AND i.amount_paid < i.amount
      AND i.amount > 0;
    GET DIAGNOSTICS n_c = ROW_COUNT;

    -- D: vencida PENDING → LATE
    UPDATE public.installments i
    SET status = 'LATE'
    WHERE i.tenant_id = v_tenant
      AND i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    GET DIAGNOSTICS n_d = ROW_COUNT;

    -- E: ACTIVE sem parcela pendente → PAID
    UPDATE public.loans l
    SET status = 'PAID',
        outstanding_amount = 0
    WHERE l.tenant_id = v_tenant
      AND upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id
            AND i.status <> 'PAID'
            AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id);
    GET DIAGNOSTICS n_e = ROW_COUNT;

    RAISE NOTICE 'Corrigido tenant % => B:%, C:%, D:%, E:%', v_tenant, n_b, n_c, n_d, n_e;
END $$;

-- ----------------------------------------------------------------------------
-- 3) VALIDAÇÃO — deve voltar vazio (0 linhas) para este tenant
-- ----------------------------------------------------------------------------
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
)
SELECT tipo, COUNT(*) AS qtd
FROM inconsistencias
GROUP BY tipo
ORDER BY qtd DESC;
