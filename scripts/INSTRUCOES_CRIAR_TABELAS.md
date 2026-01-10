# 📋 Instruções para Criar Tabelas no Supabase

## 🎯 Objetivo

Criar todas as tabelas necessárias para o sistema CredGestor-Homologação no banco de dados Supabase.

## 📄 Script SQL

O script completo está em: `scripts/create_all_tables_supabase.sql`

## 🚀 Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Cole o Script**
   - Abra o arquivo `scripts/create_all_tables_supabase.sql`
   - Copie todo o conteúdo
   - Cole no editor SQL do Supabase

4. **Execute o Script**
   - Clique no botão **Run** (ou pressione `Ctrl+Enter`)
   - Aguarde a execução (pode levar alguns segundos)

5. **Verifique os Resultados**
   - Verifique se todas as tabelas foram criadas
   - Vá em **Table Editor** para ver as tabelas criadas

### Opção 2: Via psql (Linha de Comando)

```bash
# Conecte-se ao banco Supabase
psql "postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJECT-ID].supabase.co:5432/postgres"

# Execute o script
\i scripts/create_all_tables_supabase.sql
```

### Opção 3: Via API do Supabase

```bash
# Use a connection string do Supabase
export DATABASE_URL="postgresql://postgres:[SENHA]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Execute via psql
psql $DATABASE_URL -f scripts/create_all_tables_supabase.sql
```

## 📊 Tabelas Criadas

### Tabelas Globais (sem tenant_id)
- ✅ `tenants` - Organizações/Empresas
- ✅ `users` - Usuários globais (integração com Supabase Auth)

### Tabelas Multi-Tenancy (com tenant_id)
- ✅ `clients` - Clientes/Tomadores de crédito
- ✅ `experiences` - Experiências dos clientes
- ✅ `historic_scores` - Histórico de scores de crédito
- ✅ `login_audit` - Auditoria de logins
- ✅ `tenant_users` - Vinculação usuário-tenant
- ✅ `tenant_roles` - Roles por tenant
- ✅ `role_permissions` - Permissões de roles
- ✅ `custom_domains` - Domínios customizados
- ✅ `user_sessions` - Sessões de usuário

### Tabelas Legacy (compatibilidade)
- ✅ `produtos` - Produtos financeiros
- ✅ `propostas` - Propostas/Contratos
- ✅ `parcelas` - Parcelas dos contratos
- ✅ `pagamentos` - Registro de pagamentos
- ✅ `documentos` - Documentos anexos
- ✅ `auditoria` - Log de auditoria
- ✅ `comissoes` - Comissões dos vendedores

## ✅ Verificação

Após executar o script, verifique:

1. **Tabelas criadas:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Índices criados:**
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   ORDER BY tablename, indexname;
   ```

3. **Tenants de exemplo:**
   ```sql
   SELECT * FROM public.tenants;
   ```

## 🔒 Row Level Security (RLS)

O script habilita RLS nas tabelas principais. As políticas básicas são criadas, mas você pode ajustá-las conforme sua necessidade de segurança.

**Nota:** O backend usa `service_role_key` que bypass RLS, mas é recomendado ter políticas configuradas para segurança adicional.

## 🛠️ Troubleshooting

### Erro: "extension already exists"
- ✅ Normal, o script usa `CREATE EXTENSION IF NOT EXISTS`
- Pode ignorar este aviso

### Erro: "relation already exists"
- ✅ Normal se você já executou o script antes
- O script usa `CREATE TABLE IF NOT EXISTS`
- Pode ignorar este aviso

### Erro: "permission denied"
- Verifique se você tem permissões de administrador no Supabase
- Use a connection string com usuário `postgres`

### Erro: "syntax error"
- Verifique se copiou o script completo
- Certifique-se de que não há caracteres especiais corrompidos

## 📝 Próximos Passos

Após criar as tabelas:

1. **Criar usuários no Supabase Auth**
   - Vá em **Authentication** > **Users** > **Add User**
   - Configure o `tenant_id` no metadata do usuário

2. **Configurar variáveis de ambiente**
   - Certifique-se de que `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configurados
   - Veja: `.env.example`

3. **Testar conexão**
   ```bash
   python scripts/verificar_conexao_e_usuarios.py
   ```

4. **Fazer login**
   - Use o endpoint `/auth/login` com um usuário criado no Supabase Auth

## 📚 Documentação Relacionada

- [Conexão e Usuários](./CONEXAO_BANCO_E_USUARIOS.md)
- [README Principal](../README.md)
- [Documentação Técnica](../backend/TECHNICAL.md)
