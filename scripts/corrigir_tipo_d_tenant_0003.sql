-- ============================================================================
-- CORREÇÃO TIPO D — PENDING vencida → LATE
-- Tenant: 00000000-0000-0000-0000-000000000003 (Cleiton Max Car)
--
-- O que faz: só altera status PENDING → LATE em parcelas com
-- vencimento no passado e saldo em aberto.
-- NÃO mexe em valor, pago, saldo nem histórico.
--
-- Uso no SQL Editor do Supabase (rode na ordem):
--   1) PREVIEW
--   2) BACKUP
--   3) UPDATE
--   4) VALIDAÇÃO
-- ============================================================================

-- ============================================================================
-- 1) PREVIEW — confira os clientes antes de alterar
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT
    c.nome AS cliente,
    i.id AS installment_id,
    i.number AS parcela,
    i.due_date AS vencimento,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date - i.due_date AS dias_atraso,
    i.amount AS valor,
    COALESCE(i.amount_paid, 0) AS pago,
    ROUND((i.amount - COALESCE(i.amount_paid, 0))::numeric, 2) AS saldo,
    i.status AS status_atual,
    'LATE' AS status_novo
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
ORDER BY dias_atraso DESC, c.nome, i.number;

-- Contagem esperada (~129)
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT COUNT(*) AS qtd_para_corrigir
FROM public.installments i
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;


-- ============================================================================
-- 2) BACKUP — rode uma vez antes do UPDATE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.installments_backup_tipo_d_0003 AS
SELECT i.*, now() AS backup_em
FROM public.installments i
WHERE FALSE;

INSERT INTO public.installments_backup_tipo_d_0003
SELECT i.*, now()
FROM public.installments i
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;


-- ============================================================================
-- 3) UPDATE — aplica a correção
-- ============================================================================
UPDATE public.installments i
SET status = 'LATE',
    updated_at = now()
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;


-- ============================================================================
-- 4) VALIDAÇÃO — deve retornar 0
-- ============================================================================
WITH params AS (
    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS tenant_id
)
SELECT COUNT(*) AS ainda_pending_vencidas
FROM public.installments i
CROSS JOIN params p
WHERE i.tenant_id = p.tenant_id
  AND i.status = 'PENDING'
  AND COALESCE(i.amount_paid, 0) < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
