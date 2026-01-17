# 🚨 Problema Crítico: default_tenant_id Causando Compartilhamento

## 🔍 Problema Identificado

O backend estava usando `settings.default_tenant_id` como fallback quando o usuário não tinha `tenant_id` nos metadados. Isso fazia com que **todos os usuários sem tenant_id nos metadados usassem o mesmo tenant**, causando compartilhamento de dados.

### Código Problemático (ANTES):

```python
def _authenticate_user(payload: LoginRequest):
    settings = get_settings()
    tenant_id = payload.tenant_id or settings.default_tenant_id  # ❌ PROBLEMA!
```

### Fluxo do Problema:

1. Usuário faz login sem `tenant_id` no payload (correto)
2. Backend tenta resolver `tenant_id` dos metadados do usuário
3. **Se não encontrar nos metadados, usa `default_tenant_id`** ❌
4. Todos os usuários sem `tenant_id` nos metadados acabam usando o mesmo `default_tenant_id`
5. **Resultado: Dados compartilhados entre usuários!**

## ✅ Correção Implementada

### Código Corrigido (AGORA):

```python
def _authenticate_user(payload: LoginRequest):
    # REGRA CRÍTICA: NÃO usar default_tenant_id como fallback
    # Cada usuário DEVE ter seu próprio tenant_id nos metadados
    tenant_id = payload.tenant_id  # Não usar default_tenant_id
```

### Fluxo Corrigido:

1. Usuário faz login sem `tenant_id` no payload (correto)
2. Backend tenta resolver `tenant_id` dos metadados do usuário
3. Se não encontrar nos metadados, busca do `tenant_users` por email
4. Se encontrar múltiplos tenants, exige que o usuário informe qual usar
5. **Se não encontrar nenhum, retorna erro** ✅
6. **Resultado: Cada usuário usa seu próprio tenant_id!**

## 🔍 Logs de Debug Adicionados

Para facilitar a investigação, foram adicionados logs detalhados:

### `_authenticate_user`:
- Log do `tenant_id` do payload
- Log do `resolved_tenant_id`

### `_resolve_tenant_id`:
- Log do `requested_tenant_id`
- Log do `tenant_id` dos metadados (user_metadata e app_metadata)
- Log do `tenant_id` resolvido
- Log se está usando metadados, email ou tenant solicitado
- Log de erros se houver conflito

## ⚠️ Breaking Change

**Usuários sem `tenant_id` nos metadados NÃO conseguirão fazer login.**

### Solução:

1. **Garantir que todos os usuários tenham `tenant_id` nos metadados:**
   ```sql
   -- Verificar usuários sem tenant_id
   SELECT email, user_metadata, app_metadata 
   FROM auth.users 
   WHERE (user_metadata->>'tenant_id' IS NULL 
          AND (app_metadata->>'tenant_id' IS NULL));
   ```

2. **Atualizar metadados dos usuários:**
   - Usar os scripts de migração: `scripts/migrar_usuarios_para_tenants_unicos.py`
   - Ou atualizar manualmente via Supabase Dashboard

3. **Verificar se os usuários estão vinculados em `tenant_users`:**
   ```sql
   SELECT tu.email, tu.tenant_id, t.name as tenant_name
   FROM public.tenant_users tu
   JOIN public.tenants t ON t.id = tu.tenant_id
   WHERE tu.ativo = true;
   ```

## 📋 Checklist de Verificação

- [x] Removido fallback para `default_tenant_id`
- [x] Adicionados logs de debug
- [x] Corrigido script `debug_tenant_isolation.py`
- [ ] Verificar se todos os usuários têm `tenant_id` nos metadados
- [ ] Verificar se todos os usuários estão em `tenant_users`
- [ ] Testar login com cada usuário
- [ ] Verificar logs do backend ao fazer login

## 🔧 Como Verificar

1. **Executar script de verificação:**
   ```bash
   python3 scripts/debug_tenant_isolation.py
   ```

2. **Verificar logs do backend:**
   - Fazer login com cada usuário
   - Verificar os logs de debug no console do backend
   - Verificar se o `tenant_id` resolvido está correto

3. **Verificar metadados dos usuários:**
   ```sql
   SELECT 
     email,
     user_metadata->>'tenant_id' as user_metadata_tenant_id,
     app_metadata->>'tenant_id' as app_metadata_tenant_id
   FROM auth.users;
   ```

## 🎯 Resultado Esperado

Após a correção:
- ✅ Cada usuário usa seu próprio `tenant_id`
- ✅ Dados isolados por tenant
- ✅ Sem compartilhamento de dados entre usuários
- ✅ Erro claro se usuário não tiver `tenant_id`
