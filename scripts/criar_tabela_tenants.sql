-- ============================================================================
-- CREDGESTOR - Criar Tabela Tenants
-- ============================================================================
-- Este script cria apenas a tabela tenants que está faltando
-- As outras tabelas já existem no banco de dados
-- ============================================================================

-- Verificar se a tabela já existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) THEN
        RAISE NOTICE '✅ A tabela public.tenants já existe. Nada a fazer.';
    ELSE
        RAISE NOTICE '📋 Criando tabela public.tenants...';
    END IF;
END $$;

-- Criar tabela tenants se não existir
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text UNIQUE,
    cnpj text,
    email text,
    telefone text,
    endereco text,
    cidade text,
    estado text,
    cep text,
    ativo boolean DEFAULT true,
    configuracoes jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON public.tenants(ativo);
CREATE INDEX IF NOT EXISTS idx_tenants_name ON public.tenants(name);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger se não existir
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar comentário
COMMENT ON TABLE public.tenants IS 'Organizações/Empresas que usam o sistema';

-- Verificar se foi criada com sucesso
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Tabela public.tenants criada com sucesso!';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ Erro: Não foi possível criar a tabela tenants';
    END IF;
END $$;

-- Verificar se há foreign keys que precisam ser criadas
-- (tenant_users já deve ter a FK, mas vamos verificar)
DO $$
BEGIN
    -- Verificar se a FK de tenant_users para tenants existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'tenant_users'
        AND constraint_name LIKE '%tenant%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '⚠️  Aviso: Foreign key de tenant_users para tenants pode não existir';
        RAISE NOTICE '   Se houver erro ao inserir dados, execute:';
        RAISE NOTICE '   ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_tenant_id_fkey';
        RAISE NOTICE '       FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;';
    ELSE
        RAISE NOTICE '✅ Foreign key de tenant_users para tenants existe';
    END IF;
END $$;

-- Mostrar resumo
SELECT 
    'RESUMO' as info,
    'Tabela tenants criada' as status,
    COUNT(*) as total_tenants_existentes
FROM public.tenants;
