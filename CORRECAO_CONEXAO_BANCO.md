# 🔧 Correção: Conexão com Banco de Dados em Produção

## Problema Identificado

O sistema estava salvando clientes apenas localmente porque:
1. **Token de autenticação expirado**: O token JWT expira após um tempo e as requisições falhavam com erro 401
2. **Sem refresh automático**: Não havia mecanismo para renovar o token automaticamente
3. **Erro não tratado**: Quando o token expirava, o sistema apenas salvava localmente sem tentar renovar

## Soluções Implementadas

### 1. Endpoint de Refresh Token no Backend ✅

**Arquivo**: `backend/main.py`

- Criado endpoint `/auth/refresh` que renova o access token usando o refresh token
- Faz chamada direta à API do Supabase para renovar o token
- Retorna novo access_token e refresh_token
- Mantém todas as informações do usuário e tenant

### 2. Função de Refresh no Frontend ✅

**Arquivo**: `src/services/api.ts`

- Criada função `refreshAccessToken()` que chama o endpoint `/auth/refresh`
- Atualiza a sessão automaticamente quando o token é renovado

### 3. Refresh Automático nas Requisições ✅

**Arquivos**: 
- `src/services/api.ts` (funções `createClient` e `updateClient`)
- `src/components/dashboard/Clients.tsx` (função `saveToDatabase`)

- Quando uma requisição retorna 401 (token expirado):
  1. Detecta automaticamente o erro
  2. Chama `refreshAccessToken()` para renovar
  3. Atualiza a sessão no contexto e localStorage
  4. Repete a requisição com o novo token
  5. Se o refresh falhar, retorna o erro original

### 4. Atualização do Contexto ✅

**Arquivo**: `src/pages/App.tsx`

- Adicionado `setSession` ao contexto do App
- Permite que componentes atualizem a sessão quando o token é renovado

## Como Funciona Agora

1. **Usuário faz login** → Recebe `access_token` e `refresh_token`
2. **Token expira** → Próxima requisição retorna 401
3. **Sistema detecta 401** → Chama automaticamente `/auth/refresh`
4. **Token renovado** → Sessão atualizada automaticamente
5. **Requisição repetida** → Agora com sucesso usando novo token

## Teste

Para testar se está funcionando:

1. Faça login no sistema
2. Aguarde alguns minutos (ou force expiração do token)
3. Tente criar/editar um cliente
4. O sistema deve:
   - Detectar token expirado
   - Renovar automaticamente
   - Salvar no banco de dados com sucesso

## Próximos Passos

Após fazer commit e deploy:

```bash
# Incrementar versão
./scripts/increment-version.sh patch

# Commit e push
git add .
git commit -m "feat: Implementar refresh automático de token para conexão com banco"
git push origin main

# Deploy
source .env
export DOCKER_VERSION=v1.0.7
docker stack deploy -c docker-compose.yml credgestor
```

## Arquivos Modificados

- ✅ `backend/main.py` - Endpoint `/auth/refresh`
- ✅ `src/services/api.ts` - Função `refreshAccessToken` e refresh automático
- ✅ `src/components/dashboard/Clients.tsx` - Integração com refresh automático
- ✅ `src/pages/App.tsx` - Adicionado `setSession` ao contexto
