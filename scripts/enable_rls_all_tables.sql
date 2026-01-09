-- ============================================================================
-- CREDGESTOR - Habilitar Row Level Security (RLS) em todas as tabelas
-- ============================================================================
-- Este script habilita RLS em todas as tabelas do sistema CredGestor
-- Execute após criar as tabelas ou para habilitar RLS em tabelas existentes
-- ============================================================================

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

-- Tabelas Globais
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Tabelas Multi-Tenancy
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Tabelas Legacy
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comissoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS BÁSICAS DE SEGURANÇA
-- ============================================================================

-- Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Tenants are viewable by everyone" ON public.tenants;
DROP POLICY IF EXISTS "Clients are viewable by tenant" ON public.clients;
DROP POLICY IF EXISTS "Tenant users are viewable by tenant" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- ============================================================================
-- POLÍTICAS PARA TENANTS
-- ============================================================================

-- Política: Todos podem ver tenants (ajuste conforme necessário)
CREATE POLICY "Tenants are viewable by everyone" 
ON public.tenants
FOR SELECT 
USING (true);

-- Política: Apenas service_role pode modificar tenants
CREATE POLICY "Tenants are modifiable by service role" 
ON public.tenants
FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================================================
-- POLÍTICAS PARA CLIENTS
-- ============================================================================

-- Política: Usuários podem ver clients do seu tenant
CREATE POLICY "Clients are viewable by tenant users" 
ON public.clients
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem inserir clients no seu tenant
CREATE POLICY "Clients are insertable by tenant users" 
ON public.clients
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem atualizar clients do seu tenant
CREATE POLICY "Clients are updatable by tenant users" 
ON public.clients
FOR UPDATE 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem deletar clients do seu tenant
CREATE POLICY "Clients are deletable by tenant users" 
ON public.clients
FOR DELETE 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICAS PARA TENANT_USERS
-- ============================================================================

-- Política: Usuários podem ver tenant_users do seu tenant
CREATE POLICY "Tenant users are viewable by tenant" 
ON public.tenant_users
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICAS PARA PROPOSTAS
-- ============================================================================

-- Política: Usuários podem ver propostas do seu tenant
CREATE POLICY "Propostas are viewable by tenant users" 
ON public.propostas
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem inserir propostas no seu tenant
CREATE POLICY "Propostas are insertable by tenant users" 
ON public.propostas
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem atualizar propostas do seu tenant
CREATE POLICY "Propostas are updatable by tenant users" 
ON public.propostas
FOR UPDATE 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem deletar propostas do seu tenant
CREATE POLICY "Propostas are deletable by tenant users" 
ON public.propostas
FOR DELETE 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICAS PARA PARCELAS
-- ============================================================================

-- Política: Usuários podem ver parcelas do seu tenant
CREATE POLICY "Parcelas are viewable by tenant users" 
ON public.parcelas
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem inserir parcelas no seu tenant
CREATE POLICY "Parcelas are insertable by tenant users" 
ON public.parcelas
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem atualizar parcelas do seu tenant
CREATE POLICY "Parcelas are updatable by tenant users" 
ON public.parcelas
FOR UPDATE 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICAS PARA PAGAMENTOS
-- ============================================================================

-- Política: Usuários podem ver pagamentos do seu tenant
CREATE POLICY "Pagamentos are viewable by tenant users" 
ON public.pagamentos
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Política: Usuários podem inserir pagamentos no seu tenant
CREATE POLICY "Pagamentos are insertable by tenant users" 
ON public.pagamentos
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICAS PARA OUTRAS TABELAS (SELECT apenas)
-- ============================================================================

-- Experiences
CREATE POLICY "Experiences are viewable by tenant users" 
ON public.experiences
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Historic Scores
CREATE POLICY "Historic scores are viewable by tenant users" 
ON public.historic_scores
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Login Audit
CREATE POLICY "Login audit is viewable by tenant users" 
ON public.login_audit
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Produtos
CREATE POLICY "Produtos are viewable by tenant users" 
ON public.produtos
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Documentos
CREATE POLICY "Documentos are viewable by tenant users" 
ON public.documentos
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Auditoria
CREATE POLICY "Auditoria is viewable by tenant users" 
ON public.auditoria
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- Comissoes
CREATE POLICY "Comissoes are viewable by tenant users" 
ON public.comissoes
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM public.tenant_users 
        WHERE email = (auth.jwt() ->> 'email')::citext
    )
);

-- ============================================================================
-- POLÍTICA ESPECIAL: SERVICE_ROLE BYPASS
-- ============================================================================

-- Nota: O backend usa service_role_key que automaticamente bypass RLS
-- Estas políticas são para quando usar anon_key ou authenticated users
-- Se você quiser permitir que service_role sempre tenha acesso:

-- Exemplo para clients (descomente se necessário):
-- CREATE POLICY "Service role has full access to clients" 
-- ON public.clients
-- FOR ALL 
-- USING (auth.role() = 'service_role')
-- WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar quais tabelas têm RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'tenants', 'users', 'clients', 'experiences', 'historic_scores',
        'login_audit', 'tenant_users', 'tenant_roles', 'role_permissions',
        'custom_domains', 'user_sessions', 'produtos', 'propostas',
        'parcelas', 'pagamentos', 'documentos', 'auditoria', 'comissoes'
    )
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
