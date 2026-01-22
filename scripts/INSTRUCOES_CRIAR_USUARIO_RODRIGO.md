# 👤 Instruções para Criar Usuário: Rodrigo Conecte Loja

## 📋 Dados do Usuário

- **Email/Login**: `rodrigoconecteloja@gmail.com`
- **Senha**: `RodConect2026`
- **Telefone**: `11992858462`
- **Nome**: `Rodrigo Conecte Loja`
- **Role**: `admin` (Acesso Admin)

## 🚀 Método 1: Script Python (Recomendado)

O script Python é a forma mais completa e automática de criar o usuário.

### Pré-requisitos

1. Certifique-se de que o arquivo `.env` está configurado com:
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   ```

2. Instale as dependências Python (se ainda não tiver):
   ```bash
   pip install supabase python-dotenv requests
   ```

### Executar o Script

```bash
cd /var/www/credgestor-homologacao
python3 scripts/create_user_rodrigo.py
```

### O que o script faz:

1. ✅ Cria um tenant único exclusivo para o usuário
2. ✅ Cria o usuário no Supabase Auth (via API)
3. ✅ Cria registro em `public.users`
4. ✅ Cria vínculo em `public.tenant_users`
5. ✅ Configura telefone no metadata
6. ✅ Define role como `admin`

### Se o script falhar ao criar no Auth:

O script pode não conseguir criar o usuário no Supabase Auth se não tiver permissões. Nesse caso:

1. **Crie manualmente no Supabase Dashboard:**
   - Acesse: https://app.supabase.com/project/[SEU-PROJECT]/auth/users
   - Clique em **"Add User"** > **"Create new user"**
   - Preencha:
     - **Email**: `rodrigoconecteloja@gmail.com`
     - **Password**: `RodConect2026`
     - **Auto Confirm User**: ✅ (MARCAR ESTA OPÇÃO - muito importante!)
     - **User Metadata**:
       ```json
       {
         "tenant_id": "[TENANT_ID_EXIBIDO_PELO_SCRIPT]",
         "name": "Rodrigo Conecte Loja",
         "role": "admin",
         "telefone": "11992858462"
       }
       ```
     - **App Metadata**:
       ```json
       {
         "provider": "email",
         "providers": ["email"],
         "role": "admin",
         "tenant_id": "[TENANT_ID_EXIBIDO_PELO_SCRIPT]"
       }
       ```

2. **Execute o script novamente** para sincronizar o `user_id`:
   ```bash
   python3 scripts/create_user_rodrigo.py
   ```

## 🗄️ Método 2: Script SQL

Se preferir usar SQL diretamente no banco de dados:

### Executar no Supabase SQL Editor

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor** > **New Query**
3. Cole o conteúdo do arquivo `scripts/create_user_rodrigo.sql`
4. Clique em **Run**

### O que o script SQL faz:

1. ✅ Cria um tenant único exclusivo para o usuário
2. ✅ Tenta criar usuário no `auth.users` (pode falhar se não tiver permissões)
3. ✅ Cria registro em `public.users`
4. ✅ Cria vínculo em `public.tenant_users`
5. ✅ Configura telefone no metadata
6. ✅ Define role como `admin`

### ⚠️ IMPORTANTE: Criar no Auth Manualmente

O script SQL pode não conseguir criar o usuário no `auth.users` automaticamente. Nesse caso, você **DEVE** criar manualmente no Supabase Auth Dashboard (veja instruções acima no Método 1).

## ✅ Verificação

Após executar qualquer um dos métodos, verifique se o usuário foi criado corretamente:

### Via SQL:

```sql
-- Verificar usuário criado
SELECT 
    tu.email,
    tu.role,
    tu.ativo,
    u.name,
    t.name as tenant_name,
    tu.metadata->>'telefone' as telefone
FROM public.tenant_users tu
JOIN public.tenants t ON t.id = tu.tenant_id
LEFT JOIN public.users u ON u.id = tu.user_id
WHERE tu.email = 'rodrigoconecteloja@gmail.com';
```

### Via Python:

```python
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

result = supabase.table("tenant_users").select("*, tenants(name), users(name)").eq("email", "rodrigoconecteloja@gmail.com").execute()
print(result.data)
```

## 🔍 Checklist de Verificação

O usuário está configurado corretamente quando:

- [ ] ✅ Existe em `auth.users` (Supabase Auth)
- [ ] ✅ Email está confirmado (`email_confirmed_at IS NOT NULL`)
- [ ] ✅ Existe em `public.users`
- [ ] ✅ Existe em `public.tenant_users` com `ativo = true`
- [ ] ✅ Os IDs estão sincronizados entre as tabelas
- [ ] ✅ `tenant_id` está nos metadados do usuário no Auth
- [ ] ✅ `role` está configurado como `admin`
- [ ] ✅ `telefone` está configurado no metadata

## 📝 Notas Importantes

1. **Auto Confirm é essencial**: Sem marcar "Auto Confirm User" no Supabase Dashboard, o usuário precisará confirmar o email antes de fazer login.

2. **Cada usuário tem seu próprio tenant**: Seguindo a regra do sistema, cada usuário recebe um tenant único exclusivo para garantir isolamento de dados.

3. **Telefone no metadata**: O telefone é armazenado no campo `metadata` (JSONB) das tabelas `users` e `tenant_users`, e também no `user_metadata` do Supabase Auth.

4. **Role Admin**: O usuário terá acesso completo como administrador.

## 🆘 Troubleshooting

### Erro: "Usuário já existe"
- O usuário já foi criado anteriormente. Execute o script novamente para atualizar os dados.

### Erro: "Não foi possível criar no Auth"
- Crie manualmente no Supabase Auth Dashboard (veja instruções acima).

### Erro: "Tenant não encontrado"
- Execute o script novamente. O tenant será criado automaticamente.

### Usuário não consegue fazer login
- Verifique se o email está confirmado no `auth.users`
- Verifique se o `tenant_id` está correto nos metadados
- Verifique se o usuário está ativo em `tenant_users`

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do script Python
2. Mensagens de erro no Supabase Dashboard
3. Status do usuário nas tabelas do banco de dados
