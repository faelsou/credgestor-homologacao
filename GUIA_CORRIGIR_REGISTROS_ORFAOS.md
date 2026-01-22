# 🔧 Guia: Como Corrigir Registros Órfãos

## 📋 Problema Identificado

A query de verificação de integridade identificou:
- **2 clientes sem tenant válido**
- **1 usuário sem tenant válido**
- 0 empréstimos sem cliente
- 0 parcelas sem empréstimo

## 🎯 Objetivo

Corrigir os registros órfãos atribuindo-os a tenants válidos ou desativando-os se não for possível identificar o tenant correto.

## 📝 Passo a Passo

### **PASSO 1: Identificar os Registros Órfãos**

Execute as queries da **PARTE 1** do arquivo `corrigir_registros_orfaos.sql`:

```sql
-- 1.1. Ver quais são os clientes sem tenant
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

-- 1.2. Ver qual é o usuário sem tenant
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
```

**Anote os IDs e informações dos registros encontrados!**

### **PASSO 2: Analisar o Histórico (Tentar Identificar Tenant Correto)**

Execute a query 2.2 para ver o histórico de auditoria dos clientes órfãos:

```sql
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
```

Isso mostrará qual usuário criou cada cliente órfão e qual deveria ser o `tenant_id` correto.

### **PASSO 3: Listar Tenants Disponíveis**

Execute a query 2.1 para ver todos os tenants válidos:

```sql
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
```

### **PASSO 4: Decidir a Estratégia de Correção**

Você tem 3 opções:

#### **OPÇÃO A: Mover para Tenant Correto (Recomendado)**

Se você conseguiu identificar o tenant correto através da auditoria:

1. **Para Clientes:**
```sql
-- Substitua 'TENANT_ID_CORRETO' pelo UUID do tenant correto
-- Substitua 'CLIENTE_ID' pelo ID do cliente órfão
UPDATE public.clients
SET tenant_id = 'TENANT_ID_CORRETO'::uuid,
    updated_at = NOW()
WHERE id = 'CLIENTE_ID'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = clients.tenant_id);
```

2. **Para Usuários:**
```sql
-- Substitua 'TENANT_ID_CORRETO' pelo UUID do tenant correto
-- Substitua 'TENANT_USER_ID' pelo ID do tenant_user órfão
UPDATE public.tenant_users
SET tenant_id = 'TENANT_ID_CORRETO'::uuid,
    updated_at = NOW()
WHERE id = 'TENANT_USER_ID'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_users.tenant_id);
```

#### **OPÇÃO B: Usar Correção Automática via Auditoria**

Se a auditoria tem registros suficientes, você pode usar o script automático (descomente e execute):

```sql
DO $$
DECLARE
    cliente_record RECORD;
    tenant_correto uuid;
    clientes_corrigidos int := 0;
BEGIN
    FOR cliente_record IN 
        SELECT c.id, c.tenant_id
        FROM public.clients c
        WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
    LOOP
        SELECT tu.tenant_id INTO tenant_correto
        FROM public.auditoria a
        JOIN public.tenant_users tu ON a.usuario_id = tu.user_id
        WHERE a.tabela = 'clients'
          AND a.acao = 'INSERT'
          AND a.registro_id = cliente_record.id
          AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tu.tenant_id)
        ORDER BY a.data_hora DESC
        LIMIT 1;
        
        IF tenant_correto IS NOT NULL THEN
            UPDATE public.clients
            SET tenant_id = tenant_correto,
                updated_at = NOW()
            WHERE id = cliente_record.id;
            
            clientes_corrigidos := clientes_corrigidos + 1;
            RAISE NOTICE 'Cliente % movido para tenant %', cliente_record.id, tenant_correto;
        END IF;
    END LOOP;
    
    -- Atualizar empréstimos e parcelas vinculados
    UPDATE public.loans l
    SET tenant_id = c.tenant_id, updated_at = NOW()
    FROM public.clients c
    WHERE l.client_id = c.id
      AND l.tenant_id != c.tenant_id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);
    
    UPDATE public.installments inst
    SET tenant_id = l.tenant_id, updated_at = NOW()
    FROM public.loans l
    WHERE inst.loan_id = l.id
      AND inst.tenant_id != l.tenant_id
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
    
    RAISE NOTICE 'Correção concluída: % clientes corrigidos', clientes_corrigidos;
END $$;
```

#### **OPÇÃO C: Desativar Registros (Último Recurso)**

Se não for possível identificar o tenant correto:

```sql
-- Desativar clientes órfãos
UPDATE public.clients
SET ativo = false,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = clients.tenant_id);

-- Desativar usuários órfãos
UPDATE public.tenant_users
SET ativo = false,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_users.tenant_id);
```

### **PASSO 5: Verificar a Correção**

Execute a query de verificação pós-correção:

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

### **PASSO 6: Verificar Integridade dos Dados Relacionados**

Execute para garantir que empréstimos e parcelas estão consistentes:

```sql
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
```

Se houver inconsistências, execute:

```sql
-- Corrigir empréstimos
UPDATE public.loans l
SET tenant_id = c.tenant_id,
    updated_at = NOW()
FROM public.clients c
WHERE l.client_id = c.id
  AND l.tenant_id != c.tenant_id
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id);

-- Corrigir parcelas
UPDATE public.installments inst
SET tenant_id = l.tenant_id,
    updated_at = NOW()
FROM public.loans l
WHERE inst.loan_id = l.id
  AND inst.tenant_id != l.tenant_id
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = l.tenant_id);
```

## ⚠️ Importante

1. **Faça backup antes de executar qualquer UPDATE!**
2. **Teste primeiro em um ambiente de desenvolvimento**
3. **Execute as queries de verificação antes e depois**
4. **Se não tiver certeza, use a OPÇÃO C (desativar) ao invés de mover para tenant errado**

## 📊 Exemplo Prático

Suponha que você encontrou:
- Cliente ID: `abc-123-def` sem tenant
- Na auditoria, viu que foi criado por usuário com `tenant_id = 'xyz-789-uvw'`

Execute:

```sql
-- 1. Verificar se o tenant existe
SELECT * FROM public.tenants WHERE id = 'xyz-789-uvw'::uuid;

-- 2. Se existir, corrigir o cliente
UPDATE public.clients
SET tenant_id = 'xyz-789-uvw'::uuid,
    updated_at = NOW()
WHERE id = 'abc-123-def'::uuid;

-- 3. Corrigir empréstimos vinculados
UPDATE public.loans l
SET tenant_id = 'xyz-789-uvw'::uuid,
    updated_at = NOW()
WHERE l.client_id = 'abc-123-def'::uuid;

-- 4. Corrigir parcelas vinculadas
UPDATE public.installments inst
SET tenant_id = 'xyz-789-uvw'::uuid,
    updated_at = NOW()
FROM public.loans l
WHERE inst.loan_id = l.id
  AND l.client_id = 'abc-123-def'::uuid;
```

## ✅ Checklist Final

- [ ] Identifiquei todos os registros órfãos
- [ ] Analisei o histórico de auditoria
- [ ] Decidi a estratégia de correção
- [ ] Fiz backup do banco de dados
- [ ] Executei as correções
- [ ] Verifiquei que não há mais registros órfãos
- [ ] Verifiquei a integridade dos dados relacionados
