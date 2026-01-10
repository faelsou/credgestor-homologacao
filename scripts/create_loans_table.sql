-- ============================================================================
-- CREDGESTOR - Tabela de Empréstimos (Loans)
-- ============================================================================
-- Esta tabela armazena os empréstimos do sistema
-- Arquitetura: Multi-tenancy com tenant_id
-- ============================================================================

-- Tabela de Empréstimos (loans)
CREATE TABLE IF NOT EXISTS public.loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    amount numeric(15,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    start_date date NOT NULL,
    installments_count integer NOT NULL,
    model text NOT NULL DEFAULT 'PRICE',
    status text NOT NULL DEFAULT 'open',
    promissory_note jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_loans_tenant ON public.loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_client ON public.loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_start_date ON public.loans(start_date);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para loans
DROP POLICY IF EXISTS "Loans are viewable by tenant" ON public.loans;
CREATE POLICY "Loans are viewable by tenant" ON public.loans
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Loans can be inserted by tenant" ON public.loans;
CREATE POLICY "Loans can be inserted by tenant" ON public.loans
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Loans can be updated by tenant" ON public.loans;
CREATE POLICY "Loans can be updated by tenant" ON public.loans
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Loans can be deleted by tenant" ON public.loans;
CREATE POLICY "Loans can be deleted by tenant" ON public.loans
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- Comentário
COMMENT ON TABLE public.loans IS 'Empréstimos realizados pelos clientes';

-- ============================================================================
-- Tabela de Parcelas (Installments)
-- ============================================================================
-- Esta tabela armazena as parcelas dos empréstimos
-- Arquitetura: Multi-tenancy com tenant_id
-- ============================================================================

-- Tabela de Parcelas (installments)
CREATE TABLE IF NOT EXISTS public.installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT, -- Denormalized
    number integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    amount_paid numeric(15,2) DEFAULT 0,
    interest_amount numeric(15,2),
    principal_amount numeric(15,2),
    promised_payment_reason text,
    promised_payment_amount numeric(15,2),
    promised_payment_date date,
    promised_payment_history jsonb DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'PENDING',
    paid_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_installments_tenant ON public.installments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_installments_loan ON public.installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_installments_client ON public.installments(client_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.installments(due_date);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_installments_updated_at ON public.installments;
CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para installments
DROP POLICY IF EXISTS "Installments are viewable by tenant" ON public.installments;
CREATE POLICY "Installments are viewable by tenant" ON public.installments
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Installments can be inserted by tenant" ON public.installments;
CREATE POLICY "Installments can be inserted by tenant" ON public.installments
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Installments can be updated by tenant" ON public.installments;
CREATE POLICY "Installments can be updated by tenant" ON public.installments
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Installments can be deleted by tenant" ON public.installments;
CREATE POLICY "Installments can be deleted by tenant" ON public.installments
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- Comentário
COMMENT ON TABLE public.installments IS 'Parcelas dos empréstimos realizados';
