\echo '=== D) reexecutar INSERT do backup (idempotencia) ==='
INSERT INTO public.installments_backup_dedup_fase_a (
    id, tenant_id, loan_id, client_id, number, due_date, amount, amount_paid,
    interest_amount, principal_amount, promised_payment_reason,
    promised_payment_amount, promised_payment_date, promised_payment_history,
    payment_history, status, paid_date, created_at, updated_at, backup_em
)
WITH grupos_sem_dinheiro AS (
    SELECT i.loan_id, i.number, i.due_date, i.amount
    FROM public.installments i
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
    GROUP BY i.loan_id, i.number, i.due_date, i.amount
    HAVING COUNT(*) > 1
       AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
       AND COUNT(*) FILTER (WHERE i.status NOT IN ('PENDING', 'LATE')) = 0
       AND COUNT(*) FILTER (WHERE COALESCE(jsonb_array_length(i.payment_history), 0) > 0) = 0
       AND COUNT(*) FILTER (
               WHERE COALESCE(jsonb_array_length(i.promised_payment_history), 0) > 0
                  OR i.promised_payment_date IS NOT NULL
                  OR i.promised_payment_amount IS NOT NULL
                  OR i.promised_payment_reason IS NOT NULL
           ) = 0
),
ranked AS (
    SELECT i.*, ROW_NUMBER() OVER (
            PARTITION BY i.loan_id, i.number, i.due_date, i.amount
            ORDER BY i.created_at ASC, i.id ASC
        ) AS rn
    FROM public.installments i
    INNER JOIN grupos_sem_dinheiro g
        ON g.loan_id = i.loan_id AND g.number = i.number
       AND g.due_date = i.due_date AND g.amount = i.amount
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
)
SELECT
    id, tenant_id, loan_id, client_id, number, due_date, amount, amount_paid,
    interest_amount, principal_amount, promised_payment_reason,
    promised_payment_amount, promised_payment_date, promised_payment_history,
    payment_history, status, paid_date, created_at, updated_at, now()
FROM ranked WHERE rn > 1;

SELECT COUNT(*) AS linhas_backup_apos_2a_execucao,
       COUNT(DISTINCT id) AS ids_distintos
FROM public.installments_backup_dedup_fase_a;

\echo '=== E) coluna extra em installments vs INSERT explicito ==='
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS nota_interna text;
DROP TABLE IF EXISTS public.tmp_backup_cols;
CREATE TABLE public.tmp_backup_cols AS
SELECT i.*, now() AS backup_em FROM public.installments i WHERE false;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tmp_backup_cols' AND column_name IN ('nota_interna', 'backup_em')
ORDER BY column_name;
