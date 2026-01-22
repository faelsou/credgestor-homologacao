-- ============================================================================
-- CREDGESTOR - Correção de Registros Órfãos Específicos
-- ============================================================================
-- Script para corrigir os registros órfãos identificados:
--   - 2 clientes sem tenant válido (tenant_id: 00000000-0000-0000-0000-000000000004)
--   - 1 usuário sem tenant válido (tenant_id: 00000000-0000-0000-0000-000000000864)
-- ============================================================================

-- ============================================================================
-- PARTE 1: IDENTIFICAR TENANT CORRETO VIA AUDITORIA
-- ============================================================================

-- 1.1. Ver histórico de auditoria para os clientes órfãos
SELECT 
    'AUDITORIA - Cliente: Aranha amigo' as info,
    a.id as auditoria_id,
    a.registro_id as cliente_id,
    c.nome as cliente_nome,
    tu.email as usuario_criador,
    tu.tenant_id as tenant_id_correto,
    a.data_hora,
    a.dados_novos
FROM public.auditoria a
JOIN public.clients c ON a.registro_id = c.id
LEFT JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
WHERE a.tabela = 'clients'
  AND a.registro_id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid
ORDER BY a.data_hora DESC;

SELECT 
    'AUDITORIA - Cliente: Sandra Rodrigues' as info,
    a.id as auditoria_id,
    a.registro_id as cliente_id,
    c.nome as cliente_nome,
    tu.email as usuario_criador,
    tu.tenant_id as tenant_id_correto,
    a.data_hora,
    a.dados_novos
FROM public.auditoria a
JOIN public.clients c ON a.registro_id = c.id
LEFT JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
WHERE a.tabela = 'clients'
  AND a.registro_id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
ORDER BY a.data_hora DESC;

-- 1.2. Ver histórico de auditoria para o usuário órfão
SELECT 
    'AUDITORIA - Usuário: rodrigoconecteloja@gmail.com' as info,
    a.id as auditoria_id,
    a.usuario_id,
    a.tabela,
    a.acao,
    a.data_hora,
    a.dados_novos
FROM public.auditoria a
WHERE a.usuario_id = (
    SELECT user_id FROM public.tenant_users 
    WHERE id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid
)
ORDER BY a.data_hora DESC
LIMIT 10;

-- 1.3. Verificar se há outros registros com os mesmos tenant_ids inválidos
SELECT 
    'OUTROS REGISTROS COM TENANT_ID INVÁLIDO: 00000000-0000-0000-0000-000000000004' as info,
    'clients' as tabela,
    COUNT(*) as quantidade
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'OUTROS REGISTROS COM TENANT_ID INVÁLIDO: 00000000-0000-0000-0000-000000000004' as info,
    'loans' as tabela,
    COUNT(*) as quantidade
FROM public.loans
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'OUTROS REGISTROS COM TENANT_ID INVÁLIDO: 00000000-0000-0000-0000-000000000004' as info,
    'installments' as tabela,
    COUNT(*) as quantidade
FROM public.installments
WHERE tenant_id = '00000000-0000-0000-0000-000000000004'::uuid

UNION ALL

SELECT 
    'OUTROS REGISTROS COM TENANT_ID INVÁLIDO: 00000000-0000-0000-0000-000000000864' as info,
    'tenant_users' as tabela,
    COUNT(*) as quantidade
FROM public.tenant_users
WHERE tenant_id = '00000000-0000-0000-0000-000000000864'::uuid;

-- 1.4. Listar todos os tenants válidos disponíveis
SELECT 
    t.id as tenant_id,
    t.name as tenant_nome,
    t.email as tenant_email,
    t.ativo,
    COUNT(DISTINCT tu.user_id) as total_usuarios,
    COUNT(DISTINCT c.id) as total_clientes,
    t.created_at
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
LEFT JOIN public.clients c ON t.id = c.tenant_id AND c.ativo = true
WHERE t.ativo = true
GROUP BY t.id, t.name, t.email, t.ativo, t.created_at
ORDER BY t.created_at DESC;

-- ============================================================================
-- PARTE 2: QUERIES DE CORREÇÃO (EXECUTAR APÓS IDENTIFICAR TENANT CORRETO)
-- ============================================================================

-- ⚠️ IMPORTANTE: Substitua 'TENANT_ID_CORRETO_AQUI' pelo UUID do tenant correto
-- ⚠️ Execute primeiro as queries da PARTE 1 para identificar o tenant correto!

-- 2.1. Corrigir cliente "Aranha amigo"
-- Primeiro, identifique o tenant correto executando a query 1.1 acima
-- Depois, descomente e execute esta query substituindo o tenant_id:

/*
UPDATE public.clients
SET tenant_id = 'TENANT_ID_CORRETO_AQUI'::uuid,  -- ⚠️ SUBSTITUA AQUI
    updated_at = NOW()
WHERE id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;
*/

-- 2.2. Corrigir cliente "Sandra Rodrigues"
/*
UPDATE public.clients
SET tenant_id = 'TENANT_ID_CORRETO_AQUI'::uuid,  -- ⚠️ SUBSTITUA AQUI
    updated_at = NOW()
WHERE id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid;
*/

-- 2.3. Corrigir usuário "rodrigoconecteloja@gmail.com"
/*
UPDATE public.tenant_users
SET tenant_id = 'TENANT_ID_CORRETO_AQUI'::uuid,  -- ⚠️ SUBSTITUA AQUI
    updated_at = NOW()
WHERE id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid;
*/

-- 2.4. Corrigir empréstimos vinculados aos clientes (se houver)
/*
UPDATE public.loans l
SET tenant_id = c.tenant_id,
    updated_at = NOW()
FROM public.clients c
WHERE l.client_id = c.id
  AND c.id IN (
      '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
      '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
  )
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
*/

-- 2.5. Corrigir parcelas vinculadas aos empréstimos (se houver)
/*
UPDATE public.installments inst
SET tenant_id = l.tenant_id,
    updated_at = NOW()
FROM public.loans l
WHERE inst.loan_id = l.id
  AND l.client_id IN (
      '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
      '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
  )
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
*/

-- ============================================================================
-- PARTE 3: CORREÇÃO AUTOMÁTICA VIA AUDITORIA (ALTERNATIVA)
-- ============================================================================

-- Esta query tenta corrigir automaticamente usando o tenant_id do usuário que criou o registro
-- ⚠️ EXECUTE APENAS SE TIVER CERTEZA!

/*
DO $$
DECLARE
    tenant_correto_cliente_1 uuid;
    tenant_correto_cliente_2 uuid;
    tenant_correto_usuario uuid;
BEGIN
    -- Tentar encontrar tenant correto para cliente 1 (Aranha amigo)
    SELECT tu.tenant_id INTO tenant_correto_cliente_1
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
    ORDER BY a.data_hora DESC
    LIMIT 1;
    
    -- Tentar encontrar tenant correto para cliente 2 (Sandra Rodrigues)
    SELECT tu.tenant_id INTO tenant_correto_cliente_2
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
    ORDER BY a.data_hora DESC
    LIMIT 1;
    
    -- Tentar encontrar tenant correto para o usuário
    -- Verificar se há outros registros do mesmo usuário com tenant válido
    SELECT DISTINCT tu2.tenant_id INTO tenant_correto_usuario
    FROM public.tenant_users tu1
    JOIN public.users u ON tu1.user_id = u.id
    JOIN public.tenant_users tu2 ON u.id = tu2.user_id
    WHERE tu1.id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid
      AND tu2.id != tu1.id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu2.tenant_id)
    LIMIT 1;
    
    -- Corrigir cliente 1
    IF tenant_correto_cliente_1 IS NOT NULL THEN
        UPDATE public.clients
        SET tenant_id = tenant_correto_cliente_1,
            updated_at = NOW()
        WHERE id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;
        
        RAISE NOTICE '✅ Cliente "Aranha amigo" corrigido para tenant %', tenant_correto_cliente_1;
    ELSE
        RAISE WARNING '⚠️ Não foi possível encontrar tenant correto para cliente "Aranha amigo"';
    END IF;
    
    -- Corrigir cliente 2
    IF tenant_correto_cliente_2 IS NOT NULL THEN
        UPDATE public.clients
        SET tenant_id = tenant_correto_cliente_2,
            updated_at = NOW()
        WHERE id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid;
        
        RAISE NOTICE '✅ Cliente "Sandra Rodrigues" corrigido para tenant %', tenant_correto_cliente_2;
    ELSE
        RAISE WARNING '⚠️ Não foi possível encontrar tenant correto para cliente "Sandra Rodrigues"';
    END IF;
    
    -- Corrigir usuário
    IF tenant_correto_usuario IS NOT NULL THEN
        UPDATE public.tenant_users
        SET tenant_id = tenant_correto_usuario,
            updated_at = NOW()
        WHERE id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid;
        
        RAISE NOTICE '✅ Usuário "rodrigoconecteloja@gmail.com" corrigido para tenant %', tenant_correto_usuario;
    ELSE
        RAISE WARNING '⚠️ Não foi possível encontrar tenant correto para usuário "rodrigoconecteloja@gmail.com"';
    END IF;
    
    -- Corrigir empréstimos vinculados
    UPDATE public.loans l
    SET tenant_id = c.tenant_id,
        updated_at = NOW()
    FROM public.clients c
    WHERE l.client_id = c.id
      AND c.id IN (
          '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
          '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
      )
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
    
    -- Corrigir parcelas vinculadas
    UPDATE public.installments inst
    SET tenant_id = l.tenant_id,
        updated_at = NOW()
    FROM public.loans l
    WHERE inst.loan_id = l.id
      AND l.client_id IN (
          '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
          '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
      )
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
    
    RAISE NOTICE '✅ Correção concluída!';
END $$;
*/

-- ============================================================================
-- PARTE 4: VERIFICAÇÃO PÓS-CORREÇÃO
-- ============================================================================

-- 4.1. Verificar se os registros foram corrigidos
SELECT 
    'VERIFICAÇÃO - Cliente: Aranha amigo' as info,
    c.id,
    c.nome,
    c.tenant_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id) 
        THEN '✅ Tenant válido' 
        ELSE '❌ Tenant inválido' 
    END as status
FROM public.clients c
WHERE c.id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;

SELECT 
    'VERIFICAÇÃO - Cliente: Sandra Rodrigues' as info,
    c.id,
    c.nome,
    c.tenant_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id) 
        THEN '✅ Tenant válido' 
        ELSE '❌ Tenant inválido' 
    END as status
FROM public.clients c
WHERE c.id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid;

SELECT 
    'VERIFICAÇÃO - Usuário: rodrigoconecteloja@gmail.com' as info,
    tu.id,
    tu.email,
    tu.tenant_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id) 
        THEN '✅ Tenant válido' 
        ELSE '❌ Tenant inválido' 
    END as status
FROM public.tenant_users tu
WHERE tu.id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid;

-- 4.2. Verificar se ainda há registros órfãos
SELECT 
    'Clientes sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)

UNION ALL

SELECT 
    'Usuários sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.tenant_users tu
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id);

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
