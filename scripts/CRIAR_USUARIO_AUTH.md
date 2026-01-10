# Como Criar Usuário no Supabase Auth

Existem duas formas de criar usuários no Supabase Auth:

## Método 1: Via Dashboard (Mais Simples) ⭐

1. **Acesse o Dashboard do Supabase:**
   - URL: https://supabase.com/dashboard/project/aclyrcuahiujgtjuimoh
   - Ou: https://supabase.com/dashboard → Selecione o projeto "CredGestor-Homologação"

2. **Navegue até Authentication:**
   - No menu lateral esquerdo, clique em **"Authentication"**
   - Depois clique em **"Users"**

3. **Adicione um novo usuário:**
   - Clique no botão **"Add User"** ou **"Invite User"** (canto superior direito)
   - Preencha o formulário:
     - **Email**: `admin@alpha.com`
     - **Password**: `AdminAlpha123!`
     - **Auto Confirm User**: ✅ **MARCAR ESTA OPÇÃO** (importante!)
   - Clique em **"Create User"** ou **"Send Invite"**

4. **Verifique:**
   - O usuário deve aparecer na lista de usuários
   - O status deve mostrar "Confirmed" (se marcou Auto Confirm)

## Método 2: Via Script Python (Automático) 🚀

Execute o script Python que criamos:

```bash
cd /home/rafael/www/CredGestor-Homologacao/credgestor
python3 scripts/create_auth_user.py --email admin@alpha.com --password AdminAlpha123!
```

Ou para outros usuários:

```bash
# Usuário Beta
python3 scripts/create_auth_user.py --email user@beta.com --password UserBeta123!

# Usuário Gamma
python3 scripts/create_auth_user.py --email gestor@gamma.com --password GestorGamma123!
```

## Método 3: Via API REST (Avançado)

Se preferir usar curl ou outra ferramenta:

```bash
curl -X POST 'https://aclyrcuahiujgtjuimoh.supabase.co/auth/v1/admin/users' \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alpha.com",
    "password": "AdminAlpha123!",
    "email_confirm": true
  }'
```

## ⚠️ IMPORTANTE

1. **Auto Confirm é essencial**: Sem isso, o usuário precisará confirmar o email antes de fazer login
2. **Use SERVICE_ROLE_KEY**: Para criar usuários via API, você precisa da chave de service role (não a anon key)
3. **Senha forte**: Use senhas com pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos

## 🔍 Verificar se o usuário foi criado

1. No Dashboard: Authentication > Users > Procure pelo email
2. Ou via script: O script Python mostrará uma mensagem de sucesso ou erro

## 📋 Usuários de Teste Recomendados

Baseado no script `create_test_users.sql`:

| Email | Senha | Tenant | Role |
|-------|-------|--------|------|
| admin@alpha.com | AdminAlpha123! | Alpha | admin |
| user@beta.com | UserBeta123! | Beta | user |
| gestor@gamma.com | GestorGamma123! | Gamma | gestor |

Execute o script para cada um deles!
