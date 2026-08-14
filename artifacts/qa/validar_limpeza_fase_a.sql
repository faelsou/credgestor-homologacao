-- Validação extra do script de limpeza (não altera produção).
-- Roda no banco de teste já semeado.

\echo '=== A) PASSO 0: contagem MANTER vs APAGAR ==='
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
    SELECT i.id, i.loan_id,
        ROW_NUMBER() OVER (
            PARTITION BY i.loan_id, i.number, i.due_date, i.amount
            ORDER BY i.created_at ASC, i.id ASC
        ) AS rn
    FROM public.installments i
    INNER JOIN grupos_sem_dinheiro g
        ON g.loan_id = i.loan_id AND g.number = i.number
       AND g.due_date = i.due_date AND g.amount = i.amount
)
SELECT
    COUNT(*) FILTER (WHERE rn = 1) AS manter,
    COUNT(*) FILTER (WHERE rn > 1) AS apagar
FROM ranked;

\echo '=== B) jsonb_array_length em objeto {} (risco de erro em produção) ==='
DO $$
BEGIN
    BEGIN
        PERFORM jsonb_array_length('{}'::jsonb);
        RAISE NOTICE 'jsonb_array_length({}) NAO falhou (inesperado)';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'CONFIRMADO: jsonb_array_length({}) falha: %', SQLERRM;
    END;
END $$;

\echo '=== C) clones com PROMESSA (fora da Fase A e do PASSO 5 atual) ==='
SELECT COUNT(*) AS clones_com_promessa_sem_dinheiro
FROM (
    SELECT 1
    FROM public.installments i
    WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
    GROUP BY i.loan_id, i.number, i.due_date, i.amount
    HAVING COUNT(*) > 1
       AND COUNT(*) FILTER (WHERE COALESCE(i.amount_paid, 0) > 0) = 0
       AND COUNT(*) FILTER (
               WHERE COALESCE(jsonb_array_length(i.promised_payment_history), 0) > 0
                  OR i.promised_payment_date IS NOT NULL
                  OR i.promised_payment_amount IS NOT NULL
                  OR i.promised_payment_reason IS NOT NULL
           ) > 0
) x;
