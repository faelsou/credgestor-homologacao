-- Adiciona a coluna payment_history na tabela installments.
-- Sem essa coluna, o histórico de pagamentos (juros/capital pagos) existe apenas
-- na memória do navegador e é perdido a cada reload, fazendo clientes já baixados
-- voltarem a aparecer como devedores.
--
-- Executar no SQL Editor do Supabase (ou via psql) no banco de produção/homologação.

ALTER TABLE public.installments
    ADD COLUMN IF NOT EXISTS payment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.installments.payment_history IS
    'Histórico de pagamentos da parcela: [{amount, interestPaid, principalPaid, paymentDate, createdAt}]';
