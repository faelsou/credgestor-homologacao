# 🔧 Configurar URL de Interatividade do Slack

## ⚠️ Problema Identificado

O tooltip mostra: **"This app is not configured to handle interactive responses"**

Isso significa que a URL de interatividade não está configurada no Slack App.

## ✅ Solução

### Passo 1: Configurar URL no Slack App

1. Acesse: https://api.slack.com/apps
2. Selecione seu app (Credgestor-Agent)
3. No menu lateral, vá em **"Interactivity & Shortcuts"**
4. Ative **"Interactivity"**
5. Configure a **Request URL**:
   ```
   https://credgestor.app.br/api/slack/interactions
   ```
6. Clique em **"Save Changes"**

### Passo 2: Verificar se o Endpoint Está Acessível

Teste se o endpoint está respondendo:

```bash
# Teste local
curl -X POST https://credgestor.app.br/api/slack/interactions \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "payload={\"type\":\"url_verification\",\"token\":\"test\"}"

# Deve retornar algo como: {"ok": true}
```

### Passo 3: Verificar Variáveis de Ambiente

Certifique-se de que no `.env` da VPS:

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL=#credgestor-agent
```

### Passo 4: Verificar Permissões do Bot

O bot precisa ter as seguintes permissões (scopes):

- `chat:write` - Para enviar mensagens
- `channels:read` - Para listar canais
- `channels:join` - Para entrar em canais
- `reactions:read` - Para ler reações (fallback)
- `users:read` - Para obter informações do usuário

### Passo 5: Adicionar Bot ao Canal

```bash
# No Slack, no canal #credgestor-agent, digite:
/invite @Credgestor-Agent

# Ou adicione manualmente:
# Canal → Settings → Integrations → Add apps → Credgestor-Agent
```

## 🔍 Verificação

Após configurar, teste:

1. O tooltip "This app is not configured..." deve desaparecer
2. Os botões devem funcionar ao clicar
3. Deve aparecer uma mensagem de confirmação ao clicar

## 🐛 Troubleshooting

### Erro: "Invalid signature"
- Verifique se `SLACK_SIGNING_SECRET` está correto no `.env`
- O secret deve ser o mesmo configurado no Slack App

### Erro: "Request timestamp too old"
- Verifique se o relógio do servidor está sincronizado
- Use `ntpdate` ou `chronyd` para sincronizar

### Botões não aparecem
- Verifique se `SLACK_BOT_TOKEN` está configurado
- Verifique se o bot está no canal
- Verifique logs: `docker service logs agent_agent -f`

### Endpoint não acessível
- Verifique se o Traefik está roteando corretamente
- Verifique se o backend está rodando: `docker service ps credgestor_api`
- Teste o endpoint diretamente: `curl https://credgestor.app.br/api/health`

## 📝 Notas

- A URL de interatividade deve ser **HTTPS** (não HTTP)
- O endpoint deve responder em menos de 3 segundos
- O Slack valida a assinatura de todas as requisições
