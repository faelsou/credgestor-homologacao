-- ============================================================================
-- CREDGESTOR - Correção de Registros Órfãos
-- ============================================================================
-- Script para identificar e corrigir registros sem tenant válido
-- Problemas identificados:
--   - 2 clientes sem tenant
--   - 1 usuário sem tenant
-- ============================================================================

-- ============================================================================
-- PARTE 1: IDENTIFICAR REGISTROS ÓRFÃOS
-- ============================================================================

-- 1.1. Identificar clientes sem tenant válido
SELECT 
    'CLIENTES SEM TENANT VÁLIDO' as tipo_problema,
    c.id as cliente_id,
    c.nome as cliente_nome,
    c.cpf_cnpj,
    c.tenant_id as tenant_id_invalido,
    c.created_at as data_criacao,
    c.ativo
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
ORDER BY c.created_at DESC;

-- 1.2. Identificar usuários sem tenant válido
SELECT 
    'USUÁRIOS SEM TENANT VÁLIDO' as tipo_problema,
    tu.id as tenant_user_id,
    tu.email as usuario_email,
    tu.user_id,
    tu.tenant_id as tenant_id_invalido,
    tu.role,
    tu.ativo,
    tu.created_at as data_criacao
FROM public.tenant_users tu
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
ORDER BY tu.created_at DESC;

-- 1.3. Verificar se há empréstimos vinculados aos clientes órfãos
SELECT 
    'EMPRÉSTIMOS VINCULADOS A CLIENTES ÓRFÃOS' as tipo_problema,
    l.id as loan_id,
    l.client_id,
    c.nome as cliente_nome,
    c.tenant_id as tenant_id_invalido,
    l.amount,
    l.model,
    l.status,
    l.created_at
FROM public.loans l
JOIN public.clients c ON l.client_id = c.id
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
ORDER BY l.created_at DESC;

-- 1.4. Verificar se há parcelas vinculadas aos empréstimos órfãos
SELECT 
    'PARCELAS VINCULADAS A EMPRÉSTIMOS ÓRFÃOS' as tipo_problema,
    inst.id as installment_id,
    inst.loan_id,
    l.client_id,
    c.nome as cliente_nome,
    inst.number as numero_parcela,
    inst.amount,
    inst.status,
    inst.due_date
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
JOIN public.clients c ON l.client_id = c.id
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
ORDER BY inst.due_date DESC;

-- ============================================================================
-- PARTE 2: ANÁLISE PARA DECISÃO DE CORREÇÃO
-- ============================================================================

-- 2.1. Listar todos os tenants disponíveis (para escolher onde mover os registros)
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

-- 2.2. Verificar histórico de auditoria dos clientes órfãos (para identificar tenant correto)
SELECT 
    a.id as auditoria_id,
    a.usuario_id,
    a.registro_id as cliente_id,
    a.tabela,
    a.acao,
    a.dados_anteriores,
    a.dados_novos,
    a.data_hora,
    tu.email as usuario_email,
    tu.tenant_id as tenant_id_do_usuario
FROM public.auditoria a
JOIN public.clients c ON a.registro_id = c.id
LEFT JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
WHERE a.tabela = 'clients'
  AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
ORDER BY a.data_hora DESC;

-- 2.3. Verificar histórico de auditoria dos usuários órfãos
SELECT 
    a.id as auditoria_id,
    a.usuario_id,
    a.registro_id,
    a.tabela,
    a.acao,
    a.dados_anteriores,
    a.dados_novos,
    a.data_hora,
    tu.email as usuario_email,
    tu.tenant_id as tenant_id_invalido
FROM public.auditoria a
JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
ORDER BY a.data_hora DESC;

-- ============================================================================
-- PARTE 3: QUERIES DE CORREÇÃO (EXECUTAR COM CUIDADO!)
-- ============================================================================

-- ⚠️ ATENÇÃO: Execute estas queries apenas após identificar o tenant correto!
-- ⚠️ Recomenda-se fazer backup antes de executar!

-- 3.1. OPÇÃO A: Desativar clientes órfãos (se não houver como identificar tenant correto)
/*
UPDATE public.clients
SET ativo = false,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = clients.tenant_id);
*/

-- 3.2. OPÇÃO B: Mover clientes órfãos para um tenant específico
-- Substitua 'TENANT_ID_AQUI' pelo UUID do tenant correto
/*
UPDATE public.clients
SET tenant_id = 'TENANT_ID_AQUI'::uuid,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = clients.tenant_id);
*/

-- 3.3. OPÇÃO C: Mover clientes órfãos para o tenant do usuário que os criou (via auditoria)
/*
UPDATE public.clients c
SET tenant_id = (
    SELECT tu.tenant_id 
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = c.id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
    ORDER BY a.data_hora DESC
    LIMIT 1
),
updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
  AND EXISTS (
    SELECT 1 
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = c.id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
  );
*/

-- 3.4. OPÇÃO A: Desativar usuários órfãos
/*
UPDATE public.tenant_users
SET ativo = false,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_users.tenant_id);
*/

-- 3.5. OPÇÃO B: Mover usuários órfãos para um tenant específico
-- Substitua 'TENANT_ID_AQUI' pelo UUID do tenant correto
/*
UPDATE public.tenant_users
SET tenant_id = 'TENANT_ID_AQUI'::uuid,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_users.tenant_id);
*/

-- 3.6. Atualizar tenant_id dos empréstimos vinculados aos clientes corrigidos
/*
UPDATE public.loans l
SET tenant_id = c.tenant_id,
    updated_at = NOW()
FROM public.clients c
WHERE l.client_id = c.id
  AND l.tenant_id != c.tenant_id
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
*/

-- 3.7. Atualizar tenant_id das parcelas vinculadas aos empréstimos corrigidos
/*
UPDATE public.installments inst
SET tenant_id = l.tenant_id,
    updated_at = NOW()
FROM public.loans l
WHERE inst.loan_id = l.id
  AND inst.tenant_id != l.tenant_id
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
*/

-- ============================================================================
-- PARTE 4: VERIFICAÇÃO PÓS-CORREÇÃO
-- ============================================================================

-- 4.1. Verificar se ainda há registros órfãos
SELECT 
    'Clientes sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)

UNION ALL

SELECT 
    'Empréstimos sem cliente' as problema,
    COUNT(*) as quantidade
FROM public.loans l
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = l.client_id)

UNION ALL

SELECT 
    'Parcelas sem empréstimo' as problema,
    COUNT(*) as quantidade
FROM public.installments inst
WHERE NOT EXISTS (SELECT 1 FROM public.loans l WHERE l.id = inst.loan_id)

UNION ALL

SELECT 
    'Usuários sem tenant' as problema,
    COUNT(*) as quantidade
FROM public.tenant_users tu
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id);

-- 4.2. Verificar integridade dos dados após correção
SELECT 
    'Empréstimos com tenant diferente do cliente' as problema,
    COUNT(*) as quantidade
FROM public.loans l
JOIN public.clients c ON l.client_id = c.id
WHERE l.tenant_id != c.tenant_id

UNION ALL

SELECT 
    'Parcelas com tenant diferente do empréstimo' as problema,
    COUNT(*) as quantidade
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
WHERE inst.tenant_id != l.tenant_id;

-- ============================================================================
-- PARTE 5: SCRIPT DE CORREÇÃO AUTOMÁTICA (USAR COM CUIDADO!)
-- ============================================================================

-- Este script tenta corrigir automaticamente usando a auditoria
-- ⚠️ EXECUTE APENAS SE TIVER CERTEZA DO RESULTADO!

/*
DO $$
DECLARE
    cliente_record RECORD;
    tenant_correto uuid;
    usuarios_corrigidos int := 0;
    clientes_corrigidos int := 0;
BEGIN
    -- Corrigir clientes usando auditoria
    FOR cliente_record IN 
        SELECT c.id, c.tenant_id
        FROM public.clients c
        WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
    LOOP
        -- Tentar encontrar tenant correto via auditoria
        SELECT tu.tenant_id INTO tenant_correto
        FROM public.auditoria a
        JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
        WHERE a.tabela = 'clients'
          AND a.acao = 'INSERT'
          AND a.registro_id = cliente_record.id
          AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
        ORDER BY a.data_hora DESC
        LIMIT 1;
        
        -- Se encontrou tenant válido, atualizar
        IF tenant_correto IS NOT NULL THEN
            UPDATE public.clients
            SET tenant_id = tenant_correto,
                updated_at = NOW()
            WHERE id = cliente_record.id;
            
            clientes_corrigidos := clientes_corrigidos + 1;
            
            RAISE NOTICE 'Cliente % movido para tenant %', cliente_record.id, tenant_correto;
        ELSE
            RAISE WARNING 'Não foi possível encontrar tenant correto para cliente %', cliente_record.id;
        END IF;
    END LOOP;
    
    -- Corrigir empréstimos vinculados
    UPDATE public.loans l
    SET tenant_id = c.tenant_id,
        updated_at = NOW()
    FROM public.clients c
    WHERE l.client_id = c.id
      AND l.tenant_id != c.tenant_id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
    
    -- Corrigir parcelas vinculadas
    UPDATE public.installments inst
    SET tenant_id = l.tenant_id,
        updated_at = NOW()
    FROM public.loans l
    WHERE inst.loan_id = l.id
      AND inst.tenant_id != l.tenant_id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
    
    RAISE NOTICE 'Correção concluída: % clientes corrigidos', clientes_corrigidos;
END $$;
*/

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
