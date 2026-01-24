-- ============================================================================
-- CREDGESTOR - Script de Criação de Tabelas para Supabase
-- ============================================================================
-- Este script cria todas as tabelas necessárias para o sistema CredGestor
-- Arquitetura: Multi-tenancy com schema compartilhado e tenant_id (UUID)
-- Compatível com Supabase PostgreSQL
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- TABELAS GLOBAIS (sem tenant_id)
-- ============================================================================

-- Tabela de Tenants (Organizações/Empresas)
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

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON public.tenants(ativo);
CREATE INDEX IF NOT EXISTS idx_tenants_name ON public.tenants(name);

-- Tabela de Usuários Globais (Supabase Auth integration)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY,
    email citext NOT NULL,
    name text,
    role text DEFAULT 'user',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- TABELAS COM TENANT_ID (Multi-tenancy)
-- ============================================================================

-- Tabela de Clientes (clientes/clientes)
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome text NOT NULL,
    nome_completo text,
    cpf_cnpj text,
    tipo_pessoa text CHECK (tipo_pessoa IN ('PF', 'PJ')),
    email citext,
    telefone text,
    celular text,
    whatsapp text,
    endereco text,
    complemento text,
    bairro text,
    cidade text,
    estado text,
    cep text,
    data_nascimento date,
    renda_mensal numeric(15,2),
    profissao text,
    observacoes text,
    score_credito integer,
    ativo boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cpf_cnpj)
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_ativo ON public.clients(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- Tabela de Experiências (experiences)
CREATE TABLE IF NOT EXISTS public.experiences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    tipo text,
    descricao text,
    data_inicio date,
    data_fim date,
    status text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_tenant ON public.experiences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_experiences_client ON public.experiences(client_id);

-- Tabela de Histórico de Scores (historic_scores)
CREATE TABLE IF NOT EXISTS public.historic_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    score integer NOT NULL,
    data_score date NOT NULL,
    origem text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historic_scores_tenant ON public.historic_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_historic_scores_client ON public.historic_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_historic_scores_data ON public.historic_scores(data_score);

-- Tabela de Auditoria de Login (login_audit)
CREATE TABLE IF NOT EXISTS public.login_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid,
    email citext NOT NULL,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_tenant ON public.login_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_user ON public.login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_created ON public.login_audit(created_at);

-- Tabela de Tenant Users (vinculação usuário-tenant)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    email citext NOT NULL,
    role text DEFAULT 'user',
    ativo boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON public.tenant_users(email);

-- Tabela de Roles por Tenant (tenant_roles)
CREATE TABLE IF NOT EXISTS public.tenant_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant ON public.tenant_roles(tenant_id);

-- Tabela de Permissões de Roles (role_permissions)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_id uuid REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
    resource text NOT NULL,
    action text NOT NULL,
    granted boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, role_id, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON public.role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);

-- Tabela de Domínios Customizados (custom_domains)
CREATE TABLE IF NOT EXISTS public.custom_domains (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain text NOT NULL UNIQUE,
    ssl_enabled boolean DEFAULT true,
    verified boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant ON public.custom_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON public.custom_domains(domain);

-- Tabela de Sessões de Usuário (user_sessions)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON public.user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

-- ============================================================================
-- TABELAS LEGACY (compatibilidade com código legacy)
-- ============================================================================

-- Tabela de Produtos Financeiros (produtos)
CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome text NOT NULL,
    tipo text NOT NULL,
    descricao text,
    taxa_juros_min numeric(5,2),
    taxa_juros_max numeric(5,2),
    prazo_min integer,
    prazo_max integer,
    valor_min numeric(15,2),
    valor_max numeric(15,2),
    requisitos jsonb DEFAULT '{}'::jsonb,
    ativo boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON public.produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON public.produtos(tenant_id, tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(tenant_id, ativo);

-- Tabela de Propostas/Contratos (propostas)
CREATE TABLE IF NOT EXISTS public.propostas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    usuario_id uuid,
    numero_proposta text UNIQUE NOT NULL,
    valor_solicitado numeric(15,2) NOT NULL,
    valor_aprovado numeric(15,2),
    taxa_juros numeric(5,2),
    prazo integer,
    valor_parcela numeric(15,2),
    data_primeira_parcela date,
    status text DEFAULT 'em_analise',
    observacoes text,
    documentos jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    data_aprovacao timestamptz,
    data_desembolso timestamptz
);

CREATE INDEX IF NOT EXISTS idx_propostas_tenant ON public.propostas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON public.propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_propostas_numero ON public.propostas(numero_proposta);

-- Tabela de Parcelas (parcelas)
CREATE TABLE IF NOT EXISTS public.parcelas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    numero_parcela integer NOT NULL,
    valor_parcela numeric(15,2) NOT NULL,
    valor_pago numeric(15,2) DEFAULT 0,
    data_vencimento date NOT NULL,
    data_pagamento date,
    status text DEFAULT 'pendente',
    dias_atraso integer DEFAULT 0,
    juros_atraso numeric(15,2) DEFAULT 0,
    multa numeric(15,2) DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_tenant ON public.parcelas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_proposta ON public.parcelas(proposta_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON public.parcelas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.parcelas(data_vencimento);

-- Tabela de Pagamentos (pagamentos)
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parcela_id uuid NOT NULL REFERENCES public.parcelas(id) ON DELETE RESTRICT,
    valor_pago numeric(15,2) NOT NULL,
    forma_pagamento text,
    data_pagamento timestamptz DEFAULT now(),
    comprovante text,
    observacoes text,
    usuario_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_tenant ON public.pagamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela ON public.pagamentos(parcela_id);

-- Tabela de Documentos (documentos)
CREATE TABLE IF NOT EXISTS public.documentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entidade_tipo text NOT NULL,
    entidade_id uuid NOT NULL,
    tipo_documento text NOT NULL,
    nome_arquivo text NOT NULL,
    caminho_arquivo text NOT NULL,
    tamanho_bytes bigint,
    mime_type text,
    observacoes text,
    data_upload timestamptz DEFAULT now(),
    usuario_upload_id uuid
);

CREATE INDEX IF NOT EXISTS idx_documentos_tenant ON public.documentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_entidade ON public.documentos(entidade_tipo, entidade_id);

-- Tabela de Auditoria (auditoria)
CREATE TABLE IF NOT EXISTS public.auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    usuario_id uuid,
    acao text NOT NULL,
    tabela text,
    registro_id uuid,
    dados_anteriores jsonb,
    dados_novos jsonb,
    ip_address text,
    user_agent text,
    data_hora timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tenant ON public.auditoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON public.auditoria(data_hora);

-- Tabela de Comissões (comissoes)
CREATE TABLE IF NOT EXISTS public.comissoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE RESTRICT,
    usuario_id uuid NOT NULL,
    percentual numeric(5,2) NOT NULL,
    valor_comissao numeric(15,2) NOT NULL,
    status text DEFAULT 'pendente',
    data_pagamento timestamptz,
    observacoes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_tenant ON public.comissoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_usuario ON public.comissoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comissoes(tenant_id, status);

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
-- Remove triggers existentes antes de criar (para evitar erros de duplicação)
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_users_updated_at ON public.tenant_users;
CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON public.tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_propostas_updated_at ON public.propostas;
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parcelas_updated_at ON public.parcelas;
CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON public.parcelas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Configuração básica
-- ============================================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajuste conforme sua necessidade de segurança)
-- Nota: O backend usa service_role_key que bypass RLS, mas é bom ter políticas

-- Política para tenants: todos podem ver (ajuste conforme necessário)
CREATE POLICY "Tenants are viewable by everyone" ON public.tenants
    FOR SELECT USING (true);

-- Política para clients: apenas do próprio tenant
CREATE POLICY "Clients are viewable by tenant" ON public.clients
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ============================================================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================================================

-- Inserir tenant de exemplo
INSERT INTO public.tenants (id, name, slug, ativo) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Cliente Alpha', 'cliente-alpha', true),
    ('00000000-0000-0000-0000-000000000002', 'Cliente Beta', 'cliente-beta', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================================================

COMMENT ON TABLE public.tenants IS 'Organizações/Empresas que usam o sistema';
COMMENT ON TABLE public.clients IS 'Clientes/Tomadores de crédito';
COMMENT ON TABLE public.propostas IS 'Propostas/Contratos de crédito';
COMMENT ON TABLE public.parcelas IS 'Parcelas dos contratos';
COMMENT ON TABLE public.pagamentos IS 'Registro de pagamentos';
COMMENT ON TABLE public.tenant_users IS 'Vinculação de usuários a tenants';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
