# 🧪 Teste do Login - CredGestor

## ✅ Correções Aplicadas

1. **✅ Frontend reconstruído com `VITE_API_BASE_URL`**
   - Nova imagem: `faelsouz/credgestor-homologacao-frontend:v1.0.3`
   - Configurado: `VITE_API_BASE_URL=https://credgestor.app.br/api`
   - Deploy atualizado

2. **✅ Backend rodando**
   - Imagem: `faelsouz/credgestor-homologacao-backend:latest`
   - Status: Running

## 🧪 Como Testar

### 1. Limpar Cache do Navegador

**Importante:** O navegador pode estar usando cache do JavaScript antigo.

```bash
# No navegador:
# 1. Pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para hard refresh
# 2. Ou abra DevTools (F12) → Network → marque "Disable cache"
# 3. Recarregue a página
```

### 2. Verificar Console do Navegador

Abra o console (F12) e verifique:

**✅ Esperado:**
- Não deve aparecer aviso sobre Tailwind CDN
- Não deve aparecer erros de `localhost:8000`
- As requisições devem ir para `https://credgestor.app.br/api/...`

**❌ Se ainda aparecer:**
- Limpe o cache do navegador completamente
- Verifique se a nova imagem está sendo usada

### 3. Testar Login

1. Acesse: https://credgestor.app.br
2. Tente fazer login
3. Verifique o console para erros

### 4. Verificar Requisições da API

No console do navegador (F12 → Network):
- As requisições devem ir para `https://credgestor.app.br/api/...`
- Não devem ir para `localhost:8000`

## 🔍 Verificações Técnicas

### Verificar se a nova imagem está rodando:

```bash
docker service ps credgestor_site --no-trunc | head -3
# Deve mostrar: faelsouz/credgestor-homologacao-frontend:v1.0.3
```

### Verificar HTML servido:

```bash
curl https://credgestor.app.br/ | grep -i "cdn.tailwind"
# Não deve retornar nada
```

### Verificar se a API está acessível:

```bash
curl https://credgestor.app.br/api/health
# Deve retornar JSON, não HTML
```

### Verificar variáveis de ambiente no build:

```bash
docker inspect faelsouz/credgestor-homologacao-frontend:v1.0.3 | grep -i "VITE_API"
```

## 🐛 Troubleshooting

### Se o login ainda não funcionar:

1. **Verificar se o Traefik está roteando corretamente:**
   ```bash
   curl -v https://credgestor.app.br/api/health 2>&1 | grep -i "location\|http"
   ```

2. **Verificar logs do backend:**
   ```bash
   docker service logs --tail 50 credgestor_api | grep -i "login\|auth\|error"
   ```

3. **Verificar logs do frontend:**
   ```bash
   docker service logs --tail 50 credgestor_site | grep -i "error"
   ```

4. **Verificar se as variáveis de ambiente estão configuradas:**
   ```bash
   cd /var/www/credgestor-homologacao
   source .env
   echo "SUPABASE_URL: ${SUPABASE_URL:+configurado}"
   ```

### Se ainda aparecer Tailwind CDN:

1. **Forçar atualização do serviço:**
   ```bash
   docker service update --force credgestor_site
   ```

2. **Limpar cache do navegador completamente:**
   - Chrome: Ctrl+Shift+Delete → Limpar dados de navegação
   - Ou usar modo anônimo

## 📝 Notas

- A nova imagem (`v1.0.3`) foi construída com `VITE_API_BASE_URL=https://credgestor.app.br/api`
- O frontend deve detectar automaticamente que está em produção e usar `/api`
- Se ainda houver problemas, pode ser cache do navegador

---

**Última atualização**: 2026-01-10
