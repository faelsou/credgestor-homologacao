# 🔧 Troubleshooting - Cliente não está sendo salvo no banco

## 🐛 Problema

Cliente criado no frontend (ex: "José Santos") aparece na interface mas não é inserido no banco de dados Supabase.

## ✅ Solução Aplicada

Foi criado um serviço para comunicação direta com o backend FastAPI (`backendApi.ts`) e modificadas as funções `addClient` e `saveToDatabase` para salvar no banco quando autenticado.

## 🔍 Como Verificar

### 1. Verificar se está autenticado

Abra o console do navegador (F12) e verifique:

```javascript
// Verificar se há sessão
console.log('User:', user);
console.log('N8N Session:', n8nSession);
```

**Deve ter:**
- `user.tenantId` - ID do tenant
- `n8nSession.accessToken` - Token de autenticação
- `n8nSession.tenantId` - ID do tenant na sessão

### 2. Verificar logs no console

Ao criar um cliente, você deve ver:

```
📤 Salvando cliente no backend FastAPI...
✅ Cliente salvo no banco de dados: {...}
```

Se aparecer:
```
📝 addClient: salvando cliente localmente (fallback)
```

Significa que não conseguiu salvar no backend.

### 3. Verificar erros no console

Procure por erros como:
- `❌ Erro ao salvar cliente no backend:`
- `401 Unauthorized`
- `403 Forbidden`
- `Network Error`
- `CORS error`

## 🛠️ Soluções

### Problema 1: Não está autenticado

**Sintoma:** `n8nSession` é `null` ou `accessToken` está vazio.

**Solução:**
1. Faça logout
2. Faça login novamente
3. Verifique se o login retornou um token

### Problema 2: Token inválido ou expirado

**Sintoma:** Erro `401 Unauthorized` no console.

**Solução:**
1. Faça logout e login novamente
2. Verifique se o token não expirou
3. Verifique se `VITE_N8N_BASE_URL` está configurado corretamente

### Problema 3: Tenant ID não está configurado

**Sintoma:** `user.tenantId` é `null` ou `undefined`.

**Solução:**
1. Verifique se o usuário tem `tenant_id` no metadata do Supabase Auth
2. Faça login novamente
3. Verifique se o backend retornou o `tenant_id` no login

### Problema 4: Backend não está rodando

**Sintoma:** Erro de rede ou `Network Error`.

**Solução:**
1. Verifique se o backend está rodando:
   ```bash
   curl http://localhost:8000/health
   ```
2. Inicie o backend se não estiver rodando:
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Problema 5: CORS Error

**Sintoma:** Erro de CORS no console.

**Solução:**
1. Verifique se o backend tem CORS configurado
2. Verifique se `VITE_N8N_BASE_URL` aponta para o backend correto
3. Reinicie o backend

### Problema 6: Endpoint não encontrado

**Sintoma:** Erro `404 Not Found`.

**Solução:**
1. Verifique se o endpoint existe: `POST /tenants/{tenant_id}/clients`
2. Verifique se o backend está na versão correta
3. Verifique a URL base: `VITE_N8N_BASE_URL`

## 📋 Checklist de Verificação

- [ ] Backend está rodando em `http://localhost:8000`
- [ ] Frontend está rodando em `http://localhost:3000`
- [ ] Usuário está autenticado (tem `accessToken`)
- [ ] `user.tenantId` está preenchido
- [ ] `VITE_N8N_BASE_URL` está configurado no `.env`
- [ ] Não há erros no console do navegador
- [ ] Não há erros no terminal do backend

## 🧪 Testar Manualmente

### 1. Testar endpoint diretamente

```bash
# Fazer login primeiro
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alpha.com",
    "senha": "AdminAlpha123!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }' | jq -r '.access_token')

# Criar cliente
curl -X POST "http://localhost:8000/tenants/00000000-0000-0000-0000-000000000001/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "José Santos",
    "cpf_cnpj": "12893180381",
    "tipo_pessoa": "PF",
    "email": "jsantos@gmail.com",
    "telefone": "11952313944"
  }'
```

### 2. Verificar no Supabase

1. Acesse: https://app.supabase.com
2. Vá em **Table Editor** > **clients**
3. Verifique se o cliente foi criado

## 📝 Logs Úteis

Adicione estes logs no console para debug:

```javascript
// No console do navegador
console.log('User:', user);
console.log('N8N Session:', n8nSession);
console.log('Using N8N Backend:', usingN8NBackend);
console.log('API Base URL:', import.meta.env.VITE_N8N_BASE_URL);
```

## 🔄 Próximos Passos

Se o problema persistir:

1. Verifique os logs do backend no terminal
2. Verifique os logs do frontend no console
3. Teste o endpoint diretamente com curl
4. Verifique se há erros no Supabase
5. Verifique se as políticas RLS estão corretas

## 📚 Documentação Relacionada

- [Testar Localmente](./TESTAR_LOCALMENTE.md)
- [Conexão e Usuários](./CONEXAO_BANCO_E_USUARIOS.md)
- [Backend Technical Docs](./backend/TECHNICAL.md)
