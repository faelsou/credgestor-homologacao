# ⚡ Execução Rápida - Correção de Registros Órfãos

## 📋 Registros Identificados

1. **Cliente: "Aranha amigo"**
   - ID: `69f58d3a-233b-4bfa-acel-d525b148a8a3`
   - Tenant inválido: `00000000-0000-0000-0000-000000000004`

2. **Cliente: "Sandra Rodrigues"**
   - ID: `6dfb8324-37fe-4c31-9186-b7d303a14f6e`
   - Tenant inválido: `00000000-0000-0000-0000-000000000004`

3. **Usuário: rodrigoconecteloja@gmail.com**
   - ID: `d98be1cf-d29a-4ace-936b-14d25e2da8dc`
   - Tenant inválido: `00000000-0000-0000-0000-000000000864`

## 🚀 Passo a Passo Rápido

### **PASSO 1: Identificar Tenant Correto**

Execute no Supabase SQL Editor:

```sql
-- Ver histórico de auditoria para identificar quem criou os registros
SELECT 
    a.registro_id as cliente_id,
    c.nome as cliente_nome,
    tu.email as usuario_criador,
    tu.tenant_id as tenant_id_correto,
    a.data_hora
FROM public.auditoria a
JOIN public.clients c ON a.registro_id = c.id
LEFT JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
WHERE a.tabela = 'clients'
  AND a.registro_id IN (
      '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid,
      '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
  )
ORDER BY a.data_hora DESC;
```

**Anote o `tenant_id_correto` encontrado!**

### **PASSO 2: Listar Tenants Válidos (Alternativa)**

Se a auditoria não ajudar, liste todos os tenants válidos:

```sql
SELECT 
    t.id as tenant_id,
    t.name as tenant_nome,
    t.email,
    COUNT(DISTINCT tu.user_id) as total_usuarios
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.ativo = true
WHERE t.ativo = true
GROUP BY t.id, t.name, t.email
ORDER BY t.created_at DESC;
```

**Escolha o tenant correto para cada registro!**

### **PASSO 3: Executar Correção**

Substitua `'TENANT_ID_CORRETO'` pelo UUID do tenant correto e execute:

```sql
-- Corrigir cliente "Aranha amigo"
UPDATE public.clients
SET tenant_id = 'TENANT_ID_CORRETO'::uuid,
    updated_at = NOW()
WHERE id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;

-- Corrigir cliente "Sandra Rodrigues"
UPDATE public.clients
SET tenant_id = 'TENANT_ID_CORRETO'::uuid,
    updated_at = NOW()
WHERE id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid;

-- Corrigir usuário "rodrigoconecteloja@gmail.com"
UPDATE public.tenant_users
SET tenant_id = 'TENANT_ID_CORRETO'::uuid,
    updated_at = NOW()
WHERE id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid;

-- Corrigir empréstimos vinculados (se houver)
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

-- Corrigir parcelas vinculadas (se houver)
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
```

### **PASSO 4: Verificar Correção**

Execute para confirmar:

```sql
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
```

**Resultado esperado:** Ambas as quantidades devem ser **0**.

## 🔄 Opção Automática (Usar com Cuidado!)

Se preferir, execute o script automático que tenta identificar o tenant correto via auditoria:

```sql
DO $$
DECLARE
    tenant_correto_cliente_1 uuid;
    tenant_correto_cliente_2 uuid;
    tenant_correto_usuario uuid;
BEGIN
    -- Buscar tenant correto para cliente 1
    SELECT tu.tenant_id INTO tenant_correto_cliente_1
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
    ORDER BY a.data_hora DESC
    LIMIT 1;
    
    -- Buscar tenant correto para cliente 2
    SELECT tu.tenant_id INTO tenant_correto_cliente_2
    FROM public.auditoria a
    JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
    WHERE a.tabela = 'clients'
      AND a.acao = 'INSERT'
      AND a.registro_id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
    ORDER BY a.data_hora DESC
    LIMIT 1;
    
    -- Buscar tenant correto para usuário
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
        SET tenant_id = tenant_correto_cliente_1, updated_at = NOW()
        WHERE id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;
        RAISE NOTICE '✅ Cliente 1 corrigido para tenant %', tenant_correto_cliente_1;
    END IF;
    
    -- Corrigir cliente 2
    IF tenant_correto_cliente_2 IS NOT NULL THEN
        UPDATE public.clients
        SET tenant_id = tenant_correto_cliente_2, updated_at = NOW()
        WHERE id = '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid;
        RAISE NOTICE '✅ Cliente 2 corrigido para tenant %', tenant_correto_cliente_2;
    END IF;
    
    -- Corrigir usuário
    IF tenant_correto_usuario IS NOT NULL THEN
        UPDATE public.tenant_users
        SET tenant_id = tenant_correto_usuario, updated_at = NOW()
        WHERE id = 'd98be1cf-d29a-4ace-936b-14d25e2da8dc'::uuid;
        RAISE NOTICE '✅ Usuário corrigido para tenant %', tenant_correto_usuario;
    END IF;
    
    -- Corrigir empréstimos e parcelas vinculados
    UPDATE public.loans l
    SET tenant_id = c.tenant_id, updated_at = NOW()
    FROM public.clients c
    WHERE l.client_id = c.id
      AND c.id IN ('69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid, '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid)
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
    
    UPDATE public.installments inst
    SET tenant_id = l.tenant_id, updated_at = NOW()
    FROM public.loans l
    WHERE inst.loan_id = l.id
      AND l.client_id IN ('69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid, '6dfb8324-37fe-4c31-9186-b7d303a14f6e'::uuid)
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
END $$;
```

## ⚠️ Importante

1. **Faça backup antes de executar!**
2. **Execute primeiro as queries de identificação (PASSO 1)**
3. **Verifique o resultado antes de prosseguir**
4. **Use a opção automática apenas se tiver certeza**

## 📝 Exemplo Prático

Se você descobrir que o tenant correto é `abc-123-def-456`:

```sql
-- Substitua 'abc-123-def-456' pelo UUID real
UPDATE public.clients
SET tenant_id = 'abc-123-def-456'::uuid,
    updated_at = NOW()
WHERE id = '69f58d3a-233b-4bfa-acel-d525b148a8a3'::uuid;
```

**NÃO use placeholders como `'TENANT_ID_CORRETO'` - eles causarão erro!**
