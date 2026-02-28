# 🚀 Deploy do Endpoint /api/slack/interactions

## ⚠️ Problema Atual

O endpoint está retornando: `"Serviço de interações do Slack não disponível"`

Isso significa que o código em produção ainda está com a versão antiga que tenta importar o módulo `agent`.

## ✅ Solução

### Passo 1: Atualizar Código na VPS

```bash
# Na VPS (ssh root@167.235.76.26)
cd /var/www/credgestor-homologacao

# Fazer pull das alterações
git fetch origin
git checkout feat/slack-interactions-endpoint
git pull origin feat/slack-interactions-endpoint

# OU fazer merge na main (se já foi feito merge)
git checkout main
git pull origin main
```

### Passo 2: Verificar Código Atualizado

```bash
# Verificar se o endpoint não tem mais dependência do agent
grep -A 5 "def slack_interactions" backend/main.py | head -10

# Deve mostrar código que usa os.getenv("SLACK_SIGNING_SECRET")
# e não deve ter "from agent.config import config"
```

### Passo 3: Fazer Deploy do Backend

```bash
# Opção 1: Atualizar serviço existente (mais rápido)
docker service update --force credgestor_api

# Opção 2: Redeploy completo do stack
cd /var/www/credgestor-homologacao
source .env
docker stack deploy -c docker-compose.yml credgestor
```

### Passo 4: Verificar Deploy

```bash
# Ver logs do backend
docker service logs credgestor_api --tail 50

# Verificar se não há erros de import
docker service logs credgestor_api --tail 100 | grep -i "error\|import\|agent"
```

### Passo 5: Testar Endpoint

```bash
# Teste de URL verification
curl -X POST https://credgestor.app.br/api/slack/interactions \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "payload={\"type\":\"url_verification\",\"challenge\":\"test123\"}"

# Deve retornar: {"challenge":"test123"}
# NÃO deve retornar: {"detail":"Serviço de interações do Slack não disponível"}
```

## 🔍 Verificação

Após o deploy, o endpoint deve:

1. ✅ Responder a URL verification com `{"challenge":"..."}`
2. ✅ Processar cliques nos botões
3. ✅ Não depender do módulo `agent`

## 📝 Variáveis de Ambiente Necessárias

Certifique-se de que no `.env` da VPS:

```bash
SLACK_SIGNING_SECRET=seu_signing_secret_aqui
```

**Nota:** O `SLACK_SIGNING_SECRET` é necessário para validar requisições do Slack, mas o endpoint funciona mesmo sem ele (apenas não valida assinaturas).

## 🐛 Troubleshooting

### Ainda retorna erro após deploy

1. Verificar se o código foi atualizado:
   ```bash
   docker exec -it $(docker ps -q -f name=credgestor_api) cat /app/backend/main.py | grep -A 10 "def slack_interactions"
   ```

2. Verificar logs:
   ```bash
   docker service logs credgestor_api --tail 100 | grep -i "slack\|interactions"
   ```

3. Forçar rebuild da imagem (se necessário):
   ```bash
   # No CI/CD ou localmente, fazer build e push da nova imagem
   docker build -f Dockerfile.backend -t faelsouz/credgestor-homologacao-backend:latest .
   docker push faelsouz/credgestor-homologacao-backend:latest
   
   # Na VPS, fazer pull e update
   docker service update --image faelsouz/credgestor-homologacao-backend:latest credgestor_api
   ```
