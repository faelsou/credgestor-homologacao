# 🧪 Comandos para Testar a API

## ✅ API Funcionando Diretamente

A API está funcionando na porta 8000 diretamente:

```bash
# Health check
curl http://167.235.76.26:8000/health

# Login (use o IP da VPS, não localhost)
curl -X POST http://167.235.76.26:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente-alpha.com",
    "senha": "senhaFort3!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

## ⚠️ Problema: Traefik não está roteando `/api`

O `curl https://credgestor.app.br/api/health` está retornando HTML do frontend em vez de JSON da API.

**Causa:** As labels do Traefik não estão sendo aplicadas ao serviço.

**Solução:** Forçar atualização do serviço:

```bash
cd /var/www/credgestor-homologacao
source .env
docker stack deploy -c docker-compose.yml credgestor
```

## 🔍 Verificar se Traefik está detectando o serviço

```bash
# Verificar labels do serviço
docker service inspect credgestor_api --format '{{range $k, $v := .Spec.TaskTemplate.ContainerSpec.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik

# Se não retornar nada, as labels não foram aplicadas
```

## 📝 Nota sobre Login

O erro "Invalid login credentials" indica que:
- ✅ A API está funcionando
- ✅ O endpoint está correto
- ❌ As credenciais estão incorretas OU o usuário não existe no Supabase

**Verificar no Supabase:**
1. Acesse o painel do Supabase
2. Vá em Authentication → Users
3. Verifique se o usuário `admin@cliente-alpha.com` existe
4. Se não existir, crie o usuário

---

**Última atualização**: 2026-01-10
