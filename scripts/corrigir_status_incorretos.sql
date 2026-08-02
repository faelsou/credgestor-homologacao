-- ============================================================================
-- CORREÇÃO DE STATUS INCORRETOS (resultado da consulta 7)
-- Executar no SQL Editor do Supabase. Rodar na ordem.
--
-- Contagens típicas esperadas antes da correção:
--   B ~190  valor quitado, status <> PAID
--   D ~156  vencida ainda PENDING  (opcional — ver nota no passo D)
--   E ~2    empréstimo ACTIVE sem parcela pendente
--   C ~1    status PAID com saldo
--   F ~1    empréstimo PAID com outstanding_amount > 0
--
-- Descomente o filtro de tenant_id em cada passo se quiser limitar o escopo.
-- ============================================================================

-- ============================================================================
-- PASSO 0: backup único das linhas que serão alteradas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.installments_backup_correcao_geral AS
SELECT i.*, now() AS backup_em, 'installment'::text AS origem
FROM public.installments i
WHERE FALSE; -- só cria a estrutura; inserts abaixo

-- Backup parcelas (tipos B, C, D)
INSERT INTO public.installments_backup_correcao_geral
SELECT i.*, now(), 'installment'
FROM public.installments i
WHERE (
    -- B
    (i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID')
    OR
    -- C
    (i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0)
    OR
    -- D
    (
      i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    )
)
-- AND i.tenant_id = 'SEU_TENANT_ID'
AND NOT EXISTS (
    SELECT 1 FROM public.installments_backup_correcao_geral b
    WHERE b.id = i.id AND b.origem = 'installment'
);

CREATE TABLE IF NOT EXISTS public.loans_backup_correcao_geral AS
SELECT l.*, now() AS backup_em
FROM public.loans l
WHERE FALSE;

INSERT INTO public.loans_backup_correcao_geral
SELECT l.*, now()
FROM public.loans l
WHERE (
    -- E
    (
      upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id AND i.status <> 'PAID' AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)
    )
    OR
    -- F
    (upper(l.status) = 'PAID' AND COALESCE(l.outstanding_amount, 0) > 0.01)
)
-- AND l.tenant_id = 'SEU_TENANT_ID'
AND NOT EXISTS (
    SELECT 1 FROM public.loans_backup_correcao_geral b WHERE b.id = l.id
);

-- ============================================================================
-- TIPO B (prioridade 1): valor quitado → status PAID
-- ============================================================================
UPDATE public.installments i
SET status    = 'PAID',
    paid_date = COALESCE(
        i.paid_date,
        (i.updated_at AT TIME ZONE 'America/Sao_Paulo')::date
    )
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID';
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ============================================================================
-- TIPO C: status PAID com saldo → PARTIAL (ou PENDING se nada pago)
-- ============================================================================
UPDATE public.installments i
SET status = CASE
               WHEN COALESCE(i.amount_paid, 0) <= 0 THEN 'PENDING'
               ELSE 'PARTIAL'
             END,
    paid_date = NULL
WHERE i.status = 'PAID'
  AND i.amount_paid < i.amount
  AND i.amount > 0;
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ============================================================================
-- TIPO E: empréstimo ACTIVE/OPEN sem parcela pendente → PAID + outstanding 0
-- ============================================================================
UPDATE public.loans l
SET status = 'PAID',
    outstanding_amount = 0
WHERE upper(l.status) IN ('ACTIVE', 'OPEN')
  AND NOT EXISTS (
      SELECT 1
      FROM public.installments i
      WHERE i.loan_id = l.id
        AND i.status <> 'PAID'
        AND i.amount_paid < i.amount
  )
  AND EXISTS (
      SELECT 1 FROM public.installments i WHERE i.loan_id = l.id
  );
-- AND l.tenant_id = 'SEU_TENANT_ID'

-- ============================================================================
-- TIPO F: empréstimo PAID com outstanding > 0 → zerar valor em aberto
-- ============================================================================
UPDATE public.loans l
SET outstanding_amount = 0
WHERE upper(l.status) = 'PAID'
  AND COALESCE(l.outstanding_amount, 0) > 0.01;
-- AND l.tenant_id = 'SEU_TENANT_ID'

-- ============================================================================
-- TIPO D (opcional): vencida PENDING → LATE
-- Nota: o app também marca LATE na memória ao carregar.
--       Corrigir no banco alinha relatórios, n8n e consultas SQL.
-- ============================================================================
UPDATE public.installments i
SET status = 'LATE'
WHERE i.status = 'PENDING'
  AND i.amount_paid < i.amount
  AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ============================================================================
-- VALIDAÇÃO FINAL — deve retornar 0 em todos (ou só D se você pulou o UPDATE D)
-- ============================================================================
SELECT tipo, COUNT(*) AS qtd
FROM (
    SELECT 'B_valor_quitado_status_nao_paid' AS tipo
    FROM public.installments i
    WHERE i.amount_paid >= i.amount AND i.amount > 0 AND i.status <> 'PAID'

    UNION ALL

    SELECT 'C_status_paid_com_saldo'
    FROM public.installments i
    WHERE i.status = 'PAID' AND i.amount_paid < i.amount AND i.amount > 0

    UNION ALL

    SELECT 'D_vencida_ainda_pending'
    FROM public.installments i
    WHERE i.status = 'PENDING'
      AND i.amount_paid < i.amount
      AND i.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date

    UNION ALL

    SELECT 'E_emprestimo_active_sem_parcela_pendente'
    FROM public.loans l
    WHERE upper(l.status) IN ('ACTIVE', 'OPEN')
      AND NOT EXISTS (
          SELECT 1 FROM public.installments i
          WHERE i.loan_id = l.id AND i.status <> 'PAID' AND i.amount_paid < i.amount
      )
      AND EXISTS (SELECT 1 FROM public.installments i WHERE i.loan_id = l.id)

    UNION ALL

    SELECT 'F_emprestimo_paid_com_valor_aberto'
    FROM public.loans l
    WHERE upper(l.status) = 'PAID' AND COALESCE(l.outstanding_amount, 0) > 0.01
) t
GROUP BY tipo
ORDER BY qtd DESC;
