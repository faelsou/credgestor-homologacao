# 🔧 Criar Tabela Tenants

## 📋 Situação

A tabela `public.tenants` não existe no banco de dados, mas outras tabelas como `tenant_users`, `users`, `clients` já existem.

## ✅ Solução Rápida

Execute o script SQL no Supabase SQL Editor:

```sql
-- Execute: scripts/criar_tabela_tenants.sql
```

Ou copie e cole o conteúdo do arquivo `scripts/criar_tabela_tenants.sql` no SQL Editor do Supabase.

## 📝 Passo a Passo

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Selecione o projeto "CredGestor-Homologação"

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Execute o Script**
   - Abra o arquivo: `scripts/criar_tabela_tenants.sql`
   - Copie todo o conteúdo
   - Cole no editor SQL
   - Clique em **Run** (ou pressione `Ctrl+Enter`)

4. **Verifique**
   - Vá em **Table Editor**
   - Verifique se a tabela `tenants` aparece na lista

## 🔍 Verificar se Funcionou

Após criar a tabela, execute:

```sql
SELECT COUNT(*) as total_tenants FROM public.tenants;
```

Se retornar um número (mesmo que 0), a tabela foi criada com sucesso!

## ⚠️ Importante

- A tabela `tenants` é essencial para o sistema multi-tenancy
- Sem ela, não é possível verificar tenants compartilhados
- Após criar, você pode executar `scripts/verificar_tenants_compartilhados.sql`

## 📚 Próximos Passos

Depois de criar a tabela `tenants`:

1. ✅ Execute `scripts/verificar_tenants_compartilhados.sql` para ver a situação atual
2. ✅ Execute `scripts/migrar_usuarios_para_tenants_unicos.py --dry-run` para simular a migração
3. ✅ Execute a migração real se necessário
