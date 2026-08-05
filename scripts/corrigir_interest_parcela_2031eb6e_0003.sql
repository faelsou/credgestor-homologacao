-- Correção pontual tenant 0003 — parcela PRICE com interest_amount inconsistente
-- Data: 2026-08-05
-- Problema: amount=1100, principal=1000, interest=0 → ia+pa ≠ amount
-- Ajuste: interest_amount = 100 (amount - principal)

BEGIN;

UPDATE public.installments
SET interest_amount = 100
WHERE id = '2031eb6e-c3a0-4672-b49b-de413e4f458b'
  AND tenant_id = '00000000-0000-0000-0000-000000000003'
  AND amount = 1100
  AND principal_amount = 1000
  AND COALESCE(interest_amount, 0) = 0;

-- Validação esperada: 1 linha afetada
-- SELECT id, amount, interest_amount, principal_amount
-- FROM public.installments
-- WHERE id = '2031eb6e-c3a0-4672-b49b-de413e4f458b';

COMMIT;
