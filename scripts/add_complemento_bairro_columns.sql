-- ============================================================================
-- Migration: Adicionar colunas complemento e bairro na tabela clients
-- ============================================================================
-- Este script adiciona as colunas complemento e bairro na tabela clients
-- para suportar endereços completos com complemento e bairro
-- ============================================================================

-- Para PostgreSQL (Supabase)
DO $$ 
BEGIN
    -- Adicionar coluna complemento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name = 'complemento'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN complemento text;
        RAISE NOTICE 'Coluna complemento adicionada à tabela clients';
    ELSE
        RAISE NOTICE 'Coluna complemento já existe na tabela clients';
    END IF;

    -- Adicionar coluna bairro se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name = 'bairro'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN bairro text;
        RAISE NOTICE 'Coluna bairro adicionada à tabela clients';
    ELSE
        RAISE NOTICE 'Coluna bairro já existe na tabela clients';
    END IF;
END $$;

-- Para PostgreSQL legado (tabela clientes)
DO $$ 
BEGIN
    -- Adicionar coluna complemento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'complemento'
    ) THEN
        ALTER TABLE clientes ADD COLUMN complemento TEXT;
        RAISE NOTICE 'Coluna complemento adicionada à tabela clientes';
    ELSE
        RAISE NOTICE 'Coluna complemento já existe na tabela clientes';
    END IF;

    -- Adicionar coluna bairro se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'bairro'
    ) THEN
        ALTER TABLE clientes ADD COLUMN bairro VARCHAR(100);
        RAISE NOTICE 'Coluna bairro adicionada à tabela clientes';
    ELSE
        RAISE NOTICE 'Coluna bairro já existe na tabela clientes';
    END IF;
END $$;
