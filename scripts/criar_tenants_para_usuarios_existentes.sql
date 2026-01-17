-- ============================================================================
-- CREDGESTOR - Criar Tenants para Usuários Existentes
-- ============================================================================
-- Este script:
-- 1. Cria a tabela tenants se não existir
-- 2. Verifica usuários em tenant_users que não têm tenant correspondente
-- 3. Cria tenants para esses usuários
-- REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela tenants se não existir
-- ============================================================================

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

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.tenants IS 'Organizações/Empresas que usam o sistema';

-- ============================================================================
-- PASSO 2: Verificar situação atual
-- ============================================================================

DO $$
DECLARE
    v_total_tenant_users integer;
    v_total_tenants integer;
    v_usuarios_sem_tenant integer;
BEGIN
    -- Contar usuários em tenant_users
    SELECT COUNT(DISTINCT tu.id) INTO v_total_tenant_users
    FROM public.tenant_users tu
    WHERE tu.ativo = true;
    
    -- Contar tenants existentes
    SELECT COUNT(*) INTO v_total_tenants
    FROM public.tenants;
    
    -- Contar usuários cujo tenant_id não existe em tenants
    SELECT COUNT(*) INTO v_usuarios_sem_tenant
    FROM public.tenant_users tu
    WHERE tu.ativo = true
    AND NOT EXISTS (
        SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 SITUAÇÃO ATUAL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Total de usuários ativos em tenant_users: %', v_total_tenant_users;
    RAISE NOTICE 'Total de tenants existentes: %', v_total_tenants;
    RAISE NOTICE 'Usuários sem tenant correspondente: %', v_usuarios_sem_tenant;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 3: Listar usuários que precisam de tenant
-- ============================================================================

SELECT 
    'USUÁRIOS QUE PRECISAM DE TENANT' as info,
    tu.id as tenant_user_id,
    tu.tenant_id as tenant_id_atual,
    tu.email as email,
    tu.user_id as user_id,
    u.name as nome_usuario,
    tu.role as role,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id) 
        THEN '✅ Tenant existe'
        ELSE '❌ Tenant não existe - SERÁ CRIADO'
    END as status_tenant
FROM public.tenant_users tu
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.ativo = true
ORDER BY 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id) 
        THEN 1 
        ELSE 0 
    END,
    tu.email;

-- ============================================================================
-- PASSO 4: Criar tenants para usuários que não têm
-- ============================================================================

DO $$
DECLARE
    v_record RECORD;
    v_new_tenant_id uuid;
    v_tenant_name text;
    v_tenant_slug text;
    v_created_count integer := 0;
    v_skipped_count integer := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 CRIANDO TENANTS PARA USUÁRIOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Para cada usuário em tenant_users que não tem tenant correspondente
    FOR v_record IN 
        SELECT DISTINCT
            tu.tenant_id as old_tenant_id,
            tu.email,
            COALESCE(u.name, SPLIT_PART(tu.email, '@', 1)) as user_name,
            tu.role
        FROM public.tenant_users tu
        LEFT JOIN public.users u ON u.id = tu.user_id
        WHERE tu.ativo = true
        AND NOT EXISTS (
            SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id
        )
    LOOP
        -- Verificar se já existe um tenant com o mesmo ID (pode ter sido criado em outra iteração)
        IF EXISTS (SELECT 1 FROM public.tenants WHERE id = v_record.old_tenant_id) THEN
            RAISE NOTICE '⏭️  Tenant já existe para % (ID: %)', v_record.email, v_record.old_tenant_id;
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Criar nome do tenant
        v_tenant_name := 'Aplicação - ' || v_record.user_name;
        
        -- Criar slug único
        v_tenant_slug := LOWER(REGEXP_REPLACE(v_record.user_name, '[^a-zA-Z0-9]', '-', 'g'));
        v_tenant_slug := SUBSTRING(v_tenant_slug FROM 1 FOR 30) || '-' || SUBSTRING(v_record.old_tenant_id::text FROM 1 FOR 8);
        
        -- Usar o tenant_id existente em tenant_users (para manter consistência)
        v_new_tenant_id := v_record.old_tenant_id;
        
        BEGIN
            -- Inserir novo tenant
            INSERT INTO public.tenants (
                id,
                name,
                slug,
                email,
                ativo,
                created_at,
                updated_at
            ) VALUES (
                v_new_tenant_id,
                v_tenant_name,
                v_tenant_slug,
                v_record.email,
                true,
                now(),
                now()
            );
            
            RAISE NOTICE '✅ Tenant criado: % (ID: %) para %', v_tenant_name, v_new_tenant_id, v_record.email;
            v_created_count := v_created_count + 1;
            
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE NOTICE '⚠️  Tenant com ID % já existe (pode ter sido criado por outro usuário)', v_new_tenant_id;
                v_skipped_count := v_skipped_count + 1;
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Erro ao criar tenant para %: %', v_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RESUMO';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tenants criados: %', v_created_count;
    RAISE NOTICE 'Tenants ignorados (já existiam): %', v_skipped_count;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 5: Verificar resultado final
-- ============================================================================

SELECT 
    'RESULTADO FINAL' as info,
    COUNT(DISTINCT t.id) as total_tenants,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN tu.ativo = true THEN tu.user_id END) as usuarios_ativos,
    COUNT(DISTINCT CASE 
        WHEN tu.tenant_id IN (
            SELECT tenant_id
            FROM public.tenant_users
            WHERE ativo = true
            GROUP BY tenant_id
            HAVING COUNT(user_id) > 1
        ) THEN tu.tenant_id
    END) as tenants_compartilhados,
    COUNT(DISTINCT CASE 
        WHEN tu.tenant_id IN (
            SELECT tenant_id
            FROM public.tenant_users
            WHERE ativo = true
            GROUP BY tenant_id
            HAVING COUNT(user_id) = 1
        ) THEN tu.tenant_id
    END) as tenants_unicos
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id;

-- ============================================================================
-- PASSO 6: Listar todos os tenants criados
-- ============================================================================

SELECT 
    'TENANTS CRIADOS' as info,
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.email as tenant_email,
    COUNT(tu.user_id) as total_usuarios,
    STRING_AGG(tu.email, ', ' ORDER BY tu.email) as usuarios_emails
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
GROUP BY t.id, t.name, t.slug, t.email
ORDER BY t.created_at DESC;
