# 🔧 Solução: Traefik não está roteando `/api` para o backend

## Problema

O `curl https://credgestor.app.br/api/health` retorna HTML do frontend em vez de JSON da API.

**Causa:** As labels do Traefik não estão sendo aplicadas ao serviço no Docker Swarm.

## ✅ Solução Temporária: Usar IP Direto

Enquanto o Traefik não está configurado, use o IP direto da VPS:

```bash
# Health check
curl http://167.235.76.26:8000/health

# Login
curl -X POST http://167.235.76.26:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente-alpha.com",
    "senha": "senhaFort3!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

## 🔧 Solução Definitiva: Configurar Traefik

### Opção 1: Recriar o Stack (Recomendado)

```bash
cd /var/www/credgestor-homologacao

# 1. Remover o stack
docker stack rm credgestor

# 2. Aguardar alguns segundos
sleep 10

# 3. Recriar com as labels corretas
source .env
docker stack deploy -c docker-compose.yml credgestor

# 4. Verificar se as labels foram aplicadas
docker service inspect credgestor_api --format '{{range $k, $v := .Spec.TaskTemplate.ContainerSpec.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik | wc -l
# Deve retornar um número > 0
```

### Opção 2: Configurar Traefik para Ler Labels do Swarm

Se o Traefik não estiver configurado para ler labels do Docker Swarm, você precisa:

1. **Verificar configuração do Traefik:**
   ```bash
   # Verificar se o Traefik está rodando
   docker ps | grep traefik
   
   # Verificar configuração do Traefik
   docker exec $(docker ps -q -f name=traefik) cat /etc/traefik/traefik.yml
   ```

2. **Garantir que o Traefik está configurado para Docker Swarm:**
   O Traefik precisa ter o provider Docker habilitado e configurado para Swarm mode.

### Opção 3: Usar Nginx como Proxy Reverso (Alternativa)

Se o Traefik não funcionar, você pode configurar um Nginx como proxy reverso:

```nginx
location /api {
    proxy_pass http://credgestor_api:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 🧪 Testar após Correção

```bash
# Deve retornar JSON, não HTML
curl https://credgestor.app.br/api/health

# Deve funcionar
curl -X POST https://credgestor.app.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente-alpha.com",
    "senha": "senhaFort3!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

## 📝 Nota sobre Login

O erro "Invalid login credentials" significa que:
- ✅ A API está funcionando
- ✅ O endpoint está correto
- ❌ As credenciais estão incorretas OU o usuário não existe no Supabase

**Para criar o usuário no Supabase:**
1. Acesse: https://app.supabase.com
2. Vá em Authentication → Users
3. Clique em "Add user" → "Create new user"
4. Preencha:
   - Email: `admin@cliente-alpha.com`
   - Password: `senhaFort3!`
   - Auto Confirm User: ✅ (marcado)

---

**Última atualização**: 2026-01-10
