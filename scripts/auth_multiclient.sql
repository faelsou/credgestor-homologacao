-- Schema principal para autenticação multi-cliente por e-mail e senha
-- Cada usuário pertence a um cliente/tenant e pode ter acesso total ao site
-- Execute em um banco PostgreSQL (p.ex. Supabase) com a extensão pgcrypto disponível

-- Extensões úteis para UUID e hash de senha
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de clientes (tenants) que segmenta os ambientes
CREATE TABLE IF NOT EXISTS public.tenants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Usuários autenticáveis vinculados a um tenant
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email          citext NOT NULL,
    password_hash  text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

-- Opcional: tabela para registrar sessões ou tokens
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    refresh_token  text NOT NULL,
    expires_at     timestamptz NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Cadastre dois clientes com ambientes separados
INSERT INTO public.tenants (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Cliente Alpha'),
    ('00000000-0000-0000-0000-000000000002', 'Cliente Beta')
ON CONFLICT (name) DO NOTHING;

-- Exemplo de criação de usuários (substitua por e-mails reais)
-- Utilize crypt() para salvar apenas o hash da senha
INSERT INTO public.tenant_users (tenant_id, email, password_hash)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@cliente-alpha.com', crypt('senhaFort3!', gen_salt('bf'))),
    ('00000000-0000-0000-0000-000000000002', 'admin@cliente-beta.com', crypt('outraSenha#1', gen_salt('bf')))
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Para validar o login, compare a senha informada com o hash salvo:
-- SELECT id FROM public.tenant_users WHERE tenant_id = :tenantId AND email = :email
--   AND password_hash = crypt(:senhaInformada, password_hash);
