# 🔧 Correções Necessárias para Produção

## 📋 Problemas Identificados

### 1. ⚠️ SUPABASE_URL não está configurada
**Erro nos logs:**
```
⚠️  Aviso: Não foi possível inicializar o cliente Supabase no startup: SUPABASE_URL não está configurada.
```

**Causa:** O arquivo `.env` na VPS não está configurado ou as variáveis não estão sendo carregadas corretamente.

**Solução:**
1. Conecte na VPS:
   ```bash
   ssh usuario@167.235.76.26
   cd /var/www/credgestor-homologacao
   ```

2. Crie/edite o arquivo `.env`:
   ```bash
   nano .env
   ```

3. Adicione as seguintes variáveis (substitua pelos valores reais):
   ```bash
   SUPABASE_URL=https://aclyrcuahiujgtjuimoh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
   SUPABASE_ANON_KEY=sua-anon-key-aqui
   DATABASE_URL=postgresql://postgres:DzAq9DveJ81Mf0oI@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres
   API_HOST=0.0.0.0
   API_PORT=8000
   ```

4. Salve o arquivo (Ctrl+X, Y, Enter)

5. Verifique se as variáveis foram carregadas:
   ```bash
   source .env
   echo $SUPABASE_URL
   ```

6. Faça o deploy novamente:
   ```bash
   docker stack deploy -c docker-compose.yml credgestor
   ```

### 2. 🔄 Imagens Docker usando tags antigas
**Problema:** O `docker-compose.yml` está usando `v1.0.0` e `v1.0.1` em vez de `latest`.

**Solução:** 
O arquivo `docker-compose.yml` já foi atualizado para usar `latest`. Após fazer push das alterações, o GitHub Actions fará o deploy automaticamente.

**Ou faça manualmente:**
```bash
# Na VPS
cd /var/www/credgestor-homologacao

# Atualizar o docker-compose.yml (já foi atualizado no código)
# Fazer pull das imagens mais recentes
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Fazer deploy
docker stack deploy -c docker-compose.yml credgestor
```

### 3. 🌐 Traefik não está roteando `/api` para o backend
**Problema:** A API não está acessível via `https://credgestor.app.br/api`.

**Solução:**
O `docker-compose.yml` já foi atualizado com as labels do Traefik para rotear `/api` para o backend. Após fazer deploy, a API estará acessível em:
- `https://credgestor.app.br/api`
- `https://credgestor.app.br/api/health`
- `https://credgestor.app.br/api/docs`

### 4. 🐛 Erros do Pydantic no Frontend (logs estranhos)
**Observação:** Os logs mostram erros do Pydantic no container do frontend, o que é estranho pois o frontend é React/Vite. Isso pode indicar:
- Uma imagem Docker incorreta
- Código Python sendo executado no lugar do frontend

**Solução:**
1. Verificar qual imagem está sendo usada:
   ```bash
   docker service inspect credgestor_site --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
   ```

2. Se necessário, forçar atualização:
   ```bash
   docker service update --force credgestor_site
   ```

## ✅ Checklist de Correção

- [ ] Arquivo `.env` criado na VPS com todas as variáveis do Supabase
- [ ] Variáveis de ambiente verificadas (`source .env && echo $SUPABASE_URL`)
- [ ] Imagens Docker atualizadas para `latest`
- [ ] Deploy do stack executado
- [ ] Logs do backend verificados (sem avisos de SUPABASE_URL)
- [ ] API acessível via `https://credgestor.app.br/api/health`
- [ ] Frontend acessível via `https://credgestor.app.br`
- [ ] Login funcionando

## 🚀 Comandos Rápidos para Verificação

```bash
# Verificar serviços
docker stack services credgestor

# Ver logs do backend
docker service logs --tail 50 credgestor_api | grep -i supabase

# Ver logs do frontend
docker service logs --tail 50 credgestor_site

# Testar API
curl https://credgestor.app.br/api/health

# Testar frontend
curl -I https://credgestor.app.br

# Verificar variáveis de ambiente no container
docker exec $(docker ps -q -f name=credgestor_api) env | grep SUPABASE
```

## 📝 Notas Importantes

1. **O arquivo `.env` NÃO deve ser commitado no Git** - ele contém credenciais sensíveis
2. **As variáveis devem estar no `.env` na VPS** antes de executar `docker stack deploy`
3. **O GitHub Actions carrega o `.env` automaticamente** durante o deploy, mas você precisa criá-lo na VPS primeiro
4. **Após atualizar o `.env`**, é necessário fazer deploy novamente para que as mudanças tenham efeito

## 🔗 URLs de Produção

- **Frontend**: https://credgestor.app.br
- **API**: https://credgestor.app.br/api
- **API Docs**: https://credgestor.app.br/api/docs
- **Health Check**: https://credgestor.app.br/api/health

---

**Última atualização**: 2026-01-10
