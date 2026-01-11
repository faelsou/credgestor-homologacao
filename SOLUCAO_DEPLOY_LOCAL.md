# 🔧 Solução: Deploy Local das Mudanças

## Problema
O Docker Swarm está usando imagens antigas do Docker Hub (com SHA fixo), mesmo após fazer push para o GitHub.

## Solução Rápida: Push Local para Docker Hub

Se você precisa aplicar as mudanças imediatamente, faça push das imagens locais para o Docker Hub:

```bash
cd /var/www/credgestor-homologacao

# 1. Login no Docker Hub (se ainda não estiver logado)
docker login

# 2. Fazer push das imagens locais
docker push faelsouz/credgestor-homologacao-backend:latest
docker push faelsouz/credgestor-homologacao-frontend:latest

# 3. Atualizar os serviços
docker service update --force --image faelsouz/credgestor-homologacao-backend:latest credgestor_api
docker service update --force --image faelsouz/credgestor-homologacao-frontend:latest credgestor_site
```

## Solução Alternativa: Aguardar GitHub Actions

O GitHub Actions está executando automaticamente após o push. Você pode:

1. **Verificar o status do workflow:**
   - Acesse: https://github.com/faelsou/credgestor-homologacao/actions
   - Verifique se o workflow "🚀 Deploy CredGestor" está executando ou concluído

2. **Aguardar conclusão (geralmente 5-10 minutos):**
   - O workflow fará build e push automático para o Docker Hub
   - Após concluir, execute:
     ```bash
     docker pull faelsouz/credgestor-homologacao-backend:latest
     docker pull faelsouz/credgestor-homologacao-frontend:latest
     docker service update --force --image faelsouz/credgestor-homologacao-backend:latest credgestor_api
     docker service update --force --image faelsouz/credgestor-homologacao-frontend:latest credgestor_site
     ```

## Verificar se Funcionou

```bash
# Verificar logs do backend
docker service logs --tail 20 credgestor_api

# Testar se as mudanças estão ativas
docker exec $(docker ps -q -f name=credgestor_api) python -c "from backend.settings import get_settings; s = get_settings(); print('SUPABASE_ANON_KEY:', 'OK' if s.supabase_anon_key else 'FALTA')"
```

## Limpar Cache (se necessário)

Se ainda não funcionar, limpe o cache do Docker:

```bash
# Remover imagens antigas
docker image prune -a -f

# Forçar pull das novas imagens
docker pull faelsouz/credgestor-homologacao-backend:latest
docker pull faelsouz/credgestor-homologacao-frontend:latest

# Redeploy completo
docker stack rm credgestor
sleep 10
set -a && source .env && set +a
docker stack deploy -c docker-compose.yml credgestor
```
