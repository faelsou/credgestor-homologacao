# 🔌 Conexão com Banco de Dados e Usuários para Login

## ✅ Status da Conexão

### Backend está conectado ao banco de dados?

**SIM**, o backend está configurado para conectar ao banco de dados via **Supabase** (PostgreSQL gerenciado).

### Como funciona a conexão:

1. **Conexão Principal (Supabase)**
   - O backend usa o cliente Supabase para todas as operações
   - Configuração via variáveis de ambiente:
     - `SUPABASE_URL` - URL do projeto Supabase
     - `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (bypass RLS)
     - `SUPABASE_ANON_KEY` - Chave anônima (para autenticação)

2. **Conexão Legacy (Opcional)**
   - Código legacy em `backend/legacy/` também suporta `DATABASE_URL` direto
   - Usa `psycopg2` para conexão PostgreSQL direta
   - Útil para migração ou desenvolvimento local

### Verificar conexão:

```bash
# Testar healthcheck da API
curl http://localhost:8000/health

# Ou via Python
python -c "from backend.settings import get_settings; print('✅ Configurado!' if get_settings().supabase_url else '❌ Não configurado')"
```

---

## 👤 Usuários para Login no Multi-Tenancy

### Como funciona o sistema de autenticação:

O sistema usa **Supabase Auth** para autenticação. Os usuários são criados no Supabase, não diretamente no banco.

### Resolução do Tenant ID:

O sistema resolve o `tenant_id` na seguinte ordem:

1. **Metadata do usuário** (`user_metadata` ou `app_metadata` no Supabase Auth)
2. **Tenant ID informado** na requisição de login (validado contra `tenant_users`)
3. **Tenant único** - Se o usuário está vinculado a apenas um tenant, ele é usado automaticamente
4. **Erro** - Se o usuário está em múltiplos tenants e nenhum `tenant_id` foi informado

### Como criar usuários para login:

#### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o dashboard do Supabase: `https://app.supabase.com`
2. Vá em **Authentication** > **Users**
3. Clique em **Add User** > **Create new user**
4. Preencha:
   - **Email**: ex: `admin@cliente-alpha.com`
   - **Password**: ex: `senhaFort3!`
   - **Auto Confirm User**: ✅ (marca para não precisar confirmar email)
5. Em **User Metadata**, adicione:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000001",
     "name": "Admin Alpha"
   }
   ```
6. Ou em **App Metadata**:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000001",
     "role": "admin"
   }
   ```

#### Opção 2: Via API do Backend (se tiver endpoint)

```bash
# Criar tenant primeiro
curl -X POST http://localhost:8000/tenants \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Alpha"
  }'

# Depois criar usuário no Supabase Dashboard
```

#### Opção 3: Via SQL (apenas para desenvolvimento)

```sql
-- 1. Criar tenant (se não existir)
INSERT INTO public.tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Cliente Alpha')
ON CONFLICT (name) DO NOTHING;

-- 2. Criar usuário no Supabase Auth via Dashboard ou API
-- Não é possível criar via SQL diretamente (usa Supabase Auth)
```

### Exemplo de Login:

```bash
# POST /auth/login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente-alpha.com",
    "senha": "senhaFort3!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "access_expires_at": "2024-01-01T12:00:00Z",
  "refresh_expires_at": "2024-02-01T12:00:00Z",
  "usuario": {
    "id": "uuid-do-usuario",
    "email": "admin@cliente-alpha.com",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "tenant_nome": "Cliente Alpha",
    "name": "Admin Alpha"
  }
}
```

---

## 🔍 Verificar Usuários Existentes

### Via Supabase Dashboard:

1. Acesse: `https://app.supabase.com/project/<seu-project>/auth/users`
2. Veja a lista de usuários cadastrados
3. Verifique os metadados de cada usuário para ver o `tenant_id`

### Via API do Backend:

```bash
# Listar tenants
curl -X GET http://localhost:8000/tenants \
  -H "Authorization: Bearer <token>"

# Listar usuários de um tenant (se tiver endpoint)
curl -X GET http://localhost:8000/tenants/{tenant_id}/tenant_users \
  -H "Authorization: Bearer <token>"
```

---

## 📋 Checklist para Testar Login

- [ ] Supabase configurado com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_ANON_KEY` configurada (necessária para login)
- [ ] Tenant criado no banco (tabela `tenants`)
- [ ] Usuário criado no Supabase Auth
- [ ] `tenant_id` configurado no metadata do usuário (ou vinculado via `tenant_users`)
- [ ] Backend rodando e acessível em `http://localhost:8000`

---

## 🛠️ Troubleshooting

### Erro: "SUPABASE_ANON_KEY não configurada"
- Verifique se a variável `SUPABASE_ANON_KEY` está no `.env`
- Reinicie o backend após adicionar

### Erro: "tenant_id não informado ou não identificado"
- Verifique se o usuário tem `tenant_id` no metadata
- Ou se está vinculado na tabela `tenant_users`
- Ou informe o `tenant_id` na requisição de login

### Erro: "Usuário não autorizado para o tenant informado"
- O usuário não está vinculado ao tenant especificado
- Verifique a tabela `tenant_users` ou os metadados do usuário

### Erro: "Falha ao autenticar usuário"
- Email ou senha incorretos
- Usuário não existe no Supabase Auth
- Verifique no dashboard do Supabase

---

## 📚 Referências

- [Backend Technical Docs](./backend/TECHNICAL.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Script de Autenticação Multi-cliente](./scripts/auth_multiclient.sql)
