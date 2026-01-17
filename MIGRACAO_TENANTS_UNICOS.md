# 🔄 Migração: Garantir Tenant Único para Cada Usuário

## 📋 Situação Atual

Os usuários já estão cadastrados no banco de dados. Alguns podem estar compartilhando o mesmo tenant, o que viola a regra importante:

**Cada usuário deve ter sua própria aplicação separadamente.**

## 🔍 Verificar Situação Atual

Antes de migrar, verifique quais tenants estão compartilhados:

### Opção 1: Via SQL (Recomendado)

Execute o script SQL no Supabase SQL Editor:

```bash
# No Supabase SQL Editor, execute:
cat scripts/verificar_tenants_compartilhados.sql
```

Ou execute diretamente:

```sql
-- Ver tenants compartilhados
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tu.user_id) as total_usuarios,
    STRING_AGG(tu.email, ', ') as usuarios_emails
FROM public.tenants t
INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
WHERE tu.ativo = true
GROUP BY t.id, t.name
HAVING COUNT(tu.user_id) > 1
ORDER BY total_usuarios DESC;
```

### Opção 2: Via Script Python

```bash
python3 scripts/migrar_usuarios_para_tenants_unicos.py --dry-run
```

O modo `--dry-run` apenas mostra o que seria feito, sem fazer alterações.

## 🔧 Executar Migração

### Passo 1: Backup (IMPORTANTE!)

Antes de executar a migração, faça backup do banco de dados:

```bash
# Via Supabase Dashboard
# 1. Acesse: https://app.supabase.com
# 2. Vá em Database > Backups
# 3. Crie um backup manual
```

### Passo 2: Simulação (Dry Run)

Execute primeiro em modo de simulação para ver o que será feito:

```bash
cd /var/www/credgestor-homologacao
python3 scripts/migrar_usuarios_para_tenants_unicos.py --dry-run
```

Isso mostrará:
- Quais usuários compartilham tenants
- Quais usuários serão migrados
- Quais novos tenants serão criados

### Passo 3: Executar Migração

Se a simulação estiver correta, execute a migração real:

```bash
python3 scripts/migrar_usuarios_para_tenants_unicos.py
```

O script irá:
1. ✅ Identificar usuários que compartilham tenants
2. ✅ Criar um novo tenant exclusivo para cada usuário que precisa
3. ✅ Atualizar metadados no Supabase Auth
4. ✅ Atualizar registros em `public.users` e `public.tenant_users`
5. ✅ Verificar o resultado final

### Passo 4: Verificar Resultado

Após a migração, verifique se todos os usuários agora têm tenants únicos:

```sql
-- Deve retornar 0 resultados (nenhum tenant compartilhado)
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tu.user_id) as total_usuarios
FROM public.tenants t
INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
WHERE tu.ativo = true
GROUP BY t.id, t.name
HAVING COUNT(tu.user_id) > 1;
```

## 📊 O Que o Script Faz

### Para Cada Usuário que Compartilha Tenant:

1. **Cria Novo Tenant Exclusivo**
   - Gera um UUID único
   - Cria nome baseado no nome do usuário: "Aplicação - {Nome Usuário}"
   - Cria slug único baseado no email

2. **Atualiza Supabase Auth**
   - Atualiza `user_metadata.tenant_id`
   - Atualiza `app_metadata.tenant_id`
   - Atualiza `app_metadata.role`

3. **Atualiza Banco de Dados**
   - Atualiza `public.tenant_users.tenant_id`
   - Atualiza `public.users.metadata.tenant_id`

### Estratégia de Migração

- **Primeiro usuário no tenant**: Mantém o tenant original
- **Usuários adicionais**: Recebem novos tenants exclusivos

Exemplo:
- Tenant A tem 3 usuários: user1, user2, user3
- Após migração:
  - user1 → Mantém Tenant A
  - user2 → Recebe Tenant B (novo)
  - user3 → Recebe Tenant C (novo)

## ⚠️ Importante

### Antes de Migrar

1. ✅ Faça backup do banco de dados
2. ✅ Execute em modo `--dry-run` primeiro
3. ✅ Verifique se os resultados estão corretos
4. ✅ Execute em horário de baixo tráfego (se possível)

### Após Migrar

1. ✅ Verifique se todos os usuários podem fazer login
2. ✅ Verifique se os dados estão corretos
3. ✅ Teste a aplicação com diferentes usuários

## 🔄 Migração Forçada (Todos os Usuários)

Se quiser garantir que TODOS os usuários tenham tenants únicos (mesmo os que já têm):

```bash
python3 scripts/migrar_usuarios_para_tenants_unicos.py --force
```

⚠️ **Cuidado**: Isso criará novos tenants para TODOS os usuários, mesmo os que já têm tenant único.

## 📝 Exemplo de Saída

```
============================================================================
🔧 MIGRAÇÃO: Garantir Tenant Único para Cada Usuário
============================================================================
Modo: EXECUÇÃO REAL

📋 Passo 1: Buscando usuários existentes...
✅ Encontrados 5 vínculos usuário-tenant

📋 Passo 2: Identificando tenants compartilhados...
⚠️  Encontrados 1 tenants compartilhados:
   Tenant abc-123-def: 3 usuários
      - user1@exemplo.com (User 1)
      - user2@exemplo.com (User 2)
      - user3@exemplo.com (User 3)

📋 Passo 3: Migrando usuários para tenants únicos...
📋 Migrando 2 usuário(s)...

📋 Migrando usuário: user2@exemplo.com
   Tenant atual: abc-123-def
   ✅ Novo tenant criado: Aplicação - User 2 (xyz-456-ghi)
   ✅ Metadados do Auth atualizados
   ✅ Vínculo tenant_users atualizado
   ✅ Metadados em public.users atualizados
   ✅ Migração concluída para user2@exemplo.com

...

============================================================================
📊 RESUMO DA MIGRAÇÃO
============================================================================
✅ Sucesso: 2
❌ Falhas: 0
📋 Total: 2
```

## 🐛 Troubleshooting

### Erro: "Não foi possível criar tenant"

- Verifique se o Supabase está acessível
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correta
- Verifique se há espaço no banco de dados

### Erro: "Falha ao atualizar metadados do Auth"

- O usuário pode não existir no Supabase Auth
- Verifique se o `user_id` está correto
- O script continuará mesmo com este erro (é um aviso)

### Usuários ainda compartilhando tenant após migração

- Execute o script novamente
- Verifique se há erros nos logs
- Verifique manualmente no banco de dados

## 📚 Referências

- [Regra de Aplicação Separada](./REGRA_APLICACAO_SEPARADA.md)
- [Documentação Técnica](./backend/TECHNICAL.md)
- [Como Consultar Usuários](./scripts/COMO_CONSULTAR_USUARIOS.md)
