# 🔐 Regra Importante: Aplicação Separada por Usuário

## 📋 Regra Fundamental

**Cada usuário deve ter sua própria aplicação separadamente.**

Isso significa que:
- ✅ Cada usuário possui seu próprio **tenant** único
- ✅ Os dados de cada usuário são completamente isolados
- ✅ Não há compartilhamento de dados entre usuários
- ✅ Cada usuário tem sua própria instância da aplicação

## 🏗️ Arquitetura

### Estrutura Multi-Tenancy

O sistema CredGestor utiliza uma arquitetura multi-tenancy onde:

1. **Tenant = Aplicação do Usuário**
   - Cada tenant representa uma aplicação completa e isolada
   - Um tenant não pode acessar dados de outro tenant
   - Cada tenant possui seus próprios:
     - Clientes
     - Empréstimos
     - Parcelas
     - Histórico
     - Configurações

2. **Isolamento de Dados**
   - Todas as tabelas possuem `tenant_id` como chave de isolamento
   - Queries são automaticamente filtradas por `tenant_id`
   - Row Level Security (RLS) garante isolamento no banco

3. **Autenticação e Autorização**
   - Cada usuário está vinculado a um único tenant
   - O `tenant_id` é resolvido durante o login
   - Tokens de autenticação incluem o `tenant_id` do usuário

## 🔧 Implementação

### Criação de Novo Usuário

Quando um novo usuário é criado, o sistema deve:

1. **Criar um novo tenant exclusivo** para o usuário
2. **Vincular o usuário ao tenant criado**
3. **Garantir que o tenant seja único** (não compartilhado)

### Scripts Atualizados

Os seguintes scripts foram atualizados para garantir essa regra:

- `scripts/create_admin_user_complete.py` - Cria tenant único para cada usuário
- `scripts/create_user_with_tenant.py` - Script dedicado para criar usuário com tenant próprio

### Backend API

O backend possui as seguintes rotas para gerenciar tenants:

- `POST /tenants` - Criar novo tenant (apenas super_admin)
- `GET /tenants/{tenant_id}` - Obter informações do tenant
- `POST /users` - Criar novo usuário (deve criar tenant automaticamente)

## ⚠️ Importante

### Não Compartilhar Tenants

**NUNCA** faça:
- ❌ Criar múltiplos usuários no mesmo tenant
- ❌ Reutilizar tenant_id entre usuários diferentes
- ❌ Compartilhar dados entre tenants

**SEMPRE** faça:
- ✅ Criar um novo tenant para cada novo usuário
- ✅ Garantir que cada usuário tenha seu próprio tenant_id único
- ✅ Manter isolamento completo entre tenants

### Verificação

Para verificar se um usuário tem seu próprio tenant:

```sql
-- Verificar quantos usuários estão em cada tenant
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tu.user_id) as total_usuarios
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id
GROUP BY t.id, t.name
ORDER BY total_usuarios DESC;
```

**Resultado esperado**: Cada tenant deve ter apenas 1 usuário (ou poucos, se for uma organização com múltiplos usuários da mesma empresa).

## 📝 Exemplo de Uso

### Criar Usuário com Tenant Próprio

```python
# Script Python
from scripts.create_user_with_tenant import create_user_with_tenant

user_data = {
    "email": "novo.usuario@exemplo.com",
    "password": "SenhaSegura123!",
    "name": "Novo Usuário",
    "role": "admin"
}

# Isso criará automaticamente:
# 1. Um novo tenant único
# 2. O usuário no Supabase Auth
# 3. O vínculo usuário-tenant
result = create_user_with_tenant(user_data)
```

### Via API (Futuro)

```bash
POST /api/users/register
{
  "email": "novo.usuario@exemplo.com",
  "password": "SenhaSegura123!",
  "name": "Novo Usuário"
}

# Resposta:
{
  "user_id": "uuid-do-usuario",
  "tenant_id": "uuid-do-tenant-criado",
  "message": "Usuário criado com tenant próprio"
}
```

## 🔍 Troubleshooting

### Problema: Usuários compartilhando o mesmo tenant

**Solução:**
1. Verificar se o script de criação está usando `get_or_create_tenant()` incorretamente
2. Garantir que cada chamada crie um novo tenant
3. Verificar se não há lógica que reutiliza tenants existentes

### Problema: Usuário sem tenant

**Solução:**
1. Verificar se o `tenant_id` está no `user_metadata` ou `app_metadata`
2. Verificar se existe registro em `tenant_users`
3. Criar tenant e vincular manualmente se necessário

## 📚 Referências

- [Arquitetura Multi-Tenancy](./README.md#arquitetura-multi-tenancy)
- [Técnico - Resolução de Tenant](./backend/TECHNICAL.md#resolução-do-tenant)
- [Conexão e Usuários](./CONEXAO_BANCO_E_USUARIOS.md)
