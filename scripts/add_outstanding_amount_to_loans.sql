-- ============================================================================
-- Adicionar coluna outstanding_amount à tabela loans
-- ============================================================================
-- Esta coluna armazena o valor em aberto do empréstimo (calculado)
-- ============================================================================

-- Adicionar coluna outstanding_amount se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'loans' 
        AND column_name = 'outstanding_amount'
    ) THEN
        ALTER TABLE public.loans 
        ADD COLUMN outstanding_amount numeric(15,2);
        
        -- Atualizar valores existentes: outstanding_amount = total_amount inicialmente
        UPDATE public.loans 
        SET outstanding_amount = total_amount 
        WHERE outstanding_amount IS NULL;
        
        -- Tornar a coluna NOT NULL após popular
        ALTER TABLE public.loans 
        ALTER COLUMN outstanding_amount SET NOT NULL;
        
        -- Adicionar comentário
        COMMENT ON COLUMN public.loans.outstanding_amount IS 'Valor em aberto do empréstimo (calculado baseado nas parcelas pendentes)';
    END IF;
END $$;
